import { Routes, Route, Navigate } from 'react-router-dom'
import { getToken } from '@/lib/auth'
import AppLayout from '@/components/layout/AppLayout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Positions from '@/pages/Positions'
import Trades from '@/pages/Trades'
import Watchlist from '@/pages/Watchlist'
import Analytics from '@/pages/Analytics'

function RequireAuth() {
  if (!getToken()) return <Navigate to="/login" replace />
  return <AppLayout />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/positions" element={<Positions />} />
        <Route path="/trades" element={<Trades />} />
        <Route path="/watchlist" element={<Watchlist />} />
        <Route path="/analytics" element={<Analytics />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
