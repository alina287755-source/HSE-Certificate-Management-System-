-- ============================================================================
-- Этап 2. Все оставшиеся модули: Обучение, Инструктажи, Проверка знаний и
-- допуск, СИЗ и средства безопасности, настройки порогов уже есть (settings)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ОБУЧЕНИЕ
-- ----------------------------------------------------------------------------

create type public.training_format as enum ('webinar', 'online', 'offline', 'other');
create type public.organizer_type as enum ('external', 'kazakhtelecom_trainer');

create table public.trainings (
  id              uuid primary key default gen_random_uuid(),
  employee_id     uuid not null references public.employees(id) on delete cascade,
  title           text not null,
  training_date   date,
  format          public.training_format not null default 'offline',
  organizer_type  public.organizer_type,
  organizer_name  text,       -- ФИО тренера / название организации
  language        text,
  duration_hours  numeric,
  document_id     uuid references public.documents(id) on delete set null,
  comment         text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index trainings_employee_idx on public.trainings (employee_id);

-- ----------------------------------------------------------------------------
-- 2. ИНСТРУКТАЖИ
-- ----------------------------------------------------------------------------

create type public.briefing_type as enum ('primary', 'repeat', 'unscheduled', 'targeted');

create table public.briefings (
  id                      uuid primary key default gen_random_uuid(),
  employee_id             uuid not null references public.employees(id) on delete cascade,
  type                    public.briefing_type not null,
  briefing_date           date not null default current_date,
  reason                  text,   -- причина / основание (для внепланового и целевого)
  conducted_by            text,
  conducted_by_position   text,
  comment                 text,
  document_id             uuid references public.documents(id) on delete set null,
  created_at              timestamptz not null default now()
);

create index briefings_employee_idx on public.briefings (employee_id);
create index briefings_type_idx on public.briefings (type);

-- Повторный инструктаж — раз в 3 месяца. Представление показывает по каждому
-- сотруднику дату последнего повторного инструктажа и статус до следующего.
create or replace view public.employee_briefing_status as
select
  e.id as employee_id,
  max(b.briefing_date) filter (where b.type = 'repeat') as last_repeat_date,
  (max(b.briefing_date) filter (where b.type = 'repeat') + interval '3 months')::date as next_repeat_due,
  public.calc_status((max(b.briefing_date) filter (where b.type = 'repeat') + interval '3 months')::date) as status
from public.employees e
left join public.briefings b on b.employee_id = e.id
group by e.id;

-- ----------------------------------------------------------------------------
-- 3. ПРОВЕРКА ЗНАНИЙ И ДОПУСК
-- ----------------------------------------------------------------------------

create table public.knowledge_checks (
  id              uuid primary key default gen_random_uuid(),
  employee_id     uuid not null references public.employees(id) on delete cascade,
  check_date      date not null default current_date,
  check_type      text,       -- вид проверки
  result          text,       -- результат
  admission       text,       -- допуск
  expiry_date     date,       -- срок действия, если предусмотрен
  conducted_by    text,
  commission      text,       -- комиссия / организация
  protocol_number text,
  document_id     uuid references public.documents(id) on delete set null,
  comment         text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index knowledge_checks_employee_idx on public.knowledge_checks (employee_id);

create or replace view public.knowledge_checks_with_status as
select kc.*, public.calc_status(kc.expiry_date) as status
from public.knowledge_checks kc;

-- ----------------------------------------------------------------------------
-- 4. СИЗ И СПЕЦОДЕЖДА
-- ----------------------------------------------------------------------------

create table public.ppe_items (
  id              uuid primary key default gen_random_uuid(),
  employee_id     uuid not null references public.employees(id) on delete cascade,
  name            text not null,     -- наименование СИЗ
  category        text,
  size            text,
  quantity        integer default 1,
  issue_date      date,
  expiry_date     date,              -- срок годности / дата следующей замены
  doc_number      text,              -- номер документа выдачи
  document_id     uuid references public.documents(id) on delete set null,
  comment         text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index ppe_items_employee_idx on public.ppe_items (employee_id);

create or replace view public.ppe_items_with_status as
select p.*, public.calc_status(p.expiry_date) as status
from public.ppe_items p;

-- ----------------------------------------------------------------------------
-- 5. СРЕДСТВА БЕЗОПАСНОСТИ: когти, пояса, инструмент, электроинструмент,
--    лестницы, стремянки — единая таблица с общим набором полей испытаний.
--    Может быть закреплено за сотрудником ИЛИ за подразделением/ответственным.
-- ----------------------------------------------------------------------------

create type public.equipment_type as enum (
  'claws',            -- когти
  'belt',             -- предохранительный пояс
  'insulated_tool',   -- инструмент с изолированными рукоятками
  'power_tool',       -- электроинструмент
  'ladder',           -- лестница
  'stepladder'        -- стремянка
);

create table public.safety_equipment (
  id                uuid primary key default gen_random_uuid(),
  equipment_type    public.equipment_type not null,
  name              text,               -- наименование (для инструмента/электроинструмента)
  model             text,               -- модель (электроинструмент)
  inventory_number  text,
  employee_id       uuid references public.employees(id) on delete set null,
  department        text,               -- если закреплено за подразделением, а не сотрудником
  responsible       text,               -- ответственный (для лестниц/стремянок)
  location          text,               -- место эксплуатации
  issue_date        date,
  last_test_date    date,
  next_test_date    date,
  result            text,
  document_id       uuid references public.documents(id) on delete set null,
  comment           text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint safety_equipment_owner_check check (employee_id is not null or department is not null or responsible is not null)
);

create index safety_equipment_type_idx on public.safety_equipment (equipment_type);
create index safety_equipment_employee_idx on public.safety_equipment (employee_id);

create or replace view public.safety_equipment_with_status as
select se.*, public.calc_status(se.next_test_date) as status
from public.safety_equipment se;

-- ----------------------------------------------------------------------------
-- 6. updated_at триггеры
-- ----------------------------------------------------------------------------

create trigger trainings_set_updated_at before update on public.trainings
  for each row execute procedure public.set_updated_at();
create trigger knowledge_checks_set_updated_at before update on public.knowledge_checks
  for each row execute procedure public.set_updated_at();
create trigger ppe_items_set_updated_at before update on public.ppe_items
  for each row execute procedure public.set_updated_at();
create trigger safety_equipment_set_updated_at before update on public.safety_equipment
  for each row execute procedure public.set_updated_at();

-- ============================================================================
-- 7. ROW LEVEL SECURITY — тот же принцип, что и для сертификации:
--    admin — полный доступ, manager — только просмотр всего,
--    employee — только свои записи (или незакреплённые/на подразделение — только просмотр)
-- ============================================================================

alter table public.trainings enable row level security;
alter table public.briefings enable row level security;
alter table public.knowledge_checks enable row level security;
alter table public.ppe_items enable row level security;
alter table public.safety_equipment enable row level security;

-- ---- trainings ----
create policy "Просмотр обучения по роли" on public.trainings
  for select using (
    public.current_role() in ('admin', 'manager') or employee_id = public.current_employee_id()
  );
create policy "Администратор управляет обучением" on public.trainings
  for insert with check (public.current_role() = 'admin');
create policy "Администратор редактирует обучение" on public.trainings
  for update using (public.current_role() = 'admin');
create policy "Администратор удаляет обучение" on public.trainings
  for delete using (public.current_role() = 'admin');

-- ---- briefings ----
create policy "Просмотр инструктажей по роли" on public.briefings
  for select using (
    public.current_role() in ('admin', 'manager') or employee_id = public.current_employee_id()
  );
create policy "Администратор управляет инструктажами" on public.briefings
  for insert with check (public.current_role() = 'admin');
create policy "Администратор редактирует инструктажи" on public.briefings
  for update using (public.current_role() = 'admin');
create policy "Администратор удаляет инструктажи" on public.briefings
  for delete using (public.current_role() = 'admin');

-- ---- knowledge_checks ----
create policy "Просмотр проверок знаний по роли" on public.knowledge_checks
  for select using (
    public.current_role() in ('admin', 'manager') or employee_id = public.current_employee_id()
  );
create policy "Администратор управляет проверками знаний" on public.knowledge_checks
  for insert with check (public.current_role() = 'admin');
create policy "Администратор редактирует проверки знаний" on public.knowledge_checks
  for update using (public.current_role() = 'admin');
create policy "Администратор удаляет проверки знаний" on public.knowledge_checks
  for delete using (public.current_role() = 'admin');

-- ---- ppe_items ----
create policy "Просмотр СИЗ по роли" on public.ppe_items
  for select using (
    public.current_role() in ('admin', 'manager') or employee_id = public.current_employee_id()
  );
create policy "Администратор управляет СИЗ" on public.ppe_items
  for insert with check (public.current_role() = 'admin');
create policy "Администратор редактирует СИЗ" on public.ppe_items
  for update using (public.current_role() = 'admin');
create policy "Администратор удаляет СИЗ" on public.ppe_items
  for delete using (public.current_role() = 'admin');

-- ---- safety_equipment ----
create policy "Просмотр средств безопасности по роли" on public.safety_equipment
  for select using (
    public.current_role() in ('admin', 'manager')
    or employee_id = public.current_employee_id()
  );
create policy "Администратор управляет средствами безопасности" on public.safety_equipment
  for insert with check (public.current_role() = 'admin');
create policy "Администратор редактирует средства безопасности" on public.safety_equipment
  for update using (public.current_role() = 'admin');
create policy "Администратор удаляет средства безопасности" on public.safety_equipment
  for delete using (public.current_role() = 'admin');
