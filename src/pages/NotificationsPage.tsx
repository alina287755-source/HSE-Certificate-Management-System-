import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { CERTIFICATION_LABELS, EQUIPMENT_TYPE_LABELS } from '@/types/db'
import type { CertificationType, EquipmentType, Status } from '@/types/db'
import { StatusBadge } from '@/components/StatusBadge'

interface Item {
  id: string
  employeeId: string | null
  employeeName: string
  group: string
  label: string
  dueDate: string | null
  status: Status
}

export function NotificationsPage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [certs, checks, ppe, equip, briefings] = await Promise.all([
        supabase
          .from('certifications_with_status')
          .select('id, employee_id, type, expiry_date, status, employees ( full_name )')
          .in('status', ['warning', 'expired']),
        supabase
          .from('knowledge_checks_with_status')
          .select('id, employee_id, check_type, expiry_date, status, employees ( full_name )')
          .in('status', ['warning', 'expired']),
        supabase
          .from('ppe_items_with_status')
          .select('id, employee_id, name, expiry_date, status, employees ( full_name )')
          .in('status', ['warning', 'expired']),
        supabase
          .from('safety_equipment_with_status')
          .select('id, employee_id, equipment_type, inventory_number, next_test_date, status, employees ( full_name )')
          .in('status', ['warning', 'expired']),
        supabase
          .from('employee_briefing_status')
          .select('employee_id, next_repeat_due, status, employees ( full_name )')
          .in('status', ['warning', 'expired']),
      ])

      const result: Item[] = []

      type CertRow = { id: string; employee_id: string; type: CertificationType; expiry_date: string | null; status: Status; employees: { full_name: string } | null }
      ;(certs.data as unknown as CertRow[] ?? []).forEach((r) =>
        result.push({
          id: `cert-${r.id}`, employeeId: r.employee_id, employeeName: r.employees?.full_name ?? '—',
          group: 'Сертификация', label: CERTIFICATION_LABELS[r.type], dueDate: r.expiry_date, status: r.status,
        })
      )

      type CheckRow = { id: string; employee_id: string; check_type: string | null; expiry_date: string | null; status: Status; employees: { full_name: string } | null }
      ;(checks.data as unknown as CheckRow[] ?? []).forEach((r) =>
        result.push({
          id: `check-${r.id}`, employeeId: r.employee_id, employeeName: r.employees?.full_name ?? '—',
          group: 'Проверка знаний', label: r.check_type || 'Проверка знаний', dueDate: r.expiry_date, status: r.status,
        })
      )

      type PpeRow = { id: string; employee_id: string; name: string; expiry_date: string | null; status: Status; employees: { full_name: string } | null }
      ;(ppe.data as unknown as PpeRow[] ?? []).forEach((r) =>
        result.push({
          id: `ppe-${r.id}`, employeeId: r.employee_id, employeeName: r.employees?.full_name ?? '—',
          group: 'СИЗ', label: r.name, dueDate: r.expiry_date, status: r.status,
        })
      )

      type EquipRow = { id: string; employee_id: string | null; equipment_type: EquipmentType; inventory_number: string | null; next_test_date: string | null; status: Status; employees: { full_name: string } | null }
      ;(equip.data as unknown as EquipRow[] ?? []).forEach((r) =>
        result.push({
          id: `equip-${r.id}`, employeeId: r.employee_id, employeeName: r.employees?.full_name ?? 'Подразделение / ответственный',
          group: EQUIPMENT_TYPE_LABELS[r.equipment_type], label: r.inventory_number ? `Инв. № ${r.inventory_number}` : 'Испытание',
          dueDate: r.next_test_date, status: r.status,
        })
      )

      type BriefRow = { employee_id: string; next_repeat_due: string | null; status: Status; employees: { full_name: string } | null }
      ;(briefings.data as unknown as BriefRow[] ?? []).forEach((r) =>
        result.push({
          id: `briefing-${r.employee_id}`, employeeId: r.employee_id, employeeName: r.employees?.full_name ?? '—',
          group: 'Инструктаж', label: 'Повторный инструктаж', dueDate: r.next_repeat_due, status: r.status,
        })
      )

      result.sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))
      setItems(result)
      setLoading(false)
    }
    load()
  }, [])

  const expired = items.filter((i) => i.status === 'expired')
  const warning = items.filter((i) => i.status === 'warning')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ink">Уведомления</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Всё, что скоро истекает или уже просрочено — сертификаты, инструктажи, СИЗ, испытания средств безопасности.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-2 text-sm font-semibold text-ink">Каналы уведомлений</h2>
        <p className="text-sm text-ink-muted">
          Сейчас список ниже — это и есть основа уведомлений: система уже точно знает, кому и о чём нужно напомнить.
          Автоматическая отправка на <strong>e-mail</strong> и в <strong>Telegram</strong> подключается следующим шагом —
          структура для этого уже заложена (за какое время предупреждать: за 30, 14, 7 дней, в день окончания и после
          истечения — можно будет настроить в разделе «Настройки»).
        </p>
      </div>

      {loading && <p className="text-ink-faint">Загрузка…</p>}

      {!loading && expired.length === 0 && warning.length === 0 && (
        <p className="rounded-xl border border-dashed border-border bg-surface px-4 py-10 text-center text-sm text-ink-faint">
          Сейчас всё в порядке — нет ничего просроченного или скоро истекающего.
        </p>
      )}

      {expired.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-status-expired">
            Просрочено ({expired.length})
          </h2>
          <NotificationList items={expired} />
        </section>
      )}

      {warning.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-status-warn">
            Скоро истекает ({warning.length})
          </h2>
          <NotificationList items={warning} />
        </section>
      )}
    </div>
  )
}

function NotificationList({ items }: { items: Item[] }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
          <div>
            {item.employeeId ? (
              <Link to={`/employees/${item.employeeId}`} className="font-medium text-brand-800 hover:underline">
                {item.employeeName}
              </Link>
            ) : (
              <span className="font-medium text-ink">{item.employeeName}</span>
            )}
            <div className="text-xs text-ink-faint">
              {item.group} · {item.label}
              {item.dueDate && ` · до ${new Date(item.dueDate).toLocaleDateString('ru-RU')}`}
            </div>
          </div>
          <StatusBadge status={item.status} />
        </div>
      ))}
    </div>
  )
}
