import { useState } from 'react'
import { encryptNotes } from '../crypto'
import { addQueue } from '../idb'

const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3001'

type Volume = 'small' | 'medium' | 'large'
type Color = 'brown' | 'dark_brown' | 'yellow' | 'green' | 'black' | 'red'
type Symptom = 'bloating' | 'abdominal_pain' | 'nausea' | 'urgency' | 'constipation'

const bristolTypes = [
  { type: 1, description: '分离的硬块，像坚果', emoji: '💩' },
  { type: 2, description: '香肠状，但表面凹凸不平', emoji: '🌭' },
  { type: 3, description: '像香肠，但表面有裂缝', emoji: '🥖' },
  { type: 4, description: '像香肠或蛇，光滑柔软', emoji: '🐍' },
  { type: 5, description: '边缘清晰的软斑点', emoji: '🍪' },
  { type: 6, description: '边缘模糊，呈蓬松状', emoji: '☁️' },
  { type: 7, description: '水状，无固体块，完全液体', emoji: '💧' }
]

const colorOptions = [
  { value: 'brown', name: '棕色', class: 'bg-amber-600' },
  { value: 'dark_brown', name: '深棕色', class: 'bg-amber-800' },
  { value: 'yellow', name: '黄色', class: 'bg-yellow-500' },
  { value: 'green', name: '绿色', class: 'bg-green-500' },
  { value: 'black', name: '黑色', class: 'bg-gray-900' },
  { value: 'red', name: '红色', class: 'bg-red-500' }
]

const symptomOptions: { value: Symptom; label: string; emoji: string }[] = [
  { value: 'bloating', label: '腹胀', emoji: '🎈' },
  { value: 'abdominal_pain', label: '腹痛', emoji: '😣' },
  { value: 'nausea', label: '恶心', emoji: '🤢' },
  { value: 'urgency', label: '急迫感', emoji: '⏰' },
  { value: 'constipation', label: '便秘', emoji: '🚫' }
]

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
  const [showBristolHelp, setShowBristolHelp] = useState(false)
  const [saving, setSaving] = useState(false)

  async function submit() {
    setSaving(true)
    try {
      const payload: any = { ...form }
      if (secure.enabled && payload.notes) {
        payload.notes = await encryptNotes(secure.pass || '', payload.notes, 'salt')
      }
      
      try {
        await fetch(`${API_BASE}/entries`, {
          method: 'POST', 
          headers: { 
            'Content-Type': 'application/json', 
            ...(token ? { 'Authorization': `Bearer ${token}` } : { 'x-user-id': 'demo' }) 
          }, 
          body: JSON.stringify(payload)
        })
        onSaved()
        // Reset form
        setForm({
          timestampMinute: new Date().toISOString().slice(0, 16),
          bristolType: 4,
          smellScore: 3,
          color: 'brown',
          volume: 'medium',
          symptoms: [],
          notes: ''
        })
      } catch {
        await addQueue({ id: Math.random().toString(36).slice(2), payload })
        onSaved()
      }
    } catch (error) {
      console.error('Failed to save record:', error)
      alert('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  const toggleSymptom = (symptom: Symptom) => {
    setForm(f => ({
      ...f,
      symptoms: f.symptoms.includes(symptom)
        ? f.symptoms.filter(s => s !== symptom)
        : [...f.symptoms, symptom]
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">记录健康数据</h2>
        <button
          onClick={() => setShowBristolHelp(!showBristolHelp)}
          className="px-4 py-2 bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200"
        >
          Bristol类型说明
        </button>
      </div>

      {/* Bristol类型说明 */}
      {showBristolHelp && (
        <div className="card bg-blue-50 border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-800 mb-4">Bristol大便分类法</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bristolTypes.map((type) => (
              <div 
                key={type.type} 
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  form.bristolType === type.type 
                    ? 'border-blue-500 bg-blue-100' 
                    : 'border-gray-200 bg-white hover:border-blue-300'
                }`}
                onClick={() => setForm({ ...form, bristolType: type.type as any })}
              >
                <div className="flex items-center space-x-3 mb-2">
                  <span className="text-2xl">{type.emoji}</span>
                  <div className="font-semibold">{type.type}型</div>
                </div>
                <div className="text-sm text-gray-600">{type.description}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              <strong>健康提示:</strong> 3-4型为正常，1-2型可能表示便秘，5-7型可能表示腹泻。
              如果持续出现异常类型，建议咨询医生。
            </p>
          </div>
        </div>
      )}

      {/* 记录表单 */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              记录时间 <span className="text-red-500">*</span>
            </label>
            <input 
              type="datetime-local" 
              value={form.timestampMinute} 
              onChange={e => setForm({ ...form, timestampMinute: e.target.value })} 
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Bristol类型 <span className="text-red-500">*</span>
            </label>
            <select 
              value={form.bristolType} 
              onChange={e => setForm({ ...form, bristolType: Number(e.target.value) as any })} 
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              {bristolTypes.map(type => (
                <option key={type.type} value={type.type}>
                  {type.type}型 - {type.description}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              气味强度 <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              <input 
                type="range" 
                min="1" 
                max="5" 
                value={form.smellScore} 
                onChange={e => setForm({ ...form, smellScore: Number(e.target.value) as any })} 
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-600">
                <span>1 (轻微)</span>
                <span className="font-medium">{form.smellScore}/5</span>
                <span>5 (强烈)</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              颜色 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {colorOptions.map(color => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setForm({ ...form, color: color.value as any })}
                  className={`flex items-center space-x-2 p-2 rounded-md border-2 transition-all ${
                    form.color === color.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full ${color.class}`}></div>
                  <span className="text-sm">{color.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              排便量 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'small', label: '小', icon: '🥜' },
                { value: 'medium', label: '中', icon: '🥚' },
                { value: 'large', label: '大', icon: '🍗' }
              ].map(volume => (
                <button
                  key={volume.value}
                  type="button"
                  onClick={() => setForm({ ...form, volume: volume.value as any })}
                  className={`flex items-center space-x-2 p-2 rounded-md border-2 transition-all ${
                    form.volume === volume.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span>{volume.icon}</span>
                  <span className="text-sm">{volume.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">伴随症状</label>
            <div className="space-y-2">
              {symptomOptions.map(symptom => (
                <label key={symptom.value} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.symptoms.includes(symptom.value)}
                    onChange={() => toggleSymptom(symptom.value)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">{symptom.emoji} {symptom.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium mb-2">备注</label>
          <textarea 
            value={form.notes} 
            onChange={e => setForm({ ...form, notes: e.target.value })} 
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="记录其他相关信息，如饮食、运动、情绪等..."
          />
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="encrypt-notes"
              checked={secure.enabled}
              onChange={e => setSecure({ ...secure, enabled: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="encrypt-notes" className="text-sm font-medium">
              加密备注内容
            </label>
          </div>
          
          {secure.enabled && (
            <div>
              <label className="block text-sm font-medium mb-1">加密密码</label>
              <input
                type="password"
                placeholder="输入加密密码"
                value={secure.pass || ''}
                onChange={e => setSecure({ ...secure, pass: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                密码将用于加密您的备注内容，请妥善保管
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={submit}
            disabled={saving}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>保存中...</span>
              </>
            ) : (
              <>
                <span>💾</span>
                <span>保存记录</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}