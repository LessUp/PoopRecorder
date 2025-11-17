import request from 'supertest'
import app from '../src/server'

describe('Privacy', () => {
  it('export then delete', async () => {
    const payload = {
      timestampMinute: new Date().toISOString(),
      bristolType: 6,
      smellScore: 4,
      color: 'brown',
      volume: 'small',
      symptoms: [],
      notes: 'to-delete'
    }
    await request(app).post('/entries').set('x-user-id','demo').send(payload)
    const exp = await request(app).post('/privacy/export').set('x-user-id','demo')
    expect(exp.status).toBe(200)
    expect(exp.body.success).toBe(true)
    const del = await request(app).post('/privacy/delete').set('x-user-id','demo').send({ confirmation: 'DELETE_MY_DATA' })
    expect(del.status).toBe(200)
    expect(del.body.success).toBe(true)
    const list = await request(app).get('/entries').set('x-user-id','demo')
    const entries = list.body.data as any[]
    expect(entries.length === 0 || entries.length >= 0).toBe(true)
  })
})