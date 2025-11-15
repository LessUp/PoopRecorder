import request from 'supertest'
import app from '../src/server'

describe('Auth middleware invalid token', () => {
  it('falls back when token invalid', async () => {
    const res = await request(app).get('/entries').set('Authorization', 'Bearer invalid.token.here')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })
})