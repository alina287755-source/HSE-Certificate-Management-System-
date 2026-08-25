import type { Status } from '@/types/db'

const STATUS_CONFIG: Record<Status, { label: string; dot: string; bg: string; fg: string }> = {
  ok: { label: 'Действует', dot: 'bg-status-ok', bg: 'bg-status-ok-bg', fg: 'text-status-ok' },
  warning: { label: 'Скоро заканчивается', dot: 'bg-status-warn', bg: 'bg-status-warn-bg', fg: 'text-status-warn' },
  expired: { label: 'Просрочено', dot: 'bg-status-expired', bg: 'bg-status-expired-bg', fg: 'text-status-expired' },
  none: { label: 'Нет данных', dot: 'bg-status-none', bg: 'bg-status-none-bg', fg: 'text-status-none' },
}

export function StatusBadge({ status }: { status: Status }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.bg} ${cfg.fg}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

export function statusBorderClass(status: Status) {
  return {
    ok: 'border-l-status-ok',
    warning: 'border-l-status-warn',
    expired: 'border-l-status-expired',
    none: 'border-l-status-none',
  }[status]
}
