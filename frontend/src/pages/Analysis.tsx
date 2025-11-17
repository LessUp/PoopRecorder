import TrendChart from '../components/TrendChart'
import { useEffect, useMemo, useState } from 'react'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3001'

export default function Analysis({ token }: { token?: string }) {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [healthScore, setHealthScore] = useState<number | null>(null)
  const [alerts, setAlerts] = useState<any[]>([])
  const [bristolData, setBristolData] = useState<Record<number, number>>({})
  const [colorData, setColorData] = useState<Record<string, number>>({})
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter'>('week')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAnalytics()
  }, [token, period])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      
      // Fetch frequency data
      const freqRes = await fetch(`${API_BASE}/analytics/frequency?period=${period}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : { 'x-user-id': 'demo' }
      })
      if (freqRes.ok) {
        const freqData = await freqRes.json()
        setCounts(freqData.counts || {})
      }
      
      // Fetch health score
      const scoreRes = await fetch(`${API_BASE}/analytics/score`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : { 'x-user-id': 'demo' }
      })
      if (scoreRes.ok) {
        const scoreData = await scoreRes.json()
        setHealthScore(scoreData.score)
      }
      
      // Fetch alerts
      const alertsRes = await fetch(`${API_BASE}/alerts`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : { 'x-user-id': 'demo' }
      })
      if (alertsRes.ok) {
        const alertsData = await alertsRes.json()
        setAlerts(alertsData)
      }
      
      // Fetch entries for detailed analysis
      const entriesRes = await fetch(`${API_BASE}/entries`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : { 'x-user-id': 'demo' }
      })
      if (entriesRes.ok) {
        const entries = await entriesRes.json()
        analyzeEntries(entries)
      }
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const analyzeEntries = (entries: any[]) => {
    // Analyze Bristol types
    const bristolCounts: Record<number, number> = {}
    const colorCounts: Record<string, number> = {}
    
    entries.forEach(entry => {
      bristolCounts[entry.bristolType] = (bristolCounts[entry.bristolType] || 0) + 1
      colorCounts[entry.color] = (colorCounts[entry.color] || 0) + 1
    })
    
    setBristolData(bristolCounts)
    setColorData(colorCounts)
  }

  const getHealthStatus = (score: number | null) => {
    if (score === null) return { status: '未知', color: 'text-gray-500', bg: 'bg-gray-100' }
    if (score >= 80) return { status: '优秀', color: 'text-green-600', bg: 'bg-green-100' }
    if (score >= 60) return { status: '良好', color: 'text-blue-600', bg: 'bg-blue-100' }
    if (score >= 40) return { status: '一般', color: 'text-yellow-600', bg: 'bg-yellow-100' }
    return { status: '需要改善', color: 'text-red-600', bg: 'bg-red-100' }
  }

  const healthStatus = getHealthStatus(healthScore)

  const bristolChartData = {
    labels: ['1型', '2型', '3型', '4型', '5型', '6型', '7型'],
    datasets: [{
      label: '记录次数',
      data: [1, 2, 3, 4, 5, 6, 7].map(type => bristolData[type] || 0),
      backgroundColor: [
        '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#10b981', '#06b6d4'
      ],
      borderColor: [
        '#dc2626', '#ea580c', '#d97706', '#65a30d', '#16a34a', '#059669', '#0891b2'
      ],
      borderWidth: 1
    }]
  }

  const colorChartData = {
    labels: Object.keys(colorData).map(color => {
      const colorNames: Record<string, string> = {
        brown: '棕色', dark_brown: '深棕色', yellow: '黄色', 
        green: '绿色', black: '黑色', red: '红色'
      }
      return colorNames[color] || color
    }),
    datasets: [{
      label: '记录次数',
      data: Object.values(colorData),
      backgroundColor: [
        '#a16207', '#92400e', '#ca8a04', '#16a34a', '#171717', '#dc2626'
      ],
      borderWidth: 1
    }]
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Bristol类型分布'
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  }

  const colorChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: '颜色分布'
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">加载分析数据中...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 控制面板 */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">健康分析</h2>
          <div className="flex space-x-2">
            {(['week', 'month', 'quarter'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-md ${
                  period === p 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {p === 'week' ? '周' : p === 'month' ? '月' : '季度'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 健康评分卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`card ${healthStatus.bg}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">健康评分</h3>
              <div className="text-3xl font-bold">
                {healthScore ?? '--'}
              </div>
              <div className={`text-sm ${healthStatus.color}`}>
                {healthStatus.status}
              </div>
            </div>
            <div className="w-16 h-16 bg-white bg-opacity-50 rounded-full flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
          </div>
        </div>

        <div className="card bg-blue-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-blue-800">记录天数</h3>
              <div className="text-3xl font-bold text-blue-600">
                {Object.keys(counts).length}
              </div>
              <div className="text-sm text-blue-600">
                {period === 'week' ? '最近7天' : period === 'month' ? '最近30天' : '最近90天'}
              </div>
            </div>
            <div className="w-16 h-16 bg-blue-200 rounded-full flex items-center justify-center">
              <span className="text-2xl">📅</span>
            </div>
          </div>
        </div>

        <div className="card bg-orange-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-orange-800">健康提醒</h3>
              <div className="text-3xl font-bold text-orange-600">
                {alerts.length}
              </div>
              <div className="text-sm text-orange-600">
                需要关注
              </div>
            </div>
            <div className="w-16 h-16 bg-orange-200 rounded-full flex items-center justify-center">
              <span className="text-2xl">⚠️</span>
            </div>
          </div>
        </div>
      </div>

      {/* 趋势图表 */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">
          {period === 'week' ? '7天' : period === 'month' ? '30天' : '90天'}排便趋势
        </h3>
        {Object.keys(counts).length > 0 ? (
          <TrendChart counts={counts} />
        ) : (
          <div className="text-gray-500 text-center py-8">
            暂无趋势数据
          </div>
        )}
      </div>

      {/* 数据分析图表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Bristol类型分布</h3>
          {Object.keys(bristolData).length > 0 ? (
            <div style={{ height: 300 }}>
              <Bar data={bristolChartData} options={chartOptions} />
            </div>
          ) : (
            <div className="text-gray-500 text-center py-8">
              暂无Bristol类型数据
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4">颜色分布</h3>
          {Object.keys(colorData).length > 0 ? (
            <div style={{ height: 300 }}>
              <Bar data={colorChartData} options={colorChartOptions} />
            </div>
          ) : (
            <div className="text-gray-500 text-center py-8">
              暂无颜色数据
            </div>
          )}
        </div>
      </div>

      {/* 健康建议 */}
      {alerts.length > 0 && (
        <div className="card bg-yellow-50 border border-yellow-200">
          <h3 className="text-lg font-semibold text-yellow-800 mb-3">健康建议</h3>
          <div className="space-y-2">
            {alerts.map((alert, index) => (
              <div key={index} className="flex items-start space-x-2">
                <span className="text-yellow-600">💡</span>
                <div>
                  <div className="font-medium text-yellow-800">{alert.type === 'constipation' ? '便秘提醒' : '腹泻提醒'}</div>
                  <div className="text-yellow-700">{alert.message}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 分析说明 */}
      <div className="card bg-gray-50">
        <h3 className="text-lg font-semibold mb-3">分析说明</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <p>• <strong>Bristol评分:</strong> 1-2型可能表示便秘，3-4型为正常，5-7型可能表示腹泻</p>
          <p>• <strong>健康评分:</strong> 综合考虑排便频率稳定性、Bristol类型中位数、气味强度等因素</p>
          <p>• <strong>趋势分析:</strong> 观察排便模式的变化，及时发现异常情况</p>
          <p>• <strong>颜色分析:</strong> 正常为棕色，其他颜色可能反映饮食或健康状况变化</p>
        </div>
      </div>
    </div>
  )
}