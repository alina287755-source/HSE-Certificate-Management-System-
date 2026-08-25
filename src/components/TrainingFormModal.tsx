import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { ORGANIZER_TYPE_LABELS, TRAINING_FORMAT_LABELS } from '@/types/db'
import type { OrganizerType, Training, TrainingFormat } from '@/types/db'
import { DocumentUpload } from '@/components/DocumentUpload'

interface Props {
  employeeId: string
  existing?: Training | null
  onClose: () => void
  onSaved: () => void
}

export function TrainingFormModal({ employeeId, existing, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    title: existing?.title ?? '',
    training_date: existing?.training_date ?? '',
    format: (existing?.format ?? 'offline') as TrainingFormat,
    organizer_type: (existing?.organizer_type ?? '') as OrganizerType | '',
    organizer_name: existing?.organizer_name ?? '',
    language: existing?.language ?? '',
    duration_hours: existing?.duration_hours != null ? String(existing.duration_hours) : '',
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
    if (!form.title.trim()) {
      setError('Укажите название обучения.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const payload = {
        title: form.title.trim(),
        training_date: form.training_date || null,
        format: form.format,
        organizer_type: form.organizer_type || null,
        organizer_name: form.organizer_name.trim() || null,
        language: form.language.trim() || null,
        duration_hours: form.duration_hours ? Number(form.duration_hours) : null,
        comment: form.comment.trim() || null,
      }
      if (savedId) {
        const { error } = await supabase.from('trainings').update(payload).eq('id', savedId)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('trainings')
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
          <h3 className="text-lg font-semibold text-ink">{existing ? 'Редактирование обучения' : 'Новое обучение'}</h3>
          <button onClick={onClose} className="text-ink-faint hover:text-ink">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-muted">
              Название обучения <span className="text-status-expired">*</span>
            </label>
            <input
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-muted">Дата</label>
              <input
                type="date"
                value={form.training_date}
                onChange={(e) => update('training_date', e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-muted">Формат</label>
              <select
                value={form.format}
                onChange={(e) => update('format', e.target.value as TrainingFormat)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
              >
                {Object.entries(TRAINING_FORMAT_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink-muted">Кто проводил</label>
            <select
              value={form.organizer_type}
              onChange={(e) => update('organizer_type', e.target.value as OrganizerType | '')}
              className="mb-2 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
            >
              <option value="">Не указано</option>
              {Object.entries(ORGANIZER_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <input
              value={form.organizer_name}
              onChange={(e) => update('organizer_name', e.target.value)}
              placeholder="ФИО тренера / название организации"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-muted">Язык обучения</label>
              <input
                value={form.language}
                onChange={(e) => update('language', e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-muted">Продолжительность, ч</label>
              <input
                type="number"
                step="0.5"
                value={form.duration_hours}
                onChange={(e) => update('duration_hours', e.target.value)}
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
            <label className="mb-2 block text-sm font-medium text-ink-muted">Документ / сертификат обучения</label>
            <DocumentUpload entityType="training" entityId={savedId} />
          </div>
        )}
      </div>
    </div>
  )
}
