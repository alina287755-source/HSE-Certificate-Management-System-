-- ============================================================================
-- Хранилище файлов: бакет "documents" для сканов удостоверений и сертификатов
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Только авторизованные пользователи могут читать файлы, и только те,
-- у кого есть доступ к записи (проверка на уровне приложения + таблицы documents).
-- Для простоты первого этапа: читать могут все авторизованные, писать/удалять — только admin.
-- Это можно ужесточить позже, добавив проверку роли, как в таблице documents.

create policy "Авторизованные читают файлы" on storage.objects
  for select using (
    bucket_id = 'documents' and auth.uid() is not null
  );

create policy "Администратор загружает файлы" on storage.objects
  for insert with check (
    bucket_id = 'documents' and public.current_role() = 'admin'
  );

create policy "Администратор заменяет файлы" on storage.objects
  for update using (
    bucket_id = 'documents' and public.current_role() = 'admin'
  );

create policy "Администратор удаляет файлы" on storage.objects
  for delete using (
    bucket_id = 'documents' and public.current_role() = 'admin'
  );
