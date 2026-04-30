import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '@/lib/api'
import { setToken } from '@/lib/auth'

export default function Login() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const token = await login(username, password)
      setToken(token)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <svg viewBox="0 0 48 48" className="h-12 w-12 mx-auto mb-3 text-teal-500" fill="none" aria-hidden="true">
            <rect x="3" y="30" width="6" height="15" rx="2" fill="currentColor" opacity="0.4" />
            <rect x="13" y="20" width="6" height="25" rx="2" fill="currentColor" opacity="0.65" />
            <rect x="23" y="9" width="6" height="36" rx="2" fill="currentColor" />
            <polyline
              points="5,27 15,17 25,6 38,12"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <h1 className="text-xl font-medium text-stone-100">Trading Tracker</h1>
          <p className="text-sm text-stone-500 mt-1">交易记录与决策分析</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-xs text-stone-400 mb-1.5">用户名</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="输入用户名..."
              autoFocus
              autoComplete="username"
              required
              className="w-full bg-stone-900 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 text-sm placeholder:text-stone-600 focus:outline-none focus:border-teal-500 transition-colors"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-xs text-stone-400 mb-1.5">密码</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="输入密码..."
              autoComplete="current-password"
              required
              className="w-full bg-stone-900 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 text-sm placeholder:text-stone-600 focus:outline-none focus:border-teal-500 transition-colors"
            />
          </div>
          {error && (
            <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full bg-teal-600 hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors"
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
      </div>
    </div>
  )
}
