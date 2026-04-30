import { Card } from '@/components/ui/Card'
import { useNavigate } from 'react-router-dom'

export default function NewTrade() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="text-stone-500 hover:text-stone-300 transition-colors text-sm"
        >
          ← 返回
        </button>
        <h1 className="text-lg font-medium text-stone-100">新建交易</h1>
      </div>
      <Card>
        <p className="text-sm text-stone-500">交易录入表单 — Phase 1 实现</p>
      </Card>
    </div>
  )
}
