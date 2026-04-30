import { Card } from '@/components/ui/Card'
import { useNavigate, useParams } from 'react-router-dom'

export default function Questionnaire() {
  const { tradeId } = useParams<{ tradeId: string }>()
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
        <h1 className="text-lg font-medium text-stone-100">决策问卷</h1>
      </div>
      <Card>
        <p className="text-xs text-stone-600 mb-2">Trade ID: {tradeId}</p>
        <p className="text-sm text-stone-500">问卷填写界面 — Phase 1 实现</p>
      </Card>
    </div>
  )
}
