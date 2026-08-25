import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    'Не заданы переменные VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
      'Скопируйте файл .env.example в .env и укажите данные вашего проекта Supabase.'
  )
}

// Примечание: клиент намеренно не типизирован строгой Database-схемой postgrest-js —
// вместо этого используются собственные интерфейсы из src/types/db.ts с явным
// приведением типов там, где Supabase возвращает данные. Это проще поддерживать
// на раннем этапе, когда схема ещё меняется от этапа к этапу.
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
