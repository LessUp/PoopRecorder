import request from 'supertest'
import app from '../src/server'

describe('Auth', () => {
  const email = 'test@example.com'
  const password = 'TestPass123'
  it('register and login', async () => {
    const reg = await request(app).post('/auth/register').send({ email, password })
    expect([200,201]).toContain(reg.status)
    expect(reg.body.success).toBe(true)
    const res = await request(app).post('/auth/login').send({ email, password })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(typeof res.body.data.token).toBe('string')
    const token = res.body.data.token
    const payload = {
      timestampMinute: new Date().toISOString(),
      bristolType: 4,
      smellScore: 3,
      color: 'brown',
      volume: 'medium',
      symptoms: [],
      notes: 'secure'
    }
    const post = await request(app).post('/entries').set('Authorization', `Bearer ${token}`).send(payload)
    expect(post.status).toBe(201)
    expect(post.body.success).toBe(true)
    const list = await request(app).get('/entries').set('Authorization', `Bearer ${token}`)
    expect(list.status).toBe(200)
    expect(Array.isArray(list.body.data)).toBe(true)
  })
})