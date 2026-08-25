import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { Employee } from '@/types/db'
import { EmployeeFormModal } from '@/components/EmployeeFormModal'

export function EmployeesPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [search, setSearch] = useState('')
  const [workshopFilter, setWorkshopFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('employees').select('*').order('full_name')
    setEmployees((data as Employee[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Если сотрудник открыл раздел «Сотрудники», сразу переводим его на свою карточку —
  // по правам доступа ему всё равно доступна только она.
  useEffect(() => {
    if (profile?.role === 'employee' && profile.employee_id) {
      navigate(`/employees/${profile.employee_id}`, { replace: true })
    }
  }, [profile, navigate])

  const workshops = useMemo(
    () => Array.from(new Set(employees.map((e) => e.workshop).filter(Boolean))) as string[],
    [employees]
  )

  const filtered = employees.filter((e) => {
    const q = search.trim().toLowerCase()
    const matchesSearch =
      !q ||
      e.full_name.toLowerCase().includes(q) ||
      e.tabel_number?.toLowerCase().includes(q) ||
      e.position_title?.toLowerCase().includes(q)
    const matchesWorkshop = !workshopFilter || e.workshop === workshopFilter
    return matchesSearch && matchesWorkshop
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Сотрудники</h1>
          <p className="mt-1 text-sm text-ink-muted">Карточки всех сотрудников подразделения.</p>
        </div>
        {profile?.role === 'admin' && (
          <button
            onClick={() => setFormOpen(true)}
            className="rounded-lg bg-brand-800 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            + Добавить сотрудника
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по ФИО, табельному номеру, должности…"
          className="w-80 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-100"
        />
        <select
          value={workshopFilter}
          onChange={(e) => setWorkshopFilter(e.target.value)}
          className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
        >
          <option value="">Все цеха</option>
          {workshops.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-muted text-xs uppercase tracking-wide text-ink-faint">
            <tr>
              <th className="px-4 py-3 font-medium">ФИО</th>
              <th className="px-4 py-3 font-medium">Табельный №</th>
              <th className="px-4 py-3 font-medium">Цех / участок</th>
              <th className="px-4 py-3 font-medium">Должность</th>
              <th className="px-4 py-3 font-medium">Телефон</th>
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
                  Сотрудники не найдены.
                </td>
              </tr>
            )}
            {filtered.map((emp) => (
              <tr key={emp.id} className="transition hover:bg-surface-muted">
                <td className="px-4 py-3">
                  <Link to={`/employees/${emp.id}`} className="font-medium text-brand-800 hover:underline">
                    {emp.full_name}
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono text-ink-muted">{emp.tabel_number || '—'}</td>
                <td className="px-4 py-3 text-ink-muted">
                  {[emp.workshop, emp.site].filter(Boolean).join(' / ') || '—'}
                </td>
                <td className="px-4 py-3 text-ink-muted">{emp.position_title || '—'}</td>
                <td className="px-4 py-3 text-ink-muted">{emp.phone || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {formOpen && (
        <EmployeeFormModal
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            load()
          }}
        />
      )}
    </div>
  )
}
