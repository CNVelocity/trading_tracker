import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, TrendingUp, List,
  Bookmark, BarChart2, LogOut,
} from 'lucide-react'
import { clearToken } from '@/lib/auth'
import clsx from 'clsx'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: '看板' },
  { to: '/positions',  icon: TrendingUp,     label: '持仓' },
  { to: '/trades',     icon: List,           label: '交易' },
  { to: '/watchlist',  icon: Bookmark,       label: '自选' },
  { to: '/analytics',  icon: BarChart2,      label: '分析' },
]

export default function Sidebar() {
  const navigate = useNavigate()

  return (
    <aside className="hidden md:flex w-56 flex-col border-r border-stone-800 bg-stone-900 py-6 px-3">
      {/* Brand */}
      <div className="mb-8 px-3">
        <svg
          viewBox="0 0 32 32"
          className="h-7 w-7 mb-2 text-teal-500"
          fill="none"
          aria-label="Trading Tracker"
        >
          <rect x="2" y="20" width="4" height="10" rx="1" fill="currentColor" opacity="0.5" />
          <rect x="9" y="13" width="4" height="17" rx="1" fill="currentColor" opacity="0.7" />
          <rect x="16" y="6" width="4" height="24" rx="1" fill="currentColor" />
          <polyline
            points="3,18 10,11 17,4 24,8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-sm font-medium text-stone-200 tracking-tight">Trading Tracker</span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-0.5">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-stone-800 text-stone-50'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50',
              )
            }
          >
            <Icon size={15} strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <button
        onClick={() => { clearToken(); navigate('/login') }}
        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-stone-500 hover:text-stone-300 hover:bg-stone-800/50 transition-colors"
        aria-label="退出登录"
      >
        <LogOut size={15} strokeWidth={1.75} />
        退出登录
      </button>
    </aside>
  )
}
