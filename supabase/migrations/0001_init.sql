-- ============================================================================
-- Этап 1. Базовая структура: роли, сотрудники, сертификация, документы
-- Система учёта охраны труда, ПБ и промышленной безопасности
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. РОЛИ ПОЛЬЗОВАТЕЛЕЙ
-- ----------------------------------------------------------------------------

create type public.user_role as enum ('admin', 'manager', 'employee');

-- ----------------------------------------------------------------------------
-- 2. СОТРУДНИКИ
-- ----------------------------------------------------------------------------

create table public.employees (
  id              uuid primary key default gen_random_uuid(),
  full_name       text not null,
  tabel_number    text unique,
  photo_url       text,
  workshop        text,           -- Цех
  site            text,           -- Участок
  department      text,           -- Подразделение
  position_title  text,           -- Должность по штатному расписанию
  phone           text,
  email           text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.employees is 'Карточки сотрудников подразделения';

-- ----------------------------------------------------------------------------
-- 3. ПРОФИЛИ ПОЛЬЗОВАТЕЛЕЙ (связь auth.users -> роль -> сотрудник)
-- ----------------------------------------------------------------------------

create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text,
  role         public.user_role not null default 'employee',
  employee_id  uuid references public.employees(id) on delete set null,
  created_at   timestamptz not null default now()
);

comment on table public.profiles is 'Роль и привязка учётной записи к карточке сотрудника';

-- Автосоздание профиля при регистрации пользователя (роль по умолчанию — employee,
-- администратор потом назначает нужную роль и привязывает к сотруднику)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data ->> 'full_name', 'employee');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Вспомогательные функции для политик доступа (security definer, чтобы избежать
-- рекурсии RLS при обращении к profiles из политик других таблиц)
create or replace function public.current_role()
returns public.user_role
language sql security definer set search_path = public stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_employee_id()
returns uuid
language sql security definer set search_path = public stable
as $$
  select employee_id from public.profiles where id = auth.uid();
$$;

-- ----------------------------------------------------------------------------
-- 4. СПРАВОЧНИК ВИДОВ СЕРТИФИКАЦИИ
-- ----------------------------------------------------------------------------

create type public.certification_type as enum (
  'biot',                 -- БиОТ
  'industrial_safety',    -- Промышленная безопасность
  'fire_safety',          -- Пожарная безопасность
  'slinger',              -- Стропальщик
  'height_works',         -- Верхолазные работы
  'electrical_safety_4'   -- Электробезопасность — IV группа
);

-- ----------------------------------------------------------------------------
-- 5. ДОКУМЕНТЫ (общая таблица метаданных файлов из Supabase Storage,
--    переиспользуется будущими модулями: обучение, инструктажи, СИЗ и т.д.)
-- ----------------------------------------------------------------------------

create table public.documents (
  id           uuid primary key default gen_random_uuid(),
  entity_type  text not null,        -- напр. 'certification'
  entity_id    uuid not null,        -- id записи, к которой относится файл
  file_path    text not null,        -- путь в бакете Storage
  file_name    text not null,
  file_type    text,                 -- pdf / jpg / png
  uploaded_by  uuid references auth.users(id),
  uploaded_at  timestamptz not null default now()
);

create index documents_entity_idx on public.documents (entity_type, entity_id);

-- ----------------------------------------------------------------------------
-- 6. СЕРТИФИКАЦИЯ
-- ----------------------------------------------------------------------------

create table public.certifications (
  id              uuid primary key default gen_random_uuid(),
  employee_id     uuid not null references public.employees(id) on delete cascade,
  type            public.certification_type not null,
  issue_date      date,               -- дата прохождения
  expiry_date     date,               -- дата окончания действия
  certificate_no  text,               -- номер удостоверения / сертификата
  trainer         text,               -- кто проводил обучение
  organization    text,               -- организация, проводившая обучение
  comment         text,
  document_id     uuid references public.documents(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index certifications_employee_idx on public.certifications (employee_id);
create index certifications_expiry_idx on public.certifications (expiry_date);

-- ----------------------------------------------------------------------------
-- 7. НАСТРОЙКИ ПОРОГОВ СТАТУСА (настраиваемые в будущем через раздел «Настройки»)
-- ----------------------------------------------------------------------------

create table public.settings (
  key   text primary key,
  value jsonb not null
);

insert into public.settings (key, value) values
  ('status_thresholds', '{"warn_days": 30}'::jsonb);

-- Функция расчёта статуса по дате окончания срока
-- 'ok' | 'warning' | 'expired' | 'none'
create or replace function public.calc_status(expiry date)
returns text
language sql stable
as $$
  select case
    when expiry is null then 'none'
    when expiry < current_date then 'expired'
    when expiry <= current_date + ((select (value->>'warn_days')::int from public.settings where key = 'status_thresholds'))
      then 'warning'
    else 'ok'
  end;
$$;

-- Представление сертификатов с готовым статусом — использует Главная страница
-- и модуль «Сертификация»
create or replace view public.certifications_with_status as
select
  c.*,
  public.calc_status(c.expiry_date) as status
from public.certifications c;

-- ----------------------------------------------------------------------------
-- 8. updated_at триггеры
-- ----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger employees_set_updated_at before update on public.employees
  for each row execute procedure public.set_updated_at();

create trigger certifications_set_updated_at before update on public.certifications
  for each row execute procedure public.set_updated_at();

-- ============================================================================
-- 9. ROW LEVEL SECURITY
-- ============================================================================

alter table public.employees enable row level security;
alter table public.profiles enable row level security;
alter table public.certifications enable row level security;
alter table public.documents enable row level security;
alter table public.settings enable row level security;

-- ---- profiles ----
create policy "Пользователь видит свой профиль" on public.profiles
  for select using (id = auth.uid() or public.current_role() = 'admin');

create policy "Администратор управляет профилями" on public.profiles
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- ---- employees ----
create policy "Админ и руководитель видят всех сотрудников" on public.employees
  for select using (
    public.current_role() in ('admin', 'manager')
    or id = public.current_employee_id()
  );

create policy "Только администратор изменяет сотрудников" on public.employees
  for insert with check (public.current_role() = 'admin');

create policy "Только администратор редактирует сотрудников" on public.employees
  for update using (public.current_role() = 'admin');

create policy "Только администратор удаляет сотрудников" on public.employees
  for delete using (public.current_role() = 'admin');

-- ---- certifications ----
create policy "Просмотр сертификатов по роли" on public.certifications
  for select using (
    public.current_role() in ('admin', 'manager')
    or employee_id = public.current_employee_id()
  );

create policy "Только администратор добавляет сертификаты" on public.certifications
  for insert with check (public.current_role() = 'admin');

create policy "Только администратор редактирует сертификаты" on public.certifications
  for update using (public.current_role() = 'admin');

create policy "Только администратор удаляет сертификаты" on public.certifications
  for delete using (public.current_role() = 'admin');

-- ---- documents ----
create policy "Просмотр документов по роли" on public.documents
  for select using (
    public.current_role() in ('admin', 'manager')
    or (
      entity_type = 'certification'
      and exists (
        select 1 from public.certifications c
        where c.id = documents.entity_id and c.employee_id = public.current_employee_id()
      )
    )
  );

create policy "Только администратор загружает документы" on public.documents
  for insert with check (public.current_role() = 'admin');

create policy "Только администратор удаляет документы" on public.documents
  for delete using (public.current_role() = 'admin');

-- ---- settings ----
create policy "Все авторизованные читают настройки" on public.settings
  for select using (auth.uid() is not null);

create policy "Только администратор меняет настройки" on public.settings
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');
