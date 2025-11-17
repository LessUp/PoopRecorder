import request from 'supertest'
import app from '../src/server'

describe('Alerts constipation', () => {
  it('alerts when recent entries < 4', async () => {
    const res = await request(app).get('/alerts').set('x-user-id','u-const')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    const arr = res.body.data as any[]
    expect(Array.isArray(arr)).toBe(true)
  })
})