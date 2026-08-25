import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

export function SettingsPage() {
  const { profile } = useAuth()
  const [warnDays, setWarnDays] = useState('30')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('settings').select('value').eq('key', 'status_thresholds').single()
      if (data?.value?.warn_days != null) setWarnDays(String(data.value.warn_days))
      setLoading(false)
    }
    load()
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setSaved(false)
    await supabase
      .from('settings')
      .update({ value: { warn_days: Number(warnDays) } })
      .eq('key', 'status_thresholds')
    setBusy(false)
    setSaved(true)
  }

  if (profile?.role !== 'admin') {
    return <p className="text-ink-faint">Настройки доступны только администратору.</p>
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Настройки</h1>
        <p className="mt-1 text-sm text-ink-muted">Пороги статусов и общие параметры системы.</p>
      </div>

      {loading ? (
        <p className="text-ink-faint">Загрузка…</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-surface p-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-muted">
              За сколько дней до окончания срока показывать 🟡 «скоро заканчивается»
            </label>
            <input
              type="number"
              min="1"
              value={warnDays}
              onChange={(e) => setWarnDays(e.target.value)}
              className="w-32 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-700"
            />
            <p className="mt-1 text-xs text-ink-faint">
              Действует для сертификатов, проверок знаний, СИЗ, инструктажей и испытаний средств безопасности.
              Сейчас: {warnDays} дней.
            </p>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-brand-800 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {busy ? 'Сохраняем…' : 'Сохранить'}
          </button>
          {saved && <span className="ml-3 text-sm text-status-ok">Сохранено</span>}
        </form>
      )}

      <div className="rounded-xl border border-border bg-surface p-6">
        <h2 className="mb-2 text-sm font-semibold text-ink">Каналы уведомлений</h2>
        <p className="text-sm text-ink-muted">
          Подключение уведомлений по электронной почте и в Telegram — на следующем этапе. Здесь появятся настройки:
          какой e-mail и какой Telegram-канал получает уведомления, и за сколько дней до срока присылать напоминание.
        </p>
      </div>
    </div>
  )
}
