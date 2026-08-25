import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { TRAINING_FORMAT_LABELS } from '@/types/db'
import type { TrainingFormat } from '@/types/db'

interface Row {
  id: string
  employee_id: string
  title: string
  training_date: string | null
  format: TrainingFormat
  organizer_name: string | null
  employees: { full_name: string } | null
}

export function TrainingPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [formatFilter, setFormatFilter] = useState<TrainingFormat | ''>('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('trainings')
        .select('id, employee_id, title, training_date, format, organizer_name, employees ( full_name )')
        .order('training_date', { ascending: false, nullsFirst: false })
      setRows((data as unknown as Row[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = rows.filter((r) => {
    const q = search.trim().toLowerCase()
    const matchesSearch = !q || r.title.toLowerCase().includes(q) || r.employees?.full_name.toLowerCase().includes(q)
    return matchesSearch && (!formatFilter || r.format === formatFilter)
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Обучение</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Вебинары, онлайн- и офлайн-обучение сотрудников. Отдельно от сертификации.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по названию или сотруднику…"
          className="w-72 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
        />
        <select
          value={formatFilter}
          onChange={(e) => setFormatFilter(e.target.value as TrainingFormat | '')}
          className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
        >
          <option value="">Все форматы</option>
          {Object.entries(TRAINING_FORMAT_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-muted text-xs uppercase tracking-wide text-ink-faint">
            <tr>
              <th className="px-4 py-3 font-medium">Сотрудник</th>
              <th className="px-4 py-3 font-medium">Обучение</th>
              <th className="px-4 py-3 font-medium">Формат</th>
              <th className="px-4 py-3 font-medium">Дата</th>
              <th className="px-4 py-3 font-medium">Организатор</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-ink-faint">Загрузка…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-ink-faint">Записи не найдены.</td></tr>
            )}
            {filtered.map((row) => (
              <tr key={row.id} className="hover:bg-surface-muted">
                <td className="px-4 py-3">
                  <Link to={`/employees/${row.employee_id}`} className="font-medium text-brand-800 hover:underline">
                    {row.employees?.full_name ?? '—'}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink-muted">{row.title}</td>
                <td className="px-4 py-3 text-ink-muted">{TRAINING_FORMAT_LABELS[row.format]}</td>
                <td className="px-4 py-3 font-mono text-ink-muted">
                  {row.training_date ? new Date(row.training_date).toLocaleDateString('ru-RU') : '—'}
                </td>
                <td className="px-4 py-3 text-ink-muted">{row.organizer_name || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
