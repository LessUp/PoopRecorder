import { useEffect, useState } from 'react'
import { listEntries as idbListEntries } from '../idb'
import TrendChart from '../components/TrendChart'
import { useAuth } from '../contexts/AuthContext'
import { StoolEntry } from '../types'
import { Link } from 'react-router-dom'

const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3001'

export default function Home() {
  const { token } = useAuth()
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
    if (score === null) return { status: '未知', color: 'text-gray-500', bg: 'bg-gray-100' }
    if (score >= 80) return { status: '优秀', color: 'text-green-600', bg: 'bg-green-100' }
    if (score >= 60) return { status: '良好', color: 'text-blue-600', bg: 'bg-blue-100' }
    if (score >= 40) return { status: '一般', color: 'text-yellow-600', bg: 'bg-yellow-100' }
    return { status: '需要改善', color: 'text-red-600', bg: 'bg-red-100' }
  }

  const healthStatus = getHealthStatus(healthScore)

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">健康概览</h1>
          <p className="text-gray-500 dark:text-gray-400">欢迎回来，今天感觉如何？</p>
        </div>
        <Link to="/record" className="btn btn-primary shadow-lg shadow-blue-600/20">
          <span className="mr-2">➕</span>
          记录一次
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-gradient-to-br from-white to-green-50 dark:from-gray-800 dark:to-green-900/20 border-green-100 dark:border-green-900">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">健康评分</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                  {healthScore ?? '--'}
                </span>
                <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${healthStatus.bg} ${healthStatus.color}`}>
                  {healthStatus.status}
                </span>
              </div>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
              <span className="text-2xl">💚</span>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-blue-900/20 border-blue-100 dark:border-blue-900">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">记录完成度</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                  {completionRate()}%
                </span>
                <span className="text-sm text-gray-500">最近7天</span>
              </div>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <span className="text-2xl">📊</span>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-white to-orange-50 dark:from-gray-800 dark:to-orange-900/20 border-orange-100 dark:border-orange-900">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">异常提醒</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                  {alerts.length}
                </span>
                <span className="text-sm text-gray-500">需要关注</span>
              </div>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
              <span className="text-2xl">⚠️</span>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xl">⚠️</span>
            <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">健康提醒</h3>
          </div>
          <div className="space-y-2 ml-8">
            {alerts.map((alert, index) => (
              <p key={index} className="text-sm text-yellow-700 dark:text-yellow-300">
                {alert}
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent History */}
        <div className="card h-full">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-gray-900 dark:text-gray-100">最近记录</h3>
            <Link to="/history" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              查看全部
            </Link>
          </div>
          
          {recentEntries.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📝</div>
              <p className="text-gray-500">暂无记录，开始第一条记录吧！</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentEntries.map((entry) => (
                <div key={entry.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border border-transparent hover:border-gray-100 dark:hover:border-gray-700">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold
                    ${entry.bristolType <= 2 ? 'bg-red-100 text-red-700' : 
                      entry.bristolType >= 6 ? 'bg-yellow-100 text-yellow-700' : 
                      'bg-green-100 text-green-700'}`}>
                    B{entry.bristolType}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {new Date(entry.timestampMinute).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {entry.symptoms.length > 0 && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                          {entry.symptoms.length} 症状
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate mt-0.5">
                      气味: {entry.smellScore} | 颜色: {entry.color}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Trend Chart */}
        <div className="card h-full">
          <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-6">7天趋势</h3>
          <div className="h-[300px] w-full">
            {Object.keys(weeklyTrend).length > 0 ? (
              <TrendChart counts={weeklyTrend} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                暂无趋势数据
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/analysis" className="card hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              📈
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">详细分析</h4>
              <p className="text-sm text-gray-500">查看长期健康趋势</p>
            </div>
          </div>
        </Link>
        
        <Link to="/settings" className="card hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 text-gray-600 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              ⚙️
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">偏好设置</h4>
              <p className="text-sm text-gray-500">管理通知和数据</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}