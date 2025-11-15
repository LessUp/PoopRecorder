import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { createEntry, listEntries, deleteAllForUser } from './repo'
import { authMiddleware, login, register } from './auth'

type Volume = 'small' | 'medium' | 'large'
type Color = 'brown' | 'dark_brown' | 'yellow' | 'green' | 'black' | 'red'

type StoolEntry = {
  id: string
  userId: string
  timestampMinute: string
  bristolType: 1 | 2 | 3 | 4 | 5 | 6 | 7
  smellScore: 1 | 2 | 3 | 4 | 5
  color: Color
  volume: Volume
  symptoms: string[]
  notes?: string
  createdAt: string
  updatedAt: string
  version: number
}

const app = express()
app.use(cors())
app.use(express.json())
app.use(authMiddleware)

app.get('/health', (_, res) => res.json({ ok: true }))

app.get('/entries', (req, res) => {
  const userId = (req as any).userId || (req.headers['x-user-id'] as string) || 'demo'
  listEntries(userId).then(rows => res.json(rows))
})

app.post('/entries', (req, res) => {
  const userId = (req as any).userId || (req.headers['x-user-id'] as string) || 'demo'
  const body = req.body || {}
  createEntry(userId, body).then(entry => res.status(201).json(entry))
})

app.get('/analytics/frequency', (req, res) => {
  const userId = (req as any).userId || (req.headers['x-user-id'] as string) || 'demo'
  const period = (req.query.period as string) || 'week'
  listEntries(userId).then(data => {
    const counts: Record<string, number> = {}
    for (const e of data) {
      const t = typeof e.timestampMinute === 'string' ? new Date(e.timestampMinute) : e.timestampMinute
      const day = new Date(t).toISOString().slice(0,10)
      counts[day] = (counts[day] || 0) + 1
    }
    res.json({ period, counts })
  })
})

app.get('/analytics/score', (req, res) => {
  const userId = (req as any).userId || (req.headers['x-user-id'] as string) || 'demo'
  listEntries(userId).then(rows => {
    const now = Date.now()
    const last30 = rows.filter(e => now - new Date(e.timestampMinute as any).getTime() < 30*24*3600_000)
    const days = new Map<string, number>()
    for (const e of last30) {
      const d = new Date(e.timestampMinute as any).toISOString().slice(0,10)
      days.set(d, (days.get(d) || 0) + 1)
    }
    const freq = Array.from(days.values())
    const avg = freq.reduce((a,b)=>a+b,0) / (freq.length || 1)
    const variance = freq.reduce((a,b)=>a + (b-avg)*(b-avg), 0) / (freq.length || 1)
    const bristol = last30.map(e => e.bristolType)
    const median = bristol.sort((a,b)=>a-b)[Math.floor(bristol.length/2)] || 4
    const smellAvg = last30.reduce((a,e)=>a+e.smellScore,0) / (last30.length || 1)
    let score = 100
    score -= Math.min(40, variance*10)
    score -= Math.abs((median||4) - 4) * 10
    score -= Math.max(0, smellAvg - 3) * 10
    res.json({ score: Math.max(0, Math.min(100, Math.round(score))) })
  })
})

app.get('/alerts', (req, res) => {
  const userId = (req as any).userId || (req.headers['x-user-id'] as string) || 'demo'
  listEntries(userId).then(rows => {
    const recent = rows.filter(e => Date.now() - new Date(e.timestampMinute as any).getTime() < 7*24*3600_000)
    const alerts = [] as { type: string; message: string }[]
    if (recent.length < 4) {
      alerts.push({ type: 'constipation', message: '最近一周记录较少，可能存在便秘风险' })
    }
    if (recent.filter(e => e.bristolType >= 6).length >= 3) {
      alerts.push({ type: 'diarrhea', message: '近期Bristol类型偏高，可能存在腹泻风险' })
    }
    res.json(alerts)
  })
})

app.post('/privacy/export', (req, res) => {
  const userId = (req as any).userId || (req.headers['x-user-id'] as string) || 'demo'
  listEntries(userId).then(rows => {
    res.json({ userId, entries: rows })
  })
})

app.post('/privacy/delete', (req, res) => {
  const userId = (req as any).userId || (req.headers['x-user-id'] as string) || 'demo'
  deleteAllForUser(userId).then(() => res.json({ userId, status: 'deleted' }))
})

const port = process.env.PORT || 3001
if (require.main === module) {
  app.listen(port, () => {
    console.log(`API server listening on http://localhost:${port}`)
  })
}
export default app
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await register(email, password)
    res.status(201).json({ id: user.id, email: user.email })
  } catch {
    res.status(400).json({ error: 'register_failed' })
  }
})

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const { token, user } = await login(email, password)
    res.json({ token, user: { id: user.id, email: user.email } })
  } catch {
    res.status(401).json({ error: 'invalid_credentials' })
  }
})
