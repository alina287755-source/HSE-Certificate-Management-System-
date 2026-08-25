import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

interface Counts {
  totalEmployees: number
  certOk: number
  certWarning: number
  certExpired: number
}

function Card({
  title,
  value,
  tone,
  onClick,
  disabled,
}: {
  title: string
  value: number | string
  tone: 'neutral' | 'ok' | 'warning' | 'expired'
  onClick?: () => void
  disabled?: boolean
}) {
  const toneClasses = {
    neutral: 'border-l-brand-800',
    ok: 'border-l-status-ok',
    warning: 'border-l-status-warn',
    expired: 'border-l-status-expired',
  }[tone]

  return (
    <button
      onClick={onClick}
      disabled={disabled || !onClick}
      className={`flex flex-col items-start gap-1 rounded-xl border border-border border-l-4 ${toneClasses} bg-surface px-5 py-4 text-left shadow-sm transition ${
        onClick && !disabled ? 'hover:shadow-md hover:-translate-y-0.5' : 'opacity-60'
      }`}
    >
      <span className="text-xs font-medium uppercase tracking-wide text-ink-faint">{title}</span>
      <span className="text-3xl font-bold text-ink">{value}</span>
    </button>
  )
}

export function HomePage() {
  const navigate = useNavigate()
  const [counts, setCounts] = useState<Counts | null>(null)

  useEffect(() => {
    async function load() {
      const [{ count: totalEmployees }, certData] = await Promise.all([
        supabase.from('employees').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('certifications_with_status').select('status'),
      ])

      const rows = certData.data ?? []
      setCounts({
        totalEmployees: totalEmployees ?? 0,
        certOk: rows.filter((r) => r.status === 'ok').length,
        certWarning: rows.filter((r) => r.status === 'warning').length,
        certExpired: rows.filter((r) => r.status === 'expired').length,
      })
    }
    load()
  }, [])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ink">Главная</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Общая картина по охране труда, промышленной и пожарной безопасности подразделения.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-faint">
          Сотрудники и сертификация
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card
            title="Всего сотрудников"
            value={counts?.totalEmployees ?? '—'}
            tone="neutral"
            onClick={() => navigate('/employees')}
          />
          <Card
            title="Сертификаты в порядке"
            value={counts?.certOk ?? '—'}
            tone="ok"
            onClick={() => navigate('/certifications?status=ok')}
          />
          <Card
            title="Сертификаты скоро заканчиваются"
            value={counts?.certWarning ?? '—'}
            tone="warning"
            onClick={() => navigate('/certifications?status=warning')}
          />
          <Card
            title="Просроченные сертификаты"
            value={counts?.certExpired ?? '—'}
            tone="expired"
            onClick={() => navigate('/certifications?status=expired')}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-faint">
          Следующие модули (в разработке)
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card title="Инструктажи требуют внимания" value="—" tone="neutral" disabled />
          <Card title="СИЗ требуют замены" value="—" tone="neutral" disabled />
          <Card title="Испытания скоро заканчиваются" value="—" tone="neutral" disabled />
          <Card title="Просроченные испытания" value="—" tone="neutral" disabled />
        </div>
        <p className="mt-2 text-xs text-ink-faint">
          Эти показатели появятся, когда мы вместе перейдём к следующим этапам разработки.
        </p>
      </section>
    </div>
  )
}
