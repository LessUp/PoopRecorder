import TrendChart from '../components/TrendChart'
import { useEffect, useMemo, useState } from 'react'
const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3001'

export default function Analysis({ token }: { token?: string }) {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const labels = useMemo(() => Object.keys(counts).sort(), [counts])
  useEffect(() => {
    fetch(`${API_BASE}/analytics/frequency?period=week`, { headers: token ? { 'Authorization': `Bearer ${token}` } : { 'x-user-id': 'demo' } })
      .then(r => r.json()).then(d => setCounts(d.counts || {})).catch(() => {})
  }, [token])
  return (
    <div>
      <h2>分析仪表盘</h2>
      <TrendChart counts={counts} />
      <p>数据点：{labels.length}</p>
    </div>
  )
}