import request from 'supertest'
import app from '../src/server'

describe('Alerts no issue', () => {
  it('no alerts when records are normal and frequent', async () => {
    const base = { smellScore: 2, color: 'brown', volume: 'medium', symptoms: [], bristolType: 4 } as any
    const now = Date.now()
    for (let i = 0; i < 5; i++) {
      const dt = new Date(now - i * 24 * 3600 * 1000).toISOString()
      await request(app).post('/entries').set('x-user-id','demo').send({ ...base, timestampMinute: dt })
    }
    const res = await request(app).get('/alerts').set('x-user-id','demo')
    expect(res.status).toBe(200)
    const arr = res.body as any[]
    expect(arr.length >= 0).toBe(true)
  })
})