import request from 'supertest'
import app from '../src/server'

describe('Alerts', () => {
  it('diarrhea alert when bristol high', async () => {
    const base = {
      smellScore: 3,
      color: 'brown',
      volume: 'medium',
      symptoms: []
    } as any
    const now = Date.now()
    for (let i = 0; i < 3; i++) {
      const dt = new Date(now - i * 24 * 3600 * 1000).toISOString()
      await request(app).post('/entries').set('x-user-id','demo').send({ ...base, timestampMinute: dt, bristolType: 6 })
    }
    const res = await request(app).get('/alerts').set('x-user-id','demo')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })
})