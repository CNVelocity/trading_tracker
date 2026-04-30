import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Briefcase,
  ArrowLeftRight,
  Star,
  BarChart3,
  LogOut,
  PlusCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/dashboard',  icon: LayoutDashboard,  label: '看板' },
  { to: '/positions',  icon: Briefcase,         label: '持仓' },
  { to: '/trades',     icon: ArrowLeftRight,    label: '交易' },
  { to: '/watchlist',  icon: Star,              label: '自选股' },
  { to: '/analytics',  icon: BarChart3,         label: '分析' },
]

export default function Sidebar() {
  const navigate = useNavigate()

  function logout() {
    localStorage.removeItem('auth_token')
    window.location.reload()
  }

  return (
    <aside className="w-56 flex-shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2.5">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="7" fill="#01696f"/>
            <polyline points="5,24 10,15 15,18 21,9 27,13" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="10" cy="15" r="1.5" fill="white"/>
            <circle cx="15" cy="18" r="1.5" fill="white"/>
            <circle cx="21" cy="9" r="1.5" fill="white"/>
          </svg>
          <span className="text-[var(--color-text)] font-semibold text-sm leading-none">
            Trading<br />
            <span className="text-[var(--color-text-muted)] font-normal">Tracker</span>
          </span>
        </div>
      </div>

      {/* New Trade CTA */}
      <div className="px-3 pt-4">
        <button
          onClick={() => navigate('/trades/new')}
          className="w-full flex items-center justify-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-stone-950 font-semibold rounded-lg py-2 text-sm transition-colors"
        >
          <PlusCircle size={14} />
          新建交易
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pt-4 space-y-0.5">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-[var(--color-primary-hl)] text-[var(--color-primary)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-dynamic)]'
              )
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-4 border-t border-[var(--color-border)] pt-4">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--color-text-muted)] hover:text-[var(--color-error)] hover:bg-red-500/10 transition-colors"
        >
          <LogOut size={16} />
          退出
        </button>
      </div>
    </aside>
  )
}
