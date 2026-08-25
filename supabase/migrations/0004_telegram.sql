-- ============================================================================
-- Этап 3. Уведомления в Telegram: настройки бота, привязка сотрудников,
-- ежедневная автоматическая проверка сроков и отправка сообщений.
--
-- Работает полностью внутри базы данных Supabase (через расширения pg_cron
-- и pg_net) — отдельный сервер или код не нужен.
-- ============================================================================

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- ----------------------------------------------------------------------------
-- 1. Привязка Telegram у сотрудника (chat_id, который сотрудник получает
--    у бота @userinfobot и сообщает администратору)
-- ----------------------------------------------------------------------------

alter table public.employees add column if not exists telegram_chat_id text;

-- ----------------------------------------------------------------------------
-- 2. Настройки бота (токен и chat_id администратора для сводки).
--    Видно и редактируется только администратором.
-- ----------------------------------------------------------------------------

create table public.telegram_settings (
  id             boolean primary key default true check (id),  -- всегда ровно одна строка
  bot_token      text,
  admin_chat_id  text,
  enabled        boolean not null default false,
  updated_at     timestamptz not null default now()
);

insert into public.telegram_settings (id, enabled) values (true, false);

create trigger telegram_settings_set_updated_at before update on public.telegram_settings
  for each row execute procedure public.set_updated_at();

alter table public.telegram_settings enable row level security;

create policy "Только администратор видит настройки Telegram" on public.telegram_settings
  for select using (public.current_role() = 'admin');
create policy "Только администратор меняет настройки Telegram" on public.telegram_settings
  for update using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

-- ----------------------------------------------------------------------------
-- 3. Журнал отправленных уведомлений — чтобы не присылать одно и то же
--    каждый день подряд, а только когда статус реально появился/изменился.
-- ----------------------------------------------------------------------------

create table public.telegram_notification_log (
  id           uuid primary key default gen_random_uuid(),
  entity_type  text not null,
  entity_id    uuid not null,
  status       text not null,
  chat_id      text not null,
  sent_at      timestamptz not null default now(),
  unique (entity_type, entity_id, status, chat_id)
);

alter table public.telegram_notification_log enable row level security;
create policy "Только администратор видит журнал уведомлений" on public.telegram_notification_log
  for select using (public.current_role() = 'admin');

-- ----------------------------------------------------------------------------
-- 4. Функция отправки одного сообщения через Telegram Bot API
-- ----------------------------------------------------------------------------

create or replace function public.telegram_send_message(target_chat_id text, message text)
returns void
language plpgsql
security definer set search_path = public, extensions
as $$
declare
  token text;
