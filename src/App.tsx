import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { getToken } from '@/lib/auth'
import Layout from '@/components/layout/Layout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Positions from '@/pages/Positions'
import Trades from '@/pages/Trades'
import NewTrade from '@/pages/NewTrade'
import Questionnaire from '@/pages/Questionnaire'
import PreTradeCheck from '@/pages/PreTradeCheck'
import Watchlist from '@/pages/Watchlist'
import Analytics from '@/pages/Analytics'

function RequireAuth() {
  const token = getToken()
  if (!token) return <Navigate to="/login" replace />
  return <Outlet />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<RequireAuth />}>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"   element={<Dashboard />} />
            <Route path="positions"   element={<Positions />} />
            <Route path="trades"      element={<Trades />} />
            <Route path="trades/new"  element={<NewTrade />} />
            <Route path="trades/:tradeId/questionnaire" element={<Questionnaire />} />
            {/* Pre-trade thinking questionnaire — no trade required */}
            <Route path="questionnaire/pre" element={<PreTradeCheck />} />
            <Route path="watchlist"   element={<Watchlist />} />
            <Route path="analytics"   element={<Analytics />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
