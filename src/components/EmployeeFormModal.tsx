import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import type { Employee } from '@/types/db'

interface Props {
  existing?: Employee | null
  onClose: () => void
  onSaved: () => void
}

const emptyForm = {
  full_name: '',
  tabel_number: '',
  workshop: '',
  site: '',
  department: '',
  position_title: '',
  phone: '',
  email: '',
}

export function EmployeeFormModal({ existing, onClose, onSaved }: Props) {
  const [form, setForm] = useState(
    existing
      ? {
          full_name: existing.full_name,
          tabel_number: existing.tabel_number ?? '',
          workshop: existing.workshop ?? '',
          site: existing.site ?? '',
          department: existing.department ?? '',
          position_title: existing.position_title ?? '',
          phone: existing.phone ?? '',
          email: existing.email ?? '',
        }
      : emptyForm
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.full_name.trim()) {
      setError('Укажите ФИО сотрудника — это поле обязательное.')
      return
    }

    setBusy(true)
    try {
      const payload = {
        full_name: form.full_name.trim(),
        tabel_number: form.tabel_number.trim() || null,
        workshop: form.workshop.trim() || null,
        site: form.site.trim() || null,
        department: form.department.trim() || null,
        position_title: form.position_title.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
      }

      if (existing) {
        const { error } = await supabase.from('employees').update(payload).eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('employees').insert(payload)
        if (error) throw error
      }

      onSaved()
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось сохранить сотрудника'
      // Дружелюбное сообщение для самой частой ошибки — повторяющийся табельный номер
      setError(
        message.includes('duplicate key') || message.includes('unique')
          ? 'Сотрудник с таким табельным номером уже есть в системе.'
          : message
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-surface p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-ink">
            {existing ? 'Редактирование сотрудника' : 'Новый сотрудник'}
          </h3>
          <button onClick={onClose} className="text-ink-faint hover:text-ink">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-muted">
              ФИО <span className="text-status-expired">*</span>
            </label>
            <input
              value={form.full_name}
              onChange={(e) => update('full_name', e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-100"
              placeholder="Иванов Иван Иванович"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-muted">Табельный номер</label>
              <input
                value={form.tabel_number}
                onChange={(e) => update('tabel_number', e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm font-mono outline-none focus:border-brand-700"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-muted">Должность</label>
              <input
                value={form.position_title}
                onChange={(e) => update('position_title', e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-muted">Цех</label>
              <input
                value={form.workshop}
                onChange={(e) => update('workshop', e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-muted">Участок</label>
              <input
                value={form.site}
                onChange={(e) => update('site', e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-muted">Подразделение</label>
              <input
                value={form.department}
                onChange={(e) => update('department', e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-muted">Телефон</label>
              <input
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
                placeholder="+7 700 000 00 00"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-muted">E-mail</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
              />
            </div>
          </div>

          {error && <p className="text-sm text-status-expired">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-ink-muted hover:bg-surface-muted"
            >
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
      </div>
    </div>
  )
}