begin
  select bot_token into token from public.telegram_settings where id = true;
  if token is null or target_chat_id is null then
    return;
  end if;

  perform net.http_post(
    url := 'https://api.telegram.org/bot' || token || '/sendMessage',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object('chat_id', target_chat_id, 'text', message, 'parse_mode', 'HTML')
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- 5. Основная функция: собирает всё "скоро/просрочено" по каждому сотруднику
--    и по подразделению/ответственным, шлёт персональные сообщения и сводку
--    администратору. Вызывается ежедневно по расписанию (см. ниже).
-- ----------------------------------------------------------------------------

create or replace function public.run_telegram_notifications()
returns void
language plpgsql
security definer set search_path = public, extensions
as $$
declare
  settings_row record;
  item record;
  employee_messages jsonb := '{}'::jsonb;   -- chat_id -> текст сообщения
  admin_lines text := '';
  admin_count int := 0;
  chat text;
  line text;
begin
  select * into settings_row from public.telegram_settings where id = true;
  if settings_row is null or not settings_row.enabled or settings_row.bot_token is null then
    return;  -- уведомления выключены или бот не настроен
  end if;

  -- Сертификаты
  for item in
    select c.id, c.employee_id, e.full_name, e.telegram_chat_id,
           'Сертификат: ' || c.type::text as label, c.expiry_date, c.status
    from public.certifications_with_status c
    join public.employees e on e.id = c.employee_id
    where c.status in ('warning', 'expired')
  loop
    line := format('%s %s — до %s', case when item.status = 'expired' then '🔴' else '🟡' end,
                    item.label, coalesce(item.expiry_date::text, '—'));
    if item.telegram_chat_id is not null
       and not exists (select 1 from public.telegram_notification_log
                        where entity_type = 'certification' and entity_id = item.id and status = item.status and chat_id = item.telegram_chat_id) then
      employee_messages := jsonb_set(
        employee_messages, array[item.telegram_chat_id],
        to_jsonb(coalesce(employee_messages->>item.telegram_chat_id, '') || line || E'\n')
      );
      insert into public.telegram_notification_log (entity_type, entity_id, status, chat_id)
      values ('certification', item.id, item.status, item.telegram_chat_id) on conflict do nothing;
    end if;
    admin_count := admin_count + 1;
    admin_lines := admin_lines || format('%s (%s): %s' || E'\n', item.full_name, item.label, item.status);
  end loop;

  -- Проверки знаний
  for item in
    select k.id, k.employee_id, e.full_name, e.telegram_chat_id,
           'Проверка знаний: ' || coalesce(k.check_type, '—') as label, k.expiry_date, k.status
    from public.knowledge_checks_with_status k
    join public.employees e on e.id = k.employee_id
    where k.status in ('warning', 'expired')
  loop
    line := format('%s %s — до %s', case when item.status = 'expired' then '🔴' else '🟡' end,
                    item.label, coalesce(item.expiry_date::text, '—'));
    if item.telegram_chat_id is not null
       and not exists (select 1 from public.telegram_notification_log
                        where entity_type = 'knowledge_check' and entity_id = item.id and status = item.status and chat_id = item.telegram_chat_id) then
      employee_messages := jsonb_set(
        employee_messages, array[item.telegram_chat_id],
        to_jsonb(coalesce(employee_messages->>item.telegram_chat_id, '') || line || E'\n')
      );
      insert into public.telegram_notification_log (entity_type, entity_id, status, chat_id)
      values ('knowledge_check', item.id, item.status, item.telegram_chat_id) on conflict do nothing;
    end if;
    admin_count := admin_count + 1;
  end loop;

  -- СИЗ
  for item in
    select p.id, p.employee_id, e.full_name, e.telegram_chat_id,
           'СИЗ: ' || p.name as label, p.expiry_date, p.status
    from public.ppe_items_with_status p
    join public.employees e on e.id = p.employee_id
    where p.status in ('warning', 'expired')
  loop
    line := format('%s %s — до %s', case when item.status = 'expired' then '🔴' else '🟡' end,
                    item.label, coalesce(item.expiry_date::text, '—'));
    if item.telegram_chat_id is not null
       and not exists (select 1 from public.telegram_notification_log
                        where entity_type = 'ppe_item' and entity_id = item.id and status = item.status and chat_id = item.telegram_chat_id) then
      employee_messages := jsonb_set(
        employee_messages, array[item.telegram_chat_id],
        to_jsonb(coalesce(employee_messages->>item.telegram_chat_id, '') || line || E'\n')
      );
      insert into public.telegram_notification_log (entity_type, entity_id, status, chat_id)
      values ('ppe_item', item.id, item.status, item.telegram_chat_id) on conflict do nothing;
    end if;
    admin_count := admin_count + 1;
  end loop;

  -- Средства безопасности (испытания) — включая закреплённые за подразделением
  for item in
    select se.id, se.employee_id, coalesce(e.full_name, se.department, se.responsible, 'Без привязки') as full_name,
           e.telegram_chat_id, se.status,
           'Испытание: ' || se.equipment_type::text ||
             case when se.inventory_number is not null then ' (' || se.inventory_number || ')' else '' end as label,
           se.next_test_date as expiry_date
    from public.safety_equipment_with_status se
    left join public.employees e on e.id = se.employee_id
    where se.status in ('warning', 'expired')
  loop
    line := format('%s %s — до %s', case when item.status = 'expired' then '🔴' else '🟡' end,
                    item.label, coalesce(item.expiry_date::text, '—'));
    if item.telegram_chat_id is not null
       and not exists (select 1 from public.telegram_notification_log
                        where entity_type = 'safety_equipment' and entity_id = item.id and status = item.status and chat_id = item.telegram_chat_id) then
      employee_messages := jsonb_set(
        employee_messages, array[item.telegram_chat_id],
        to_jsonb(coalesce(employee_messages->>item.telegram_chat_id, '') || line || E'\n')
      );
      insert into public.telegram_notification_log (entity_type, entity_id, status, chat_id)
      values ('safety_equipment', item.id, item.status, item.telegram_chat_id) on conflict do nothing;
    end if;
    admin_count := admin_count + 1;
  end loop;

  -- Повторные инструктажи
  for item in
    select ebs.employee_id as id, e.full_name, e.telegram_chat_id, ebs.status, ebs.next_repeat_due as expiry_date
    from public.employee_briefing_status ebs
    join public.employees e on e.id = ebs.employee_id
    where ebs.status in ('warning', 'expired')
  loop
    line := format('%s Повторный инструктаж — до %s', case when item.status = 'expired' then '🔴' else '🟡' end,
                    coalesce(item.expiry_date::text, '—'));
    if item.telegram_chat_id is not null
       and not exists (select 1 from public.telegram_notification_log
                        where entity_type = 'briefing' and entity_id = item.id and status = item.status and chat_id = item.telegram_chat_id) then
      employee_messages := jsonb_set(
        employee_messages, array[item.telegram_chat_id],
        to_jsonb(coalesce(employee_messages->>item.telegram_chat_id, '') || line || E'\n')
      );
      insert into public.telegram_notification_log (entity_type, entity_id, status, chat_id)
      values ('briefing', item.id, item.status, item.telegram_chat_id) on conflict do nothing;
    end if;
    admin_count := admin_count + 1;
  end loop;

  -- Отправляем каждому сотруднику его персональное сообщение
  for chat in select jsonb_object_keys(employee_messages) loop
    perform public.telegram_send_message(
      chat,
      E'⚠️ <b>Охрана труда — обратите внимание:</b>\n\n' || (employee_messages->>chat)
    );
  end loop;

  -- Сводка администратору
  if settings_row.admin_chat_id is not null and admin_count > 0 then
    perform public.telegram_send_message(
      settings_row.admin_chat_id,
      format(E'📋 <b>Ежедневная сводка</b>\n\nВсего позиций, требующих внимания: %s\n\nПодробности — в разделе «Уведомления» приложения.', admin_count)
    );
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- 6. Ежедневный запуск — каждый день в 08:00 по времени сервера (UTC)
-- ----------------------------------------------------------------------------

select cron.schedule(
  'telegram-notifications-daily',
  '0 8 * * *',
  $$select public.run_telegram_notifications();$$
);
