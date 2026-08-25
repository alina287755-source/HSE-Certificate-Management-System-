import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import type { PPEItem } from '@/types/db'
import { DocumentUpload } from '@/components/DocumentUpload'

interface Props {
  employeeId: string
  existing?: PPEItem | null
  onClose: () => void
  onSaved: () => void
}

export function PPEFormModal({ employeeId, existing, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    name: existing?.name ?? '',
    category: existing?.category ?? '',
    size: existing?.size ?? '',
    quantity: existing?.quantity != null ? String(existing.quantity) : '1',
    issue_date: existing?.issue_date ?? '',
    expiry_date: existing?.expiry_date ?? '',
    doc_number: existing?.doc_number ?? '',
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
    if (!form.name.trim()) {
      setError('Укажите наименование СИЗ.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category.trim() || null,
        size: form.size.trim() || null,
        quantity: form.quantity ? Number(form.quantity) : 1,
        issue_date: form.issue_date || null,
        expiry_date: form.expiry_date || null,
        doc_number: form.doc_number.trim() || null,
        comment: form.comment.trim() || null,
      }
      if (savedId) {
        const { error } = await supabase.from('ppe_items').update(payload).eq('id', savedId)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('ppe_items')
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
          <h3 className="text-lg font-semibold text-ink">{existing ? 'Редактирование СИЗ' : 'Новая выдача СИЗ'}</h3>
          <button onClick={onClose} className="text-ink-faint hover:text-ink">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-muted">
              Наименование <span className="text-status-expired">*</span>
            </label>
            <input
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="Например: каска защитная"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-muted">Категория</label>
              <input
                value={form.category}
                onChange={(e) => update('category', e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-muted">Размер</label>
              <input
                value={form.size}
                onChange={(e) => update('size', e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-muted">Количество</label>
              <input
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) => update('quantity', e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
              <label className="mb-1 block text-sm font-medium text-ink-muted">Срок годности / замены</label>
              <input
                type="date"
                value={form.expiry_date}
                onChange={(e) => update('expiry_date', e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink-muted">Номер документа выдачи</label>
            <input
              value={form.doc_number}
              onChange={(e) => update('doc_number', e.target.value)}
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
            <label className="mb-2 block text-sm font-medium text-ink-muted">Документ выдачи</label>
            <DocumentUpload entityType="ppe_item" entityId={savedId} />
          </div>
        )}
      </div>
    </div>
  )
}
