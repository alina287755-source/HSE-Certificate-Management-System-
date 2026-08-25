import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { CERTIFICATION_LABELS, type CertificationType, type Status } from '@/types/db'
import { StatusBadge } from '@/components/StatusBadge'

interface Row {
  id: string
  employee_id: string
  type: CertificationType
  expiry_date: string | null
  certificate_no: string | null
  status: Status
  employees: { full_name: string; workshop: string | null } | null
}

const STATUS_LABELS: Record<Status, string> = {
  ok: 'Действует',
  warning: 'Скоро заканчивается',
  expired: 'Просрочено',
  none: 'Нет данных',
}

export function CertificationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const statusFilter = (searchParams.get('status') as Status | null) ?? ''
  const [typeFilter, setTypeFilter] = useState<CertificationType | ''>('')
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('certifications_with_status')
        .select('id, employee_id, type, expiry_date, certificate_no, status, employees ( full_name, workshop )')
        .order('expiry_date', { ascending: true, nullsFirst: false })
      setRows((data as unknown as Row[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = rows.filter((r) => {
    return (!statusFilter || r.status === statusFilter) && (!typeFilter || r.type === typeFilter)
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Сертификация</h1>
        <p className="mt-1 text-sm text-ink-muted">Все сертификаты сотрудников подразделения и их статус.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setSearchParams(e.target.value ? { status: e.target.value } : {})}
          className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
        >
          <option value="">Все статусы</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as CertificationType | '')}
          className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
        >
          <option value="">Все виды сертификации</option>
          {Object.entries(CERTIFICATION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-muted text-xs uppercase tracking-wide text-ink-faint">
            <tr>
              <th className="px-4 py-3 font-medium">Сотрудник</th>
              <th className="px-4 py-3 font-medium">Вид сертификата</th>
              <th className="px-4 py-3 font-medium">№</th>
              <th className="px-4 py-3 font-medium">Действует до</th>
              <th className="px-4 py-3 font-medium">Статус</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-ink-faint">
                  Загрузка…
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-ink-faint">
                  Записи не найдены.
                </td>
              </tr>
            )}
            {filtered.map((row) => (
              <tr key={row.id} className="hover:bg-surface-muted">
                <td className="px-4 py-3">
                  <Link to={`/employees/${row.employee_id}`} className="font-medium text-brand-800 hover:underline">
                    {row.employees?.full_name ?? '—'}
                  </Link>
                  {row.employees?.workshop && (
                    <div className="text-xs text-ink-faint">{row.employees.workshop}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-ink-muted">{CERTIFICATION_LABELS[row.type]}</td>
                <td className="px-4 py-3 font-mono text-ink-muted">{row.certificate_no || '—'}</td>
                <td className="px-4 py-3 font-mono text-ink-muted">
                  {row.expiry_date ? new Date(row.expiry_date).toLocaleDateString('ru-RU') : '—'}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={row.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
