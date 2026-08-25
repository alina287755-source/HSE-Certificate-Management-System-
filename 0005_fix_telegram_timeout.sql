-- ============================================================================
-- Исправление: увеличиваем время ожидания ответа от Telegram до 10 секунд,
-- чтобы автоматическая ежедневная отправка не обрывалась по тайм-ауту.
-- ============================================================================

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
    body := jsonb_build_object('chat_id', target_chat_id, 'text', message, 'parse_mode', 'HTML'),
    timeout_milliseconds := 10000
  );
end;
$$;
