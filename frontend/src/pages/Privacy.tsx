import { useAuth } from '../contexts/AuthContext'

const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3001'

export default function Privacy() {
  const { token } = useAuth()

  async function doExport() {
    try {
      const res = await fetch(`${API_BASE}/privacy/export`, { 
        method: 'POST', 
        headers: token ? { 'Authorization': `Bearer ${token}` } : { 'x-user-id': 'demo' } 
      })
      if (res.ok) {
        const data = await res.json()
        alert('导出条目数：' + (data.entries?.length || 0))
      } else {
        alert('导出失败')
      }
    } catch (error) {
      alert('网络错误')
    }
  }

  async function doDelete() {
    if (!confirm('⚠️ 警告：此操作将永久删除您的所有数据，无法恢复！\n\n确定要继续吗？')) {
      return
    }
    
    try {
      const res = await fetch(`${API_BASE}/privacy/delete`, { 
        method: 'POST', 
        headers: token ? { 'Authorization': `Bearer ${token}` } : { 'x-user-id': 'demo' } 
      })
      if (res.ok) {
        const data = await res.json()
        alert('删除状态：' + data.status)
      } else {
        alert('删除失败')
      }
    } catch (error) {
      alert('网络错误')
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">隐私管理</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">管理您的个人数据和隐私选项</p>
      </div>

      <div className="card bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">数据导出</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          您可以随时导出您的所有健康记录数据。导出的数据将以 JSON 格式提供，包含您所有的历史记录、备注和设置信息。
        </p>
        <button 
          className="btn btn-secondary w-full sm:w-auto" 
          onClick={doExport}
        >
          📤 导出我的数据
        </button>
      </div>

      <div className="card bg-white dark:bg-gray-800 border border-red-100 dark:border-red-900/30">
        <h3 className="text-lg font-semibold mb-4 text-red-600 dark:text-red-400">危险区域</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          删除数据是不可逆的操作。一旦删除，您的所有记录都将永久丢失。请谨慎操作。
        </p>
        <button 
          className="btn bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:text-red-400 dark:border-red-800 w-full sm:w-auto" 
          onClick={doDelete}
        >
          🗑️ 删除所有数据
        </button>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-100 dark:border-blue-800">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">隐私承诺</h3>
        <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200 list-disc list-inside">
          <li>您的数据仅存储在本地或您授权的服务器上</li>
          <li>我们不会将您的健康数据出售给第三方</li>
          <li>您可以随时选择开启端到端加密来保护您的敏感备注</li>
          <li>完全离线模式下，数据只会保存在您的设备中</li>
        </ul>
      </div>
    </div>
  )
}