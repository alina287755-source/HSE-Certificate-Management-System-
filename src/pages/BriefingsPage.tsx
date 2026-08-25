import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { BRIEFING_TYPE_LABELS } from '@/types/db'
import type { BriefingType } from '@/types/db'
import { StatusBadge } from '@/components/StatusBadge'

interface Row {
  id: string
  employee_id: string
  type: BriefingType
  briefing_date: string
  reason: string | null
  conducted_by: string | null
  employees: { full_name: string } | null
}

interface RepeatStatusRow {
  employee_id: string
  last_repeat_date: string | null
  next_repeat_due: string | null
  status: 'ok' | 'warning' | 'expired' | 'none'
  employees: { full_name: string } | null
}

export function BriefingsPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [repeatStatus, setRepeatStatus] = useState<RepeatStatusRow[]>([])
  const [typeFilter, setTypeFilter] = useState<BriefingType | ''>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [journal, repeats] = await Promise.all([
        supabase
          .from('briefings')
          .select('id, employee_id, type, briefing_date, reason, conducted_by, employees ( full_name )')
          .order('briefing_date', { ascending: false }),
        supabase
          .from('employee_briefing_status')
          .select('employee_id, last_repeat_date, next_repeat_due, status, employees ( full_name )')
          .neq('status', 'none')
          .order('next_repeat_due', { ascending: true }),
      ])
      setRows((journal.data as unknown as Row[]) ?? [])
      setRepeatStatus((repeats.data as unknown as RepeatStatusRow[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = rows.filter((r) => !typeFilter || r.type === typeFilter)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ink">Инструктажи</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Журнал инструктажей: первичный, повторный (раз в 3 месяца), внеплановый, целевой.
        </p>
      </div>

      {repeatStatus.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-faint">
            Требуют внимания — повторный инструктаж
          </h2>
          <div className="space-y-2">
            {repeatStatus.map((r) => (
              <div
                key={r.employee_id}
                className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3"
              >
                <div>
                  <Link to={`/employees/${r.employee_id}`} className="font-medium text-brand-800 hover:underline">
                    {r.employees?.full_name ?? '—'}
                  </Link>
                  <div className="text-xs text-ink-faint">
                    {r.last_repeat_date
                      ? `Последний повторный: ${new Date(r.last_repeat_date).toLocaleDateString('ru-RU')}`
                      : 'Повторный инструктаж ещё не проводился'}
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint">Все записи</h2>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as BriefingType | '')}
            className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
          >
            <option value="">Все виды</option>
            {Object.entries(BRIEFING_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase tracking-wide text-ink-faint">
              <tr>
                <th className="px-4 py-3 font-medium">Сотрудник</th>
                <th className="px-4 py-3 font-medium">Вид</th>
                <th className="px-4 py-3 font-medium">Дата</th>
                <th className="px-4 py-3 font-medium">Причина / основание</th>
                <th className="px-4 py-3 font-medium">Кто проводил</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && <tr><td colSpan={5} className="px-4 py-6 text-center text-ink-faint">Загрузка…</td></tr>}
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
                  <td className="px-4 py-3 text-ink-muted">{BRIEFING_TYPE_LABELS[row.type]}</td>
                  <td className="px-4 py-3 font-mono text-ink-muted">
                    {new Date(row.briefing_date).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{row.reason || '—'}</td>
                  <td className="px-4 py-3 text-ink-muted">{row.conducted_by || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
