import request from 'supertest'
import app from '../src/server'

describe('API', () => {
  it('health', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('create and list entries', async () => {
    const payload = {
      timestampMinute: new Date().toISOString(),
      bristolType: 4,
      smellScore: 3,
      color: 'brown',
      volume: 'medium',
      symptoms: [],
      notes: 'test'
    }
    const post = await request(app).post('/entries').set('x-user-id','demo').send(payload)
    expect(post.status).toBe(201)
    const list = await request(app).get('/entries').set('x-user-id','demo')
    expect(list.status).toBe(200)
    expect(Array.isArray(list.body)).toBe(true)
    expect(list.body.length).toBeGreaterThan(0)
  })

  it('analytics frequency and score', async () => {
    const freq = await request(app).get('/analytics/frequency?period=week').set('x-user-id','demo')
    expect(freq.status).toBe(200)
    expect(freq.body.period).toBe('week')
    const score = await request(app).get('/analytics/score').set('x-user-id','demo')
    expect(score.status).toBe(200)
    expect(typeof score.body.score).toBe('number')
  })

  it('alerts', async () => {
    const res = await request(app).get('/alerts').set('x-user-id','demo')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('privacy export and delete', async () => {
    const exp = await request(app).post('/privacy/export').set('x-user-id','demo')
    expect(exp.status).toBe(200)
    const del = await request(app).post('/privacy/delete').set('x-user-id','demo')
    expect(del.status).toBe(200)
  })
})