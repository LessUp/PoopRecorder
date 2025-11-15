import { useState } from 'react'
import { encryptNotes } from '../crypto'
import { addQueue } from '../idb'

type Volume = 'small' | 'medium' | 'large'
type Color = 'brown' | 'dark_brown' | 'yellow' | 'green' | 'black' | 'red'
type Symptom = 'bloating' | 'abdominal_pain' | 'nausea' | 'urgency' | 'constipation'

const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3001'

export default function Record({ token, onSaved }: { token?: string; onSaved: () => void }) {
  const [form, setForm] = useState({
    timestampMinute: new Date().toISOString().slice(0, 16),
    bristolType: 4 as 1|2|3|4|5|6|7,
    smellScore: 3 as 1|2|3|4|5,
    color: 'brown' as Color,
    volume: 'medium' as Volume,
    symptoms: [] as Symptom[],
    notes: ''
  })
  const [secure, setSecure] = useState<{ enabled: boolean; pass?: string }>({ enabled: false })
  async function submit() {
    const payload: any = { ...form }
    if (secure.enabled && payload.notes) payload.notes = await encryptNotes(secure.pass || '', payload.notes, 'salt')
    try {
      await fetch(`${API_BASE}/entries`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : { 'x-user-id': 'demo' }) }, body: JSON.stringify(payload)
      })
      onSaved()
    } catch {
      await addQueue({ id: Math.random().toString(36).slice(2), payload })
      onSaved()
    }
  }
  return (
    <div>
      <h2>大便记录表单</h2>
      <div className="grid">
        <label>
          时间戳
          <input type="datetime-local" value={form.timestampMinute} onChange={e => setForm({ ...form, timestampMinute: e.target.value })} />
        </label>
        <label>
          Bristol类型
          <select value={form.bristolType} onChange={e => setForm({ ...form, bristolType: Number(e.target.value) as any })}>{[1,2,3,4,5,6,7].map(n => <option key={n} value={n}>{n}</option>)}</select>
        </label>
        <label>
          气味强度
          <select value={form.smellScore} onChange={e => setForm({ ...form, smellScore: Number(e.target.value) as any })}>{[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}</select>
        </label>
        <label>
          颜色
          <select value={form.color} onChange={e => setForm({ ...form, color: e.target.value as Color })}>{['brown','dark_brown','yellow','green','black','red'].map(c => <option key={c} value={c}>{c}</option>)}</select>
        </label>
        <label>
          排便量
          <select value={form.volume} onChange={e => setForm({ ...form, volume: e.target.value as Volume })}>{['small','medium','large'].map(v => <option key={v} value={v}>{v}</option>)}</select>
        </label>
        <fieldset style={{ gridColumn: '1 / span 2' }}>
          <legend>伴随症状</legend>
          {['bloating','abdominal_pain','nausea','urgency','constipation'].map(s => (
            <label key={s} style={{ marginRight: 12 }}>
              <input type="checkbox" checked={form.symptoms.includes(s as Symptom)} onChange={e => {
                const checked = e.target.checked
                setForm(f => ({ ...f, symptoms: checked ? [...f.symptoms, s as Symptom] : f.symptoms.filter(x => x !== s) }))
              }} /> {s}
            </label>
          ))}
        </fieldset>
        <label style={{ gridColumn: '1 / span 2' }}>
          备注
          <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
        </label>
      </div>
      <div style={{ marginTop: 8 }}>
        <label style={{ marginRight: 12 }}>
          <input type="checkbox" checked={secure.enabled} onChange={e => setSecure(s => ({ ...s, enabled: e.target.checked }))} /> 启用备注加密
        </label>
        {secure.enabled && (
          <input type="password" placeholder="设置加密口令" value={secure.pass || ''} onChange={e => setSecure(s => ({ ...s, pass: e.target.value }))} />
        )}
      </div>
      <button className="btn" style={{ marginTop: 12 }} onClick={submit}>保存记录</button>
    </div>
  )
}