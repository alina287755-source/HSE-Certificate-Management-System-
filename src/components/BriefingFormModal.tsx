import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { BRIEFING_TYPE_LABELS } from '@/types/db'
import type { Briefing, BriefingType } from '@/types/db'
import { DocumentUpload } from '@/components/DocumentUpload'

interface Props {
  employeeId: string
  existing?: Briefing | null
  onClose: () => void
  onSaved: () => void
}

export function BriefingFormModal({ employeeId, existing, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    type: (existing?.type ?? 'primary') as BriefingType,
    briefing_date: existing?.briefing_date ?? new Date().toISOString().slice(0, 10),
    reason: existing?.reason ?? '',
    conducted_by: existing?.conducted_by ?? '',
    conducted_by_position: existing?.conducted_by_position ?? '',
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
    setBusy(true)
    setError(null)
    try {
      const payload = {
        type: form.type,
        briefing_date: form.briefing_date,
        reason: form.reason.trim() || null,
        conducted_by: form.conducted_by.trim() || null,
        conducted_by_position: form.conducted_by_position.trim() || null,
        comment: form.comment.trim() || null,
      }
      if (savedId) {
        const { error } = await supabase.from('briefings').update(payload).eq('id', savedId)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('briefings')
          .insert({ ...payload, employee_id: employeeId })
          .select()
          .single()
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

  const needsReason = form.type === 'unscheduled' || form.type === 'targeted'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-surface p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-ink">{existing ? 'Редактирование инструктажа' : 'Новый инструктаж'}</h3>
          <button onClick={onClose} className="text-ink-faint hover:text-ink">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-muted">Вид инструктажа</label>
            <select
              value={form.type}
              onChange={(e) => update('type', e.target.value as BriefingType)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
            >
              {Object.entries(BRIEFING_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            {form.type === 'repeat' && (
              <p className="mt-1 text-xs text-ink-faint">Проводится раз в 3 месяца, контрольный срок — до 5-го числа.</p>
            )}
            {form.type === 'unscheduled' && (
              <p className="mt-1 text-xs text-ink-faint">Не имеет фиксированной периодичности.</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink-muted">Дата</label>
            <input
              type="date"
              value={form.briefing_date}
              onChange={(e) => update('briefing_date', e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink-muted">
              Причина / основание {needsReason && <span className="text-status-expired">*</span>}
            </label>
            <input
              value={form.reason}
              onChange={(e) => update('reason', e.target.value)}
              placeholder={needsReason ? 'Например: несчастный случай, разовые работы' : 'Необязательно'}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-muted">Кто проводил</label>
              <input
                value={form.conducted_by}
                onChange={(e) => update('conducted_by', e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-muted">Должность проводившего</label>
              <input
                value={form.conducted_by_position}
                onChange={(e) => update('conducted_by_position', e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
              />
            </div>
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
            <label className="mb-2 block text-sm font-medium text-ink-muted">Документ</label>
            <DocumentUpload entityType="briefing" entityId={savedId} />
          </div>
        )}
      </div>
    </div>
  )
}
