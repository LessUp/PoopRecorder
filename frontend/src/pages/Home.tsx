import { useEffect, useState } from 'react'
import { listEntries as idbListEntries } from '../idb'
import TrendChart from '../components/TrendChart'

const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3001'

type StoolEntry = {
  id: string
  timestampMinute: string
  bristolType: 1 | 2 | 3 | 4 | 5 | 6 | 7
  smellScore: 1 | 2 | 3 | 4 | 5
  color: string
  volume: string
  symptoms: string[]
  notes?: string
}

export default function Home({ token }: { token?: string }) {
  const [entries, setEntries] = useState<StoolEntry[]>([])
  const [healthScore, setHealthScore] = useState<number | null>(null)
  const [alerts, setAlerts] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [token])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load local entries from IndexedDB
      const localEntries = await idbListEntries()
      setEntries(localEntries)
      
      // Fetch health score from server
      try {
        const scoreRes = await fetch(`${API_BASE}/analytics/score`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : { 'x-user-id': 'demo' }
        })
        if (scoreRes.ok) {
          const scoreData = await scoreRes.json()
          setHealthScore(scoreData.score)
        }
      } catch (error) {
        console.warn('Failed to fetch health score:', error)
      }
      
      // Fetch alerts from server
      try {
        const alertsRes = await fetch(`${API_BASE}/alerts`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : { 'x-user-id': 'demo' }
        })
        if (alertsRes.ok) {
          const alertsData = await alertsRes.json()
          setAlerts(alertsData.map((alert: any) => alert.message))
        }
      } catch (error) {
        console.warn('Failed to fetch alerts:', error)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const recentEntries = entries.slice(0, 3)
  const weeklyTrend = entries.reduce((acc: Record<string, number>, entry) => {
    const date = entry.timestampMinute.slice(0, 10)
    acc[date] = (acc[date] || 0) + 1
    return acc
  }, {})

  const completionRate = () => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      return date.toISOString().slice(0, 10)
    })
    
    const recordedDays = last7Days.filter(day => 
      entries.some(entry => entry.timestampMinute.startsWith(day))
    ).length
    
    return Math.round((recordedDays / 7) * 100)
  }

  const getHealthStatus = (score: number | null) => {
    if (score === null) return { status: '未知', color: 'text-gray-500' }
    if (score >= 80) return { status: '优秀', color: 'text-green-600' }
    if (score >= 60) return { status: '良好', color: 'text-blue-600' }
    if (score >= 40) return { status: '一般', color: 'text-yellow-600' }
    return { status: '需要改善', color: 'text-red-600' }
  }

  const healthStatus = getHealthStatus(healthScore)

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 健康概览面板 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-gradient-to-br from-green-50 to-green-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-green-800">健康评分</h3>
              <div className="text-3xl font-bold text-green-600">
                {healthScore ?? '--'}
              </div>
              <div className={`text-sm ${healthStatus.color}`}>
                {healthStatus.status}
              </div>
            </div>
            <div className="w-16 h-16 bg-green-200 rounded-full flex items-center justify-center">
              <span className="text-2xl">💚</span>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-blue-800">记录完成度</h3>
              <div className="text-3xl font-bold text-blue-600">
                {completionRate()}%
              </div>
              <div className="text-sm text-blue-600">最近7天</div>
            </div>
            <div className="w-16 h-16 bg-blue-200 rounded-full flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-orange-50 to-orange-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-orange-800">异常提醒</h3>
              <div className="text-3xl font-bold text-orange-600">
                {alerts.length}
              </div>
              <div className="text-sm text-orange-600">需要关注</div>
            </div>
            <div className="w-16 h-16 bg-orange-200 rounded-full flex items-center justify-center">
              <span className="text-2xl">⚠️</span>
            </div>
          </div>
        </div>
      </div>

      {/* 异常提醒 */}
      {alerts.length > 0 && (
        <div className="card bg-yellow-50 border border-yellow-200">
          <h3 className="text-lg font-semibold text-yellow-800 mb-3">健康提醒</h3>
          <div className="space-y-2">
            {alerts.map((alert, index) => (
              <div key={index} className="flex items-start space-x-2">
                <span className="text-yellow-600">⚠️</span>
                <span className="text-yellow-700">{alert}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 最近记录 */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">最近记录</h3>
        {recentEntries.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            暂无记录，开始记录您的健康数据吧！
          </div>
        ) : (
          <div className="space-y-3">
            {recentEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium">{entry.bristolType}</span>
                  </div>
                  <div>
                    <div className="font-medium">
                      {new Date(entry.timestampMinute).toLocaleDateString('zh-CN')}
                    </div>
                    <div className="text-sm text-gray-600">
                      Bristol: {entry.bristolType} | 气味: {entry.smellScore} | 颜色: {entry.color}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">
                    {entry.symptoms.length > 0 && `症状: ${entry.symptoms.length}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 趋势图表 */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">7天趋势</h3>
        {Object.keys(weeklyTrend).length > 0 ? (
          <TrendChart counts={weeklyTrend} />
        ) : (
          <div className="text-gray-500 text-center py-8">
            暂无趋势数据
          </div>
        )}
      </div>

      {/* 快速操作 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <a href="#/record" className="card bg-green-50 hover:bg-green-100 transition-colors cursor-pointer block">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center">
              <span className="text-2xl">➕</span>
            </div>
            <div>
              <h4 className="font-semibold text-green-800">快速记录</h4>
              <p className="text-sm text-green-600">记录今天的健康数据</p>
            </div>
          </div>
        </a>
        
        <a href="#/analysis" className="card bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer block">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center">
              <span className="text-2xl">📈</span>
            </div>
            <div>
              <h4 className="font-semibold text-blue-800">详细分析</h4>
              <p className="text-sm text-blue-600">查看健康趋势和建议</p>
            </div>
          </div>
        </a>
      </div>
    </div>
  )
}