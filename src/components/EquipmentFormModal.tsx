import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { EQUIPMENT_TYPE_LABELS } from '@/types/db'
import type { EquipmentType, SafetyEquipment } from '@/types/db'
import { DocumentUpload } from '@/components/DocumentUpload'

interface Props {
  /** Если модалка открыта с карточки сотрудника — сюда подставляется его id */
  defaultEmployeeId?: string
  /** Предустановленный тип (например, когда открыто с конкретной вкладки списка) */
  initialType?: EquipmentType
  existing?: SafetyEquipment | null
  onClose: () => void
  onSaved: () => void
}

type OwnerMode = 'employee' | 'department' | 'responsible'

const NEEDS_NAME: EquipmentType[] = ['insulated_tool', 'power_tool']
const NEEDS_LOCATION: EquipmentType[] = ['ladder', 'stepladder']

export function EquipmentFormModal({ defaultEmployeeId, initialType, existing, onClose, onSaved }: Props) {
  const initialOwnerMode: OwnerMode = existing?.department
    ? 'department'
    : existing?.responsible
      ? 'responsible'
      : 'employee'

  const [form, setForm] = useState({
    equipment_type: (existing?.equipment_type ?? initialType ?? 'claws') as EquipmentType,
    name: existing?.name ?? '',
    model: existing?.model ?? '',
    inventory_number: existing?.inventory_number ?? '',
    ownerMode: initialOwnerMode as OwnerMode,
    employeeIdText: existing?.employee_id ?? defaultEmployeeId ?? '',
    department: existing?.department ?? '',
    responsible: existing?.responsible ?? '',
    location: existing?.location ?? '',
    issue_date: existing?.issue_date ?? '',
    last_test_date: existing?.last_test_date ?? '',
    next_test_date: existing?.next_test_date ?? '',
    result: existing?.result ?? '',
    comment: existing?.comment ?? '',
  })
  const [savedId, setSavedId] = useState<string | null>(existing?.id ?? null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (form.ownerMode === 'employee' && !defaultEmployeeId && !form.employeeIdText) {
      setError('Укажите закреплённого сотрудника, подразделение или ответственного.')
      return
    }

    setBusy(true)
    try {
      const payload = {
        equipment_type: form.equipment_type,
        name: form.name.trim() || null,
        model: form.model.trim() || null,
        inventory_number: form.inventory_number.trim() || null,
        employee_id: form.ownerMode === 'employee' ? defaultEmployeeId ?? null : null,
        department: form.ownerMode === 'department' ? form.department.trim() || null : null,
        responsible: form.ownerMode === 'responsible' ? form.responsible.trim() || null : null,
        location: form.location.trim() || null,
        issue_date: form.issue_date || null,
        last_test_date: form.last_test_date || null,
        next_test_date: form.next_test_date || null,
        result: form.result.trim() || null,
        comment: form.comment.trim() || null,
      }
      if (savedId) {
        const { error } = await supabase.from('safety_equipment').update(payload).eq('id', savedId)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('safety_equipment').insert(payload).select().single()
        if (error) throw error
        setSavedId(data.id)
      }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить запись')
    } finally {
      setBusy(false)
    }
  }

  const showName = NEEDS_NAME.includes(form.equipment_type)
  const showModel = form.equipment_type === 'power_tool'
  const showLocation = NEEDS_LOCATION.includes(form.equipment_type)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-surface p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-ink">{existing ? 'Редактирование записи' : 'Новое средство безопасности'}</h3>
          <button onClick={onClose} className="text-ink-faint hover:text-ink">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-muted">Тип</label>
            <select
              value={form.equipment_type}
              onChange={(e) => update('equipment_type', e.target.value as EquipmentType)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
            >
              {Object.entries(EQUIPMENT_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          {(showName || showModel) && (
            <div className="grid grid-cols-2 gap-4">
              {showName && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-muted">Наименование</label>
                  <input
                    value={form.name}
                    onChange={(e) => update('name', e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
                  />
                </div>
              )}
              {showModel && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-muted">Модель</label>
                  <input
                    value={form.model}
                    onChange={(e) => update('model', e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
                  />
                </div>
              )}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-ink-muted">Инвентарный номер</label>
            <input
              value={form.inventory_number}
              onChange={(e) => update('inventory_number', e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm font-mono outline-none focus:border-brand-700"
            />
          </div>

          {showLocation && (
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-muted">Место эксплуатации</label>
              <input
                value={form.location}
                onChange={(e) => update('location', e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
              />
            </div>
          )}

          {!defaultEmployeeId && (
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-muted">Закреплено за</label>
              <div className="mb-2 flex gap-2">
                {(['department', 'responsible'] as OwnerMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => update('ownerMode', mode)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                      form.ownerMode === mode
                        ? 'border-brand-800 bg-brand-100 text-brand-800'
                        : 'border-border text-ink-muted hover:bg-surface-muted'
                    }`}
                  >
                    {mode === 'department' ? 'Подразделение' : 'Ответственный'}
                  </button>
                ))}
              </div>
              {form.ownerMode === 'department' && (
                <input
                  value={form.department}
                  onChange={(e) => update('department', e.target.value)}
                  placeholder="Название подразделения"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
                />
              )}
              {form.ownerMode === 'responsible' && (
                <input
                  value={form.responsible}
                  onChange={(e) => update('responsible', e.target.value)}
                  placeholder="ФИО ответственного"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
                />
              )}
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-muted">Дата выдачи</label>
              <input
                type="date"
                value={form.issue_date}
                onChange={(e) => update('issue_date', e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-muted">Посл. испытание</label>
              <input
                type="date"
                value={form.last_test_date}
                onChange={(e) => update('last_test_date', e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-muted">След. испытание</label>
              <input
                type="date"
                value={form.next_test_date}
                onChange={(e) => update('next_test_date', e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink-muted">Результат</label>
            <input
              value={form.result}
              onChange={(e) => update('result', e.target.value)}
              placeholder="Годен / не годен"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink-muted">Комментарий</label>
            <textarea
              value={form.comment}
              onChange={(e) => update('comment', e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
            />
          </div>

          {error && <p className="text-sm text-status-expired">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-ink-muted hover:bg-surface-muted">
              Отмена
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-brand-800 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {busy ? 'Сохраняем…' : 'Сохранить'}
            </button>
          </div>
        </form>

        {savedId && (
          <div className="mt-6 border-t border-border pt-4">
            <label className="mb-2 block text-sm font-medium text-ink-muted">Документ испытания</label>
            <DocumentUpload entityType="safety_equipment" entityId={savedId} />
          </div>
        )}
      </div>
    </div>
  )
}
