import TrendChart from '../components/TrendChart'
import { useEffect, useState } from 'react'
import { Bar } from 'react-chartjs-2'
import { useAuth } from '../contexts/AuthContext'
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

export default function Analysis() {
  const { token } = useAuth()
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
    if (score === null) return { status: '未知', color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-700' }
    if (score >= 80) return { status: '优秀', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' }
    if (score >= 60) return { status: '良好', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' }
    if (score >= 40) return { status: '一般', color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/30' }
    return { status: '需要改善', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' }
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
      borderRadius: 8,
      borderSkipped: false as const,
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
      borderRadius: 8,
    }]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(156, 163, 175, 0.1)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">健康分析</h2>
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          {(['week', 'month', 'quarter'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                period === p 
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {p === 'week' ? '本周' : p === 'month' ? '本月' : '本季度'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`card ${healthStatus.bg} border-none`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-80 text-gray-700 dark:text-gray-300">健康评分</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                  {healthScore ?? '--'}
                </span>
                <span className={`text-sm font-bold px-2 py-0.5 rounded-full bg-white/50 dark:bg-black/20 ${healthStatus.color}`}>
                  {healthStatus.status}
                </span>
              </div>
            </div>
            <div className="w-12 h-12 bg-white/50 dark:bg-black/10 rounded-full flex items-center justify-center text-2xl">
              📊
            </div>
          </div>
        </div>

        <div className="card bg-blue-50 dark:bg-blue-900/20 border-none">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">记录天数</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                  {Object.keys(counts).length}
                </span>
                <span className="text-sm text-blue-600 dark:text-blue-400 opacity-80">
                  {period === 'week' ? '最近7天' : period === 'month' ? '最近30天' : '最近90天'}
                </span>
              </div>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-800/50 rounded-full flex items-center justify-center text-2xl">
              📅
            </div>
          </div>
        </div>

        <div className="card bg-orange-50 dark:bg-orange-900/20 border-none">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-800 dark:text-orange-200">健康提醒</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-orange-700 dark:text-orange-300">
                  {alerts.length}
                </span>
                <span className="text-sm text-orange-600 dark:text-orange-400 opacity-80">
                  需要关注
                </span>
              </div>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-800/50 rounded-full flex items-center justify-center text-2xl">
              ⚠️
            </div>
          </div>
        </div>
      </div>

      {/* Main Trend Chart */}
      <div className="card">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-6">
          {period === 'week' ? '7天' : period === 'month' ? '30天' : '90天'}排便趋势
        </h3>
        <div className="h-[300px] w-full">
          {Object.keys(counts).length > 0 ? (
            <TrendChart counts={counts} />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
              暂无趋势数据
            </div>
          )}
        </div>
      </div>

      {/* Analysis Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-6">Bristol 类型分布</h3>
          <div className="h-[300px]">
            {Object.keys(bristolData).length > 0 ? (
              <Bar data={bristolChartData} options={chartOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                暂无 Bristol 类型数据
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-6">颜色分布</h3>
          <div className="h-[300px]">
            {Object.keys(colorData).length > 0 ? (
              <Bar data={colorChartData} options={chartOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                暂无颜色数据
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Health Advice */}
      {alerts.length > 0 && (
        <div className="card bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800">
          <h3 className="text-lg font-bold text-yellow-800 dark:text-yellow-200 mb-4">健康建议</h3>
          <div className="space-y-3">
            {alerts.map((alert, index) => (
              <div key={index} className="flex items-start gap-3 bg-white dark:bg-gray-800 p-3 rounded-lg border border-yellow-100 dark:border-yellow-900/50 shadow-sm">
                <span className="text-xl">💡</span>
                <div>
                  <div className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                    {alert.type === 'constipation' ? '便秘提醒' : '腹泻提醒'}
                  </div>
                  <div className="text-sm text-yellow-800 dark:text-yellow-200/80 leading-relaxed">
                    {alert.message}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend/Info */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">指标说明</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex gap-2">
            <span className="font-bold text-gray-900 dark:text-gray-200">Bristol:</span>
            <span>1-2型可能表示便秘，3-4型为正常，5-7型可能表示腹泻</span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold text-gray-900 dark:text-gray-200">健康评分:</span>
            <span>综合考虑排便频率、形状、气味等因素的综合指标</span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold text-gray-900 dark:text-gray-200">趋势分析:</span>
            <span>帮助您发现长期的肠道健康规律</span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold text-gray-900 dark:text-gray-200">颜色分析:</span>
            <span>正常大便通常为棕色，持续异常颜色需引起注意</span>
          </div>
        </div>
      </div>
    </div>
  );
}