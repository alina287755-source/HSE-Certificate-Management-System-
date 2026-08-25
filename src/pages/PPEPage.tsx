import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { EQUIPMENT_TYPE_LABELS } from '@/types/db'
import type { EquipmentType, PPEItemWithStatus, SafetyEquipmentWithStatus } from '@/types/db'
import { StatusBadge } from '@/components/StatusBadge'
import { EquipmentFormModal } from '@/components/EquipmentFormModal'

type Tab = 'ppe' | EquipmentType

const TABS: { key: Tab; label: string }[] = [
  { key: 'ppe', label: 'СИЗ и спецодежда' },
  ...(Object.entries(EQUIPMENT_TYPE_LABELS) as [EquipmentType, string][]).map(([key, label]) => ({ key, label })),
]

interface PPERow extends PPEItemWithStatus {
  employees: { full_name: string } | null
}

interface EquipRow extends SafetyEquipmentWithStatus {
  employees: { full_name: string } | null
}

export function PPEPage() {
  const { profile } = useAuth()
  const [tab, setTab] = useState<Tab>('ppe')
  const [ppeRows, setPpeRows] = useState<PPERow[]>([])
  const [equipRows, setEquipRows] = useState<EquipRow[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)

  async function load() {
    setLoading(true)
    if (tab === 'ppe') {
      const { data } = await supabase
        .from('ppe_items_with_status')
        .select('*, employees ( full_name )')
        .order('expiry_date', { ascending: true, nullsFirst: false })
      setPpeRows((data as unknown as PPERow[]) ?? [])
    } else {
      const { data } = await supabase
        .from('safety_equipment_with_status')
        .select('*, employees ( full_name )')
        .eq('equipment_type', tab)
        .order('next_test_date', { ascending: true, nullsFirst: false })
      setEquipRows((data as unknown as EquipRow[]) ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  function ownerLabel(row: EquipRow) {
    if (row.employees?.full_name) return row.employees.full_name
    if (row.department) return `Подразделение: ${row.department}`
    if (row.responsible) return `Ответственный: ${row.responsible}`
    return '—'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">СИЗ и средства безопасности</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Спецодежда, когти, пояса, инструмент, электроинструмент, лестницы и стремянки.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                tab === t.key ? 'bg-brand-800 text-white' : 'text-ink-muted hover:bg-surface-muted'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {tab !== 'ppe' && profile?.role === 'admin' && (
          <button
            onClick={() => setFormOpen(true)}
            className="rounded-lg bg-brand-800 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            + Добавить
          </button>
        )}
      </div>

      {tab === 'ppe' && (
        <p className="text-xs text-ink-faint">
          СИЗ выдаются конкретному сотруднику — добавить запись можно на его карточке, на вкладке «СИЗ».
        </p>
      )}

      {tab === 'ppe' ? (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase tracking-wide text-ink-faint">
              <tr>
                <th className="px-4 py-3 font-medium">Сотрудник</th>
                <th className="px-4 py-3 font-medium">Наименование</th>
                <th className="px-4 py-3 font-medium">Размер</th>
                <th className="px-4 py-3 font-medium">Кол-во</th>
                <th className="px-4 py-3 font-medium">Замена до</th>
                <th className="px-4 py-3 font-medium">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && <tr><td colSpan={6} className="px-4 py-6 text-center text-ink-faint">Загрузка…</td></tr>}
              {!loading && ppeRows.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-ink-faint">Записи не найдены.</td></tr>
              )}
              {ppeRows.map((row) => (
                <tr key={row.id} className="hover:bg-surface-muted">
                  <td className="px-4 py-3">
                    <Link to={`/employees/${row.employee_id}`} className="font-medium text-brand-800 hover:underline">
                      {row.employees?.full_name ?? '—'}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{row.name}{row.category ? ` (${row.category})` : ''}</td>
                  <td className="px-4 py-3 text-ink-muted">{row.size || '—'}</td>
                  <td className="px-4 py-3 text-ink-muted">{row.quantity ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-ink-muted">
                    {row.expiry_date ? new Date(row.expiry_date).toLocaleDateString('ru-RU') : '—'}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase tracking-wide text-ink-faint">
              <tr>
                <th className="px-4 py-3 font-medium">Инв. №</th>
                <th className="px-4 py-3 font-medium">Наименование</th>
                <th className="px-4 py-3 font-medium">Закреплено за</th>
                <th className="px-4 py-3 font-medium">След. испытание</th>
                <th className="px-4 py-3 font-medium">Результат</th>
                <th className="px-4 py-3 font-medium">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && <tr><td colSpan={6} className="px-4 py-6 text-center text-ink-faint">Загрузка…</td></tr>}
              {!loading && equipRows.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-ink-faint">Записи не найдены.</td></tr>
              )}
              {equipRows.map((row) => (
                <tr key={row.id} className="hover:bg-surface-muted">
                  <td className="px-4 py-3 font-mono text-ink-muted">{row.inventory_number || '—'}</td>
                  <td className="px-4 py-3 text-ink-muted">{row.name || row.model || EQUIPMENT_TYPE_LABELS[row.equipment_type]}</td>
                  <td className="px-4 py-3 text-ink-muted">{ownerLabel(row)}</td>
                  <td className="px-4 py-3 font-mono text-ink-muted">
                    {row.next_test_date ? new Date(row.next_test_date).toLocaleDateString('ru-RU') : '—'}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{row.result || '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && tab !== 'ppe' && (
        <EquipmentFormModal
          existing={null}
          initialType={tab}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            load()
          }}
        />
      )}
    </div>
  )
}
