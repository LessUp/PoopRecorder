import request from 'supertest'
import app from '../src/server'

describe('Score empty dataset', () => {
  it('returns score with no entries', async () => {
    const res = await request(app).get('/analytics/score').set('x-user-id','u-empty')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.score).toBe(null)
  })
})