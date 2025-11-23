import { useEffect, useState } from 'react'
import { listEntries as idbListEntries } from '../idb'
import { useAuth } from '../contexts/AuthContext'
import { StoolEntry } from '../types'

const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3001'

export default function History() {
  const { token } = useAuth()
  const [entries, setEntries] = useState<StoolEntry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<StoolEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    bristolType: '',
    color: '',
    symptoms: ''
  })

  useEffect(() => {
    loadEntries()
  }, [token])

  useEffect(() => {
    applyFilters()
  }, [entries, filters])

  const loadEntries = async () => {
    try {
      setLoading(true)
      const localEntries = await idbListEntries()
      
      // Try to fetch from server as well
      try {
        const response = await fetch(`${API_BASE}/entries`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : { 'x-user-id': 'demo' }
        })
        if (response.ok) {
          const serverEntries = await response.json()
          // Merge server entries with local ones, server takes precedence
          const mergedEntries = [...localEntries]
          serverEntries.forEach((serverEntry: any) => {
            const exists = mergedEntries.find(local => local.id === serverEntry.id)
            if (!exists) {
              mergedEntries.push(serverEntry)
            }
          })
          setEntries(mergedEntries.sort((a, b) => 
            new Date(b.timestampMinute).getTime() - new Date(a.timestampMinute).getTime()
          ))
        } else {
          setEntries(localEntries.sort((a, b) => 
            new Date(b.timestampMinute).getTime() - new Date(a.timestampMinute).getTime()
          ))
        }
      } catch (error) {
        console.warn('Failed to fetch server entries:', error)
        setEntries(localEntries.sort((a, b) => 
          new Date(b.timestampMinute).getTime() - new Date(a.timestampMinute).getTime()
        ))
      }
    } catch (error) {
      console.error('Failed to load entries:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...entries]

    if (filters.startDate) {
      filtered = filtered.filter(entry => 
        new Date(entry.timestampMinute) >= new Date(filters.startDate)
      )
    }

    if (filters.endDate) {
      filtered = filtered.filter(entry => 
        new Date(entry.timestampMinute) <= new Date(filters.endDate + 'T23:59:59')
      )
    }

    if (filters.bristolType) {
      filtered = filtered.filter(entry => 
        entry.bristolType === parseInt(filters.bristolType)
      )
    }

    if (filters.color) {
      filtered = filtered.filter(entry => 
        entry.color === filters.color
      )
    }

    if (filters.symptoms) {
      filtered = filtered.filter(entry => 
        entry.symptoms.some(symptom => 
          symptom.toLowerCase().includes(filters.symptoms.toLowerCase())
        )
      )
    }

    setFilteredEntries(filtered)
  }

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      bristolType: '',
      color: '',
      symptoms: ''
    })
  }

  const deleteEntry = async (id: string) => {
    if (!confirm('确定要删除这条记录吗？')) return
    
    try {
      // Delete from server if available
      if (token) {
        await fetch(`${API_BASE}/entries/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        })
      }
      
      // Delete from local storage logic would go here (not implemented in provided idb.ts yet?)
      // For now just reload to reflect server changes if online
      await loadEntries()
    } catch (error) {
      console.error('Failed to delete entry:', error)
      alert('删除失败')
    }
  }

  const getBristolDescription = (type: number) => {
    const descriptions = {
      1: '分离的硬块，像坚果（难以通过）',
      2: '香肠状，但表面凹凸不平',
      3: '像香肠，但表面有裂缝',
      4: '像香肠或蛇，光滑柔软',
      5: '边缘清晰的软斑点',
      6: '边缘模糊，呈蓬松状',
      7: '水状，无固体块，完全液体'
    }
    return descriptions[type as keyof typeof descriptions] || '未知'
  }

  const getColorDisplay = (color: string) => {
    const colorMap: Record<string, { name: string; class: string }> = {
      brown: { name: '棕色', class: 'bg-[#8B4513]' },
      dark_brown: { name: '深棕色', class: 'bg-[#654321]' },
      yellow: { name: '黄色', class: 'bg-[#DAA520]' },
      green: { name: '绿色', class: 'bg-[#228B22]' },
      black: { name: '黑色', class: 'bg-[#000000]' },
      red: { name: '红色', class: 'bg-[#DC143C]' }
    }
    return colorMap[color] || { name: color, class: 'bg-gray-400' }
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
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">历史记录</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            共 {filteredEntries.length} 条记录
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card bg-white dark:bg-gray-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <span>🔍</span> 筛选条件
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="label">开始日期</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">结束日期</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">Bristol类型</label>
            <select
              value={filters.bristolType}
              onChange={(e) => setFilters({ ...filters, bristolType: e.target.value })}
              className="input"
            >
              <option value="">全部</option>
              {[1,2,3,4,5,6,7].map(type => (
                <option key={type} value={type}>{type}型</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">颜色</label>
            <select
              value={filters.color}
              onChange={(e) => setFilters({ ...filters, color: e.target.value })}
              className="input"
            >
              <option value="">全部</option>
              <option value="brown">棕色</option>
              <option value="dark_brown">深棕色</option>
              <option value="yellow">黄色</option>
              <option value="green">绿色</option>
              <option value="black">黑色</option>
              <option value="red">红色</option>
            </select>
          </div>
          <div>
            <label className="label">症状</label>
            <input
              type="text"
              placeholder="搜索症状..."
              value={filters.symptoms}
              onChange={(e) => setFilters({ ...filters, symptoms: e.target.value })}
              className="input"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={clearFilters}
            className="btn btn-secondary"
          >
            清除筛选
          </button>
          <button
            onClick={loadEntries}
            className="btn btn-primary"
          >
            刷新数据
          </button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        {filteredEntries.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-gray-500">没有找到符合条件的记录</p>
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <div key={entry.id} className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold
                    ${entry.bristolType <= 2 ? 'bg-red-100 text-red-700' : 
                      entry.bristolType >= 6 ? 'bg-yellow-100 text-yellow-700' : 
                      'bg-green-100 text-green-700'}`}>
                    B{entry.bristolType}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {new Date(entry.timestampMinute).toLocaleString('zh-CN', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {getBristolDescription(entry.bristolType)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => deleteEntry(entry.id)}
                  className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                  title="删除"
                >
                  🗑️
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-4">
                <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">气味强度</span>
                  <div className="font-medium text-gray-900 dark:text-gray-100">{entry.smellScore}/5</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">颜色</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getColorDisplay(entry.color).class}`}></div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{getColorDisplay(entry.color).name}</span>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">排便量</span>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {entry.volume === 'small' ? '少' : entry.volume === 'medium' ? '中' : '多'}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">症状</span>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {entry.symptoms.length === 0 ? '无' : `${entry.symptoms.length} 种`}
                  </div>
                </div>
              </div>

              {entry.symptoms.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {entry.symptoms.map((symptom, index) => (
                    <span key={index} className="px-2 py-1 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-xs rounded-md border border-red-100 dark:border-red-800">
                      {symptom}
                    </span>
                  ))}
                </div>
              )}

              {entry.notes && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <div className="text-sm text-gray-600 dark:text-gray-300 bg-yellow-50 dark:bg-yellow-900/10 p-3 rounded-lg italic">
                    "{entry.notes}"
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}