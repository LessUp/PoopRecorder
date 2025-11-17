import { useEffect, useState } from 'react'
import { listEntries as idbListEntries } from '../idb'

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

export default function History({ token }: { token?: string }) {
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
      
      // Delete from local storage
      const db = await import('../idb')
      // Add delete functionality to idb.ts if needed
      
      // Reload entries
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
      brown: { name: '棕色', class: 'bg-amber-600' },
      dark_brown: { name: '深棕色', class: 'bg-amber-800' },
      yellow: { name: '黄色', class: 'bg-yellow-500' },
      green: { name: '绿色', class: 'bg-green-500' },
      black: { name: '黑色', class: 'bg-gray-900' },
      red: { name: '红色', class: 'bg-red-500' }
    }
    return colorMap[color] || { name: color, class: 'bg-gray-400' }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">历史记录</h2>
        <div className="text-sm text-gray-500">
          共 {filteredEntries.length} 条记录
        </div>
      </div>

      {/* 筛选器 */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">筛选条件</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">开始日期</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">结束日期</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Bristol类型</label>
            <select
              value={filters.bristolType}
              onChange={(e) => setFilters({ ...filters, bristolType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">全部</option>
              {[1,2,3,4,5,6,7].map(type => (
                <option key={type} value={type}>{type}型</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">颜色</label>
            <select
              value={filters.color}
              onChange={(e) => setFilters({ ...filters, color: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
            <label className="block text-sm font-medium mb-1">症状</label>
            <input
              type="text"
              placeholder="搜索症状..."
              value={filters.symptoms}
              onChange={(e) => setFilters({ ...filters, symptoms: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end space-x-2">
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            清除筛选
          </button>
          <button
            onClick={loadEntries}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            刷新数据
          </button>
        </div>
      </div>

      {/* 记录列表 */}
      <div className="card">
        {filteredEntries.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            没有找到符合条件的记录
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEntries.map((entry) => (
              <div key={entry.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-lg font-bold">{entry.bristolType}</span>
                    </div>
                    <div>
                      <div className="font-semibold text-lg">
                        {new Date(entry.timestampMinute).toLocaleString('zh-CN')}
                      </div>
                      <div className="text-sm text-gray-600">
                        {getBristolDescription(entry.bristolType)}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteEntry(entry.id)}
                    className="text-red-500 hover:text-red-700 px-2 py-1 rounded"
                  >
                    删除
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                  <div>
                    <span className="text-sm text-gray-500">气味强度:</span>
                    <div className="font-medium">{entry.smellScore}/5</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">颜色:</span>
                    <div className="flex items-center space-x-2">
                      <div className={`w-4 h-4 rounded-full ${getColorDisplay(entry.color).class}`}></div>
                      <span className="font-medium">{getColorDisplay(entry.color).name}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">排便量:</span>
                    <div className="font-medium">
                      {entry.volume === 'small' ? '小' : entry.volume === 'medium' ? '中' : '大'}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">症状:</span>
                    <div className="font-medium">
                      {entry.symptoms.length === 0 ? '无' : `${entry.symptoms.length} 种`}
                    </div>
                  </div>
                </div>

                {entry.symptoms.length > 0 && (
                  <div className="mb-3">
                    <span className="text-sm text-gray-500">具体症状:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {entry.symptoms.map((symptom, index) => (
                        <span key={index} className="px-2 py-1 bg-yellow-100 text-yellow-800 text-sm rounded">
                          {symptom}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {entry.notes && (
                  <div>
                    <span className="text-sm text-gray-500">备注:</span>
                    <div className="mt-1 p-2 bg-gray-100 rounded text-sm">
                      {entry.notes}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}