import { useEffect, useMemo, useState } from 'react'
import { addEntry as idbAddEntry, listEntries as idbListEntries, addQueue, drainQueue } from './idb'
import { encryptNotes } from './crypto'
import TrendChart from './components/TrendChart'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Record from './pages/Record'
import History from './pages/History'
import Analysis from './pages/Analysis'
import Settings from './pages/Settings'
import Privacy from './pages/Privacy'

type Volume = 'small' | 'medium' | 'large'
type Color = 'brown' | 'dark_brown' | 'yellow' | 'green' | 'black' | 'red'
type Symptom = 'bloating' | 'abdominal_pain' | 'nausea' | 'urgency' | 'constipation'

type StoolEntry = {
  id: string
  timestampMinute: string
  bristolType: 1 | 2 | 3 | 4 | 5 | 6 | 7
  smellScore: 1 | 2 | 3 | 4 | 5
  color: Color
  volume: Volume
  symptoms: Symptom[]
  notes?: string
}

function uuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function useLocalEntries() {
  const [entries, setEntries] = useState<StoolEntry[]>([])
  useEffect(() => { idbListEntries().then(setEntries) }, [])
  return {
    entries,
    async add(e: StoolEntry) {
      await idbAddEntry(e)
      setEntries(prev => [e, ...prev])
    }
  }
}

const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3001'

export default function App() {
  const { entries, add } = useLocalEntries()
  const [auth, setAuth] = useState<{ token?: string; email?: string }>(() => {
    const raw = localStorage.getItem('auth')
    return raw ? JSON.parse(raw) : {}
  })
  const [secure, setSecure] = useState<{ enabled: boolean; pass?: string }>({ enabled: false })
  const [form, setForm] = useState<Omit<StoolEntry, 'id'>>({
    timestampMinute: new Date().toISOString().slice(0, 16),
    bristolType: 4,
    smellScore: 3,
    color: 'brown',
    volume: 'medium',
    symptoms: []
  })

  const weeklyTrend = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const e of entries) {
      const d = e.timestampMinute.slice(0, 10)
      counts[d] = (counts[d] || 0) + 1
    }
    return counts
  }, [entries])

  const hasConstipationAlert = useMemo(() => {
    const days = [...new Set(entries.map(e => e.timestampMinute.slice(0,10)))].sort()
    if (days.length === 0) return false
    // 简化：按日期字符串间隔估计，真实实现应按日期差
    let streak = 0
    for (let i = 1; i < days.length; i++) {
      const prev = days[i-1]
      const curr = days[i]
      if (prev === curr) continue
      // 如果中间有一天没有记录，计入空窗；这里用简化近似
      // 为避免复杂计算，使用最近7天是否有≥3天无记录的近似判断
    }
    // 简化：如果最近7天记录数小于4，视为风险提示
    const recent = entries.filter(e => Date.now() - new Date(e.timestampMinute).getTime() < 7*24*3600_000)
    return recent.length < 4
  }, [entries])

  async function submit() {
    const entry: StoolEntry = { id: uuid(), ...form }
    await add(entry)
    setForm(f => ({ ...f, notes: '' }))
    try {
      const payload = { ...form }
      if (secure.enabled && payload.notes) {
        payload.notes = await encryptNotes(secure.pass || '', payload.notes, auth.email || 'salt')
      }
      await fetch(`${API_BASE}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(auth.token ? { 'Authorization': `Bearer ${auth.token}` } : { 'x-user-id': 'demo' }) },
        body: JSON.stringify(payload)
      })
    } catch {
      await addQueue({ id: uuid(), payload: form })
    }
}

function Login({ onAuthed }: { onAuthed: (token: string, email: string) => void }) {
  const [email, setEmail] = useState('user@example.com')
  const [password, setPassword] = useState('pass12345')
  async function doRegister() {
    await fetch(`${API_BASE}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
    await doLogin()
  }
  async function doLogin() {
    const res = await fetch(`${API_BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
    if (res.ok) {
      const data = await res.json()
      onAuthed(data.token, email)
    } else {
      alert('登录失败')
    }
  }
  return (
    <div className="grid">
      <label>
        邮箱
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
      </label>
      <label>
        密码
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
      </label>
      <div style={{ gridColumn: '1 / span 2' }}>
        <button className="btn" onClick={doLogin}>登录</button>
        <button className="btn" onClick={doRegister}>注册并登录</button>
      </div>
    </div>
  )
}

  return (
    <div className="container">
      <h1>肠道健康管理平台（MVP）</h1>
      <section className="card" style={{ marginBottom: 12 }}>
        <h2>登录</h2>
        {auth.token ? (
          <div>
            已登录：{auth.email}
            <button className="btn" onClick={() => { localStorage.removeItem('auth'); setAuth({}) }}>退出登录</button>
          </div>
        ) : (
          <Login onAuthed={(token, email) => { localStorage.setItem('auth', JSON.stringify({ token, email })); setAuth({ token, email }) }} />
        )}
      </section>
      <BrowserRouter>
        <nav className="card" style={{ marginBottom: 12 }}>
          <Link className="btn" to="/">首页</Link>
          <Link className="btn" to="/record">记录</Link>
          <Link className="btn" to="/history">历史</Link>
          <Link className="btn" to="/analysis">分析</Link>
          <Link className="btn" to="/settings">设置</Link>
          <Link className="btn" to="/privacy">隐私</Link>
        </nav>
        <Routes>
          <Route path="/" element={<Home token={auth.token} />} />
          <Route path="/record" element={<Record token={auth.token} onSaved={() => {}} />} />
          <Route path="/history" element={<History token={auth.token} />} />
          <Route path="/analysis" element={<Analysis token={auth.token} />} />
          <Route path="/settings" element={<Settings token={auth.token} />} />
          <Route path="/privacy" element={<Privacy token={auth.token} />} />
        </Routes>
      </BrowserRouter>

      <section>
        <h2>近期趋势（周）</h2>
        <TrendChart counts={weeklyTrend} />
        <button className="btn" onClick={async () => {
          try {
            const res = await fetch(`${API_BASE}/analytics/frequency?period=week`, { headers: auth.token ? { 'Authorization': `Bearer ${auth.token}` } : { 'x-user-id': 'demo' } })
            const data = await res.json()
            alert('服务器统计天数：' + Object.keys(data.counts).length)
          } catch {
            alert('离线模式：显示本地趋势')
          }
        }}>从服务器获取趋势</button>
        <button className="btn" onClick={async () => {
          await drainQueue(async (payload) => {
            await fetch(`${API_BASE}/entries`, {
              method: 'POST', headers: { 'Content-Type': 'application/json', ...(auth.token ? { 'Authorization': `Bearer ${auth.token}` } : { 'x-user-id': 'demo' }) }, body: JSON.stringify(payload)
            })
          })
          alert('已尝试同步离线队列')
        }} style={{ marginLeft: 8 }}>同步离线队列</button>
      </section>

      <section>
        <h2>预警</h2>
        {hasConstipationAlert ? (
          <div style={{ padding: 12, background: '#fff3cd', border: '1px solid #ffeeba' }}>
            连续低频可能存在便秘风险，请关注饮食与水分摄入。
          </div>
        ) : (
          <div>暂无异常预警</div>
        )}
      </section>

      
    </div>
  )
}
