import { NavLink } from 'react-router-dom'
import { LayoutDashboard, TrendingUp, List, Bookmark, BarChart2 } from 'lucide-react'
import clsx from 'clsx'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: '看板' },
  { to: '/positions',  icon: TrendingUp,     label: '持仓' },
  { to: '/trades',     icon: List,           label: '交易' },
  { to: '/watchlist',  icon: Bookmark,       label: '自选' },
  { to: '/analytics',  icon: BarChart2,      label: '分析' },
]

export default function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-stone-900/95 backdrop-blur border-t border-stone-800 flex">
      {NAV.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            clsx(
              'flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] transition-colors',
              isActive ? 'text-teal-400' : 'text-stone-500',
            )
          }
        >
          <Icon size={20} strokeWidth={1.75} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
