import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

interface Counts {
  totalEmployees: number
  certOk: number
  certWarning: number
  certExpired: number
  briefingsAttention: number
  ppeWarning: number
  ppeExpired: number
  equipmentWarning: number
  equipmentExpired: number
}

function Card({
  title,
  value,
  tone,
  onClick,
}: {
  title: string
  value: number | string
  tone: 'neutral' | 'ok' | 'warning' | 'expired'
  onClick?: () => void
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
      className={`flex flex-col items-start gap-1 rounded-xl border border-border border-l-4 ${toneClasses} bg-surface px-5 py-4 text-left shadow-sm transition hover:shadow-md hover:-translate-y-0.5`}
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
      const [
        { count: totalEmployees },
        certData,
        briefingStatus,
        ppeData,
        equipData,
      ] = await Promise.all([
        supabase.from('employees').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('certifications_with_status').select('status'),
        supabase.from('employee_briefing_status').select('status').in('status', ['warning', 'expired']),
        supabase.from('ppe_items_with_status').select('status'),
        supabase.from('safety_equipment_with_status').select('status'),
      ])

      const certs = certData.data ?? []
      const ppe = ppeData.data ?? []
      const equip = equipData.data ?? []

      setCounts({
        totalEmployees: totalEmployees ?? 0,
        certOk: certs.filter((r) => r.status === 'ok').length,
        certWarning: certs.filter((r) => r.status === 'warning').length,
        certExpired: certs.filter((r) => r.status === 'expired').length,
        briefingsAttention: briefingStatus.data?.length ?? 0,
        ppeWarning: ppe.filter((r) => r.status === 'warning').length,
        ppeExpired: ppe.filter((r) => r.status === 'expired').length,
        equipmentWarning: equip.filter((r) => r.status === 'warning').length,
        equipmentExpired: equip.filter((r) => r.status === 'expired').length,
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
          <Card title="Всего сотрудников" value={counts?.totalEmployees ?? '—'} tone="neutral" onClick={() => navigate('/employees')} />
          <Card title="Сертификаты в порядке" value={counts?.certOk ?? '—'} tone="ok" onClick={() => navigate('/certifications?status=ok')} />
          <Card title="Сертификаты скоро заканчиваются" value={counts?.certWarning ?? '—'} tone="warning" onClick={() => navigate('/certifications?status=warning')} />
          <Card title="Просроченные сертификаты" value={counts?.certExpired ?? '—'} tone="expired" onClick={() => navigate('/certifications?status=expired')} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-faint">
          Инструктажи, СИЗ и средства безопасности
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card
            title="Инструктажи требуют внимания"
            value={counts?.briefingsAttention ?? '—'}
            tone={counts && counts.briefingsAttention > 0 ? 'warning' : 'ok'}
            onClick={() => navigate('/briefings')}
          />
          <Card
            title="СИЗ требуют замены"
            value={counts != null ? counts.ppeWarning + counts.ppeExpired : '—'}
            tone={counts && counts.ppeExpired > 0 ? 'expired' : counts && counts.ppeWarning > 0 ? 'warning' : 'ok'}
            onClick={() => navigate('/ppe')}
          />
          <Card
            title="Испытания скоро заканчиваются"
            value={counts?.equipmentWarning ?? '—'}
            tone="warning"
            onClick={() => navigate('/ppe')}
          />
          <Card
            title="Просроченные испытания"
            value={counts?.equipmentExpired ?? '—'}
            tone="expired"
            onClick={() => navigate('/ppe')}
          />
        </div>
      </section>
    </div>
  )
}
