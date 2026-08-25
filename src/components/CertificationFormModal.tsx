import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { CERTIFICATION_LABELS, type Certification, type CertificationType } from '@/types/db'
import { DocumentUpload } from '@/components/DocumentUpload'

interface Props {
  employeeId: string
  existing?: Certification | null
  onClose: () => void
  onSaved: () => void
}

const emptyForm = {
  type: 'biot' as CertificationType,
  issue_date: '',
  expiry_date: '',
  certificate_no: '',
  trainer: '',
  organization: '',
  comment: '',
}

export function CertificationFormModal({ employeeId, existing, onClose, onSaved }: Props) {
  const [form, setForm] = useState(
    existing
      ? {
          type: existing.type,
          issue_date: existing.issue_date ?? '',
          expiry_date: existing.expiry_date ?? '',
          certificate_no: existing.certificate_no ?? '',
          trainer: existing.trainer ?? '',
          organization: existing.organization ?? '',
          comment: existing.comment ?? '',
        }
      : emptyForm
  )
  const [savedId, setSavedId] = useState<string | null>(existing?.id ?? null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (savedId) {
        const { error } = await supabase.from('certifications').update(form).eq('id', savedId)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('certifications')
          .insert({ ...form, employee_id: employeeId })
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
          <h3 className="text-lg font-semibold text-ink">
            {existing ? 'Редактирование сертификата' : 'Новый сертификат'}
          </h3>
          <button onClick={onClose} className="text-ink-faint hover:text-ink">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-muted">Вид сертификата</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as CertificationType })}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
            >
              {Object.entries(CERTIFICATION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-muted">Дата прохождения</label>
              <input
                type="date"
                value={form.issue_date}
                onChange={(e) => setForm({ ...form, issue_date: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-muted">Дата окончания</label>
              <input
                type="date"
                value={form.expiry_date}
                onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink-muted">Номер удостоверения</label>
            <input
              value={form.certificate_no}
              onChange={(e) => setForm({ ...form, certificate_no: e.target.value })}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-muted">Кто проводил</label>
              <input
                value={form.trainer}
                onChange={(e) => setForm({ ...form, trainer: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-muted">Организация</label>
              <input
                value={form.organization}
                onChange={(e) => setForm({ ...form, organization: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink-muted">Комментарий</label>
            <textarea
              value={form.comment}
              onChange={(e) => setForm({ ...form, comment: e.target.value })}
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
            <label className="mb-2 block text-sm font-medium text-ink-muted">Скан удостоверения / сертификата</label>
            <DocumentUpload entityType="certification" entityId={savedId} />
          </div>
        )}
      </div>
    </div>
  )
}
