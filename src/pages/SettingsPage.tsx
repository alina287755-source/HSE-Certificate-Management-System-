import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

export function SettingsPage() {
  const { profile } = useAuth()
  const [warnDays, setWarnDays] = useState('30')
  const [thresholdsLoading, setThresholdsLoading] = useState(true)
  const [thresholdsBusy, setThresholdsBusy] = useState(false)
  const [thresholdsSaved, setThresholdsSaved] = useState(false)

  const [botToken, setBotToken] = useState('')
  const [adminChatId, setAdminChatId] = useState('')
  const [enabled, setEnabled] = useState(false)
  const [telegramLoading, setTelegramLoading] = useState(true)
  const [telegramBusy, setTelegramBusy] = useState(false)
  const [telegramSaved, setTelegramSaved] = useState(false)

  useEffect(() => {
    async function loadThresholds() {
      const { data } = await supabase.from('settings').select('value').eq('key', 'status_thresholds').single()
      if (data?.value?.warn_days != null) setWarnDays(String(data.value.warn_days))
      setThresholdsLoading(false)
    }
    async function loadTelegram() {
      const { data } = await supabase.from('telegram_settings').select('*').eq('id', true).single()
      if (data) {
        setBotToken(data.bot_token ?? '')
        setAdminChatId(data.admin_chat_id ?? '')
        setEnabled(data.enabled ?? false)
      }
      setTelegramLoading(false)
    }
    loadThresholds()
    loadTelegram()
  }, [])

  async function handleThresholdsSubmit(e: FormEvent) {
    e.preventDefault()
    setThresholdsBusy(true)
    setThresholdsSaved(false)
    await supabase
      .from('settings')
      .update({ value: { warn_days: Number(warnDays) } })
      .eq('key', 'status_thresholds')
    setThresholdsBusy(false)
    setThresholdsSaved(true)
  }

  async function handleTelegramSubmit(e: FormEvent) {
    e.preventDefault()
    setTelegramBusy(true)
    setTelegramSaved(false)
    await supabase
      .from('telegram_settings')
      .update({ bot_token: botToken.trim() || null, admin_chat_id: adminChatId.trim() || null, enabled })
      .eq('id', true)
    setTelegramBusy(false)
    setTelegramSaved(true)
  }

  if (profile?.role !== 'admin') {
    return <p className="text-ink-faint">Настройки доступны только администратору.</p>
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Настройки</h1>
        <p className="mt-1 text-sm text-ink-muted">Пороги статусов и уведомления в Telegram.</p>
      </div>

      {thresholdsLoading ? (
        <p className="text-ink-faint">Загрузка…</p>
      ) : (
        <form onSubmit={handleThresholdsSubmit} className="space-y-4 rounded-xl border border-border bg-surface p-6">
          <h2 className="font-semibold text-ink">Пороги статусов</h2>
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
            </p>
          </div>
          <button
            type="submit"
            disabled={thresholdsBusy}
            className="rounded-lg bg-brand-800 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {thresholdsBusy ? 'Сохраняем…' : 'Сохранить'}
          </button>
          {thresholdsSaved && <span className="ml-3 text-sm text-status-ok">Сохранено</span>}
        </form>
      )}

      {telegramLoading ? (
        <p className="text-ink-faint">Загрузка…</p>
      ) : (
        <form onSubmit={handleTelegramSubmit} className="space-y-4 rounded-xl border border-border bg-surface p-6">
          <h2 className="font-semibold text-ink">Уведомления в Telegram</h2>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink-muted">Токен бота</label>
            <input
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              placeholder="Получаете у @BotFather после команды /newbot"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm font-mono outline-none focus:border-brand-700"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink-muted">Ваш chat ID (для сводки администратору)</label>
            <input
              value={adminChatId}
              onChange={(e) => setAdminChatId(e.target.value)}
              placeholder="Получаете у @userinfobot"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm font-mono outline-none focus:border-brand-700"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            Отправлять уведомления автоматически (каждый день в 08:00)
          </label>

          <button
            type="submit"
            disabled={telegramBusy}
            className="rounded-lg bg-brand-800 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {telegramBusy ? 'Сохраняем…' : 'Сохранить'}
          </button>
          {telegramSaved && <span className="ml-3 text-sm text-status-ok">Сохранено</span>}

          <div className="rounded-lg bg-surface-muted p-3 text-xs text-ink-muted">
            <p className="mb-1 font-medium text-ink">Как подключить:</p>
            <ol className="list-decimal space-y-1 pl-4">
              <li>В Telegram напишите @BotFather → команда /newbot → получите токен, вставьте его выше.</li>
              <li>Напишите @userinfobot, чтобы узнать свой собственный chat ID — впишите его выше.</li>
              <li>Найдите вашего нового бота в Telegram по имени и нажмите «Start» (иначе бот не сможет вам писать).</li>
              <li>У каждого сотрудника, которому нужны личные уведомления, — так же узнайте его chat ID через @userinfobot и впишите в его карточку (кнопка «Редактировать»), и он тоже должен нажать «Start» вашему боту.</li>
            </ol>
          </div>
        </form>
      )}
    </div>
  )
}
