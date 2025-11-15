const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3001'
export default function Privacy({ token }: { token?: string }) {
  async function doExport() {
    const res = await fetch(`${API_BASE}/privacy/export`, { method: 'POST', headers: token ? { 'Authorization': `Bearer ${token}` } : { 'x-user-id': 'demo' } })
    const data = await res.json()
    alert('导出条目数：' + (data.entries?.length || 0))
  }
  async function doDelete() {
    const res = await fetch(`${API_BASE}/privacy/delete`, { method: 'POST', headers: token ? { 'Authorization': `Bearer ${token}` } : { 'x-user-id': 'demo' } })
    const data = await res.json()
    alert('删除状态：' + data.status)
  }
  return (
    <div>
      <h2>隐私管理</h2>
      <button className="btn" onClick={doExport}>数据导出</button>
      <button className="btn" onClick={doDelete}>删除数据</button>
    </div>
  )
}