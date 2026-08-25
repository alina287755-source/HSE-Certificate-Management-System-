import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import type { KnowledgeCheck } from '@/types/db'
import { DocumentUpload } from '@/components/DocumentUpload'

interface Props {
  employeeId: string
  existing?: KnowledgeCheck | null
  onClose: () => void
  onSaved: () => void
}

export function KnowledgeCheckFormModal({ employeeId, existing, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    check_date: existing?.check_date ?? new Date().toISOString().slice(0, 10),
    check_type: existing?.check_type ?? '',
    result: existing?.result ?? '',
    admission: existing?.admission ?? '',
    expiry_date: existing?.expiry_date ?? '',
    conducted_by: existing?.conducted_by ?? '',
    commission: existing?.commission ?? '',
    protocol_number: existing?.protocol_number ?? '',
    comment: existing?.comment ?? '',
  })
  const [savedId, setSavedId] = useState<string | null>(existing?.id ?? null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const payload = {
        check_date: form.check_date,
        check_type: form.check_type.trim() || null,
        result: form.result.trim() || null,
        admission: form.admission.trim() || null,
        expiry_date: form.expiry_date || null,
        conducted_by: form.conducted_by.trim() || null,
        commission: form.commission.trim() || null,
        protocol_number: form.protocol_number.trim() || null,
        comment: form.comment.trim() || null,
      }
      if (savedId) {
        const { error } = await supabase.from('knowledge_checks').update(payload).eq('id', savedId)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('knowledge_checks')
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-surface p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-ink">{existing ? 'Редактирование проверки' : 'Новая проверка знаний'}</h3>
          <button onClick={onClose} className="text-ink-faint hover:text-ink">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-muted">Дата проверки</label>
              <input
                type="date"
                value={form.check_date}
                onChange={(e) => update('check_date', e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-muted">Вид проверки</label>
              <input
                value={form.check_type}
                onChange={(e) => update('check_type', e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-muted">Результат</label>
              <input
                value={form.result}
                onChange={(e) => update('result', e.target.value)}
                placeholder="Сдал / не сдал"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-muted">Допуск</label>
              <input
                value={form.admission}
                onChange={(e) => update('admission', e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink-muted">Срок действия (если предусмотрен)</label>
            <input
              type="date"
              value={form.expiry_date}
              onChange={(e) => update('expiry_date', e.target.value)}
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
              <label className="mb-1 block text-sm font-medium text-ink-muted">Комиссия / организация</label>
              <input
                value={form.commission}
                onChange={(e) => update('commission', e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink-muted">Номер протокола</label>
            <input
              value={form.protocol_number}
              onChange={(e) => update('protocol_number', e.target.value)}
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
            <label className="mb-2 block text-sm font-medium text-ink-muted">Файл протокола</label>
            <DocumentUpload entityType="knowledge_check" entityId={savedId} />
          </div>
        )}
      </div>
    </div>
  )
}
