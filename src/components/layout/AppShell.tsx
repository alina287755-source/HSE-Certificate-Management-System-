import { type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

const NAV_ITEMS = [
  { to: '/', label: 'Главная', icon: '🏠', end: true },
  { to: '/employees', label: 'Сотрудники', icon: '👥' },
  { to: '/certifications', label: 'Сертификация', icon: '📜' },
  { to: '/training', label: 'Обучение', icon: '🎓' },
  { to: '/briefings', label: 'Инструктажи', icon: '📋' },
  { to: '/knowledge-checks', label: 'Проверка знаний и допуск', icon: '✅' },
  { to: '/ppe', label: 'СИЗ и средства безопасности', icon: '🦺' },
  { to: '/notifications', label: 'Уведомления', icon: '🔔' },
  { to: '/reports', label: 'Отчёты', icon: '📊' },
  { to: '/settings', label: 'Настройки', icon: '⚙️' },
]

const ROLE_LABELS: Record<string, string> = {
  admin: 'Администратор',
  manager: 'Руководитель',
  employee: 'Сотрудник',
}

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth()

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <aside className="flex w-72 flex-shrink-0 flex-col bg-brand-950 text-white">
        <div className="flex items-center gap-3 border-b border-white/10 px-6 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent-500 font-mono text-sm font-bold text-brand-950">
            ОТ
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight">Охрана труда</div>
            <div className="text-xs text-white/50">и промышленная безопасность</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                  isActive ? 'bg-accent-500 font-medium text-brand-950' : 'text-white/80 hover:bg-white/10'
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 px-4 py-4">
          <div className="mb-2 text-xs text-white/50">
            {profile?.full_name || 'Пользователь'}
            <br />
            <span className="text-white/70">{profile ? ROLE_LABELS[profile.role] : ''}</span>
          </div>
          <button
            onClick={signOut}
            className="w-full rounded-lg bg-white/10 px-3 py-2 text-sm text-white/90 transition hover:bg-white/20"
          >
            Выйти
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-8 py-8">{children}</div>
      </main>
    </div>
  )
}
