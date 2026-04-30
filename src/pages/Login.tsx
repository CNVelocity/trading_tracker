import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '@/lib/api'
import { setToken } from '@/lib/auth'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function Login() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const token = await login(password)
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
            <rect x="23" y="9"  width="6" height="36" rx="2" fill="currentColor" />
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
          <Input
            label="访问密码"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="输入密码..."
            autoFocus
            error={error}
            required
          />
          <Button type="submit" loading={loading} className="w-full">
            登录
          </Button>
        </form>
      </div>
    </div>
  )
}
