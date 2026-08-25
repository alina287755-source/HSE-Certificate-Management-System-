import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Status } from '@/types/db'
import { StatusBadge } from '@/components/StatusBadge'

interface Row {
  id: string
  employee_id: string
  check_date: string
  check_type: string | null
  result: string | null
  admission: string | null
  expiry_date: string | null
  status: Status
  employees: { full_name: string } | null
}

const STATUS_LABELS: Record<Status, string> = {
  ok: 'Действует',
  warning: 'Скоро заканчивается',
  expired: 'Просрочено',
  none: 'Без срока',
}

export function KnowledgeChecksPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [statusFilter, setStatusFilter] = useState<Status | ''>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('knowledge_checks_with_status')
        .select('id, employee_id, check_date, check_type, result, admission, expiry_date, status, employees ( full_name )')
        .order('check_date', { ascending: false })
      setRows((data as unknown as Row[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = rows.filter((r) => !statusFilter || r.status === statusFilter)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Проверка знаний и допуск</h1>
        <p className="mt-1 text-sm text-ink-muted">Результаты проверок и выданные допуски сотрудников.</p>
      </div>

      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value as Status | '')}
        className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
      >
        <option value="">Все статусы</option>
        {Object.entries(STATUS_LABELS).map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-muted text-xs uppercase tracking-wide text-ink-faint">
            <tr>
              <th className="px-4 py-3 font-medium">Сотрудник</th>
              <th className="px-4 py-3 font-medium">Вид проверки</th>
              <th className="px-4 py-3 font-medium">Дата</th>
              <th className="px-4 py-3 font-medium">Результат / допуск</th>
              <th className="px-4 py-3 font-medium">Срок действия</th>
              <th className="px-4 py-3 font-medium">Статус</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && <tr><td colSpan={6} className="px-4 py-6 text-center text-ink-faint">Загрузка…</td></tr>}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-ink-faint">Записи не найдены.</td></tr>
            )}
            {filtered.map((row) => (
              <tr key={row.id} className="hover:bg-surface-muted">
                <td className="px-4 py-3">
                  <Link to={`/employees/${row.employee_id}`} className="font-medium text-brand-800 hover:underline">
                    {row.employees?.full_name ?? '—'}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink-muted">{row.check_type || '—'}</td>
                <td className="px-4 py-3 font-mono text-ink-muted">
                  {new Date(row.check_date).toLocaleDateString('ru-RU')}
                </td>
                <td className="px-4 py-3 text-ink-muted">
                  {[row.result, row.admission].filter(Boolean).join(' · ') || '—'}
                </td>
                <td className="px-4 py-3 font-mono text-ink-muted">
                  {row.expiry_date ? new Date(row.expiry_date).toLocaleDateString('ru-RU') : '—'}
                </td>
                <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
