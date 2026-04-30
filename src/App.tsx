import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Layout from '@/components/layout/Layout'
import Dashboard from '@/pages/Dashboard'
import Positions from '@/pages/Positions'
import Trades from '@/pages/Trades'
import NewTrade from '@/pages/NewTrade'
import Questionnaire from '@/pages/Questionnaire'
import Watchlist from '@/pages/Watchlist'
import Analytics from '@/pages/Analytics'

function AuthGate({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState(() => localStorage.getItem('auth_token') ?? '')
  const [input, setInput] = useState('')

  useEffect(() => {
    if (token) {
      // Ping health endpoint to verify token
      fetch('/api/health', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => { if (!r.ok) { localStorage.removeItem('auth_token'); setToken('') } })
        .catch(() => {})
    }
  }, [token])

  if (!token) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--color-bg)]">
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-8 w-full max-w-sm shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#01696f"/>
              <polyline points="5,24 10,15 15,18 21,9 27,13" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="10" cy="15" r="1.5" fill="white"/>
              <circle cx="15" cy="18" r="1.5" fill="white"/>
              <circle cx="21" cy="9" r="1.5" fill="white"/>
            </svg>
            <div>
              <h1 className="text-[var(--color-text)] text-base font-semibold leading-none">Trading Tracker</h1>
              <p className="text-[var(--color-text-muted)] text-xs mt-0.5">请输入访问令牌</p>
            </div>
          </div>
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && input) {
                localStorage.setItem('auth_token', input)
                setToken(input)
              }
            }}
            placeholder="API_SECRET_TOKEN"
            className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-[var(--color-text)] text-sm placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary)] transition-colors mb-3"
          />
          <button
            onClick={() => {
              if (input) {
                localStorage.setItem('auth_token', input)
                setToken(input)
              }
            }}
            className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-stone-950 font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors"
          >
            进入
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthGate>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="positions" element={<Positions />} />
            <Route path="trades" element={<Trades />} />
            <Route path="trades/new" element={<NewTrade />} />
            <Route path="trades/:tradeId/questionnaire" element={<Questionnaire />} />
            <Route path="watchlist" element={<Watchlist />} />
            <Route path="analytics" element={<Analytics />} />
          </Route>
        </Routes>
      </AuthGate>
    </BrowserRouter>
  )
}
