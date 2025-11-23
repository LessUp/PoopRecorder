import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { encryptNotes } from '../crypto'
import { addQueue } from '../idb'
import { useAuth } from '../contexts/AuthContext'

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

export default function Record() {
  const { token } = useAuth()
  const navigate = useNavigate()
  
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
        const res = await fetch(`${API_BASE}/entries`, {
          method: 'POST', 
          headers: { 
            'Content-Type': 'application/json', 
            ...(token ? { 'Authorization': `Bearer ${token}` } : { 'x-user-id': 'demo' }) 
          }, 
          body: JSON.stringify(payload)
        })
        
        if (!res.ok) throw new Error('Network response was not ok')
        
        navigate('/history')
      } catch {
        await addQueue({ id: Math.random().toString(36).slice(2), payload })
        navigate('/history')
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
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">记录健康数据</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">记录每一次排便情况，关注肠道健康</p>
        </div>
        <button
          onClick={() => setShowBristolHelp(!showBristolHelp)}
          className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
        >
          {showBristolHelp ? '隐藏说明' : 'Bristol说明'}
        </button>
      </div>

      {/* Bristol类型说明 */}
      {showBristolHelp && (
        <div className="card bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800 animate-fade-in">
          <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-4">Bristol大便分类法</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bristolTypes.map((type) => (
              <div 
                key={type.type} 
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  form.bristolType === type.type 
                    ? 'border-blue-500 bg-blue-100 dark:bg-blue-800/50' 
                    : 'border-white/50 dark:border-gray-700 bg-white/80 dark:bg-gray-800 hover:border-blue-300'
                }`}
                onClick={() => setForm({ ...form, bristolType: type.type as any })}
              >
                <div className="flex items-center space-x-3 mb-2">
                  <span className="text-3xl">{type.emoji}</span>
                  <div className="font-bold text-gray-900 dark:text-white">{type.type}型</div>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">{type.description}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>💡 健康提示:</strong> 3-4型为正常，1-2型可能表示便秘，5-7型可能表示腹泻。
            </p>
          </div>
        </div>
      )}

      {/* 记录表单 */}
      <div className="card bg-white dark:bg-gray-800">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* 左侧：基本信息 */}
          <div className="space-y-6">
            <div>
              <label className="label">
                记录时间 <span className="text-red-500">*</span>
              </label>
              <input 
                type="datetime-local" 
                value={form.timestampMinute} 
                onChange={e => setForm({ ...form, timestampMinute: e.target.value })} 
                className="input"
                required
              />
            </div>

            <div>
              <label className="label">
                Bristol类型 <span className="text-red-500">*</span>
              </label>
              <select 
                value={form.bristolType} 
                onChange={e => setForm({ ...form, bristolType: Number(e.target.value) as any })} 
                className="input"
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
              <label className="label">
                排便量 <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'small', label: '小', icon: '🥜' },
                  { value: 'medium', label: '中', icon: '🥚' },
                  { value: 'large', label: '大', icon: '🍗' }
                ].map(volume => (
                  <button
                    key={volume.value}
                    type="button"
                    onClick={() => setForm({ ...form, volume: volume.value as any })}
                    className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${
                      form.volume === volume.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span className="text-2xl mb-1">{volume.icon}</span>
                    <span className="text-sm font-medium">{volume.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 右侧：详细特征 */}
          <div className="space-y-6">
            <div>
              <label className="label">
                颜色 <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                {colorOptions.map(color => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setForm({ ...form, color: color.value as any })}
                    className={`flex items-center space-x-2 p-2 rounded-lg border-2 transition-all ${
                      form.color === color.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full border border-black/10 ${color.class}`}></div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{color.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">
                气味强度 (1-5) <span className="text-red-500">*</span>
              </label>
              <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl">
                <input 
                  type="range" 
                  min="1" 
                  max="5" 
                  value={form.smellScore} 
                  onChange={e => setForm({ ...form, smellScore: Number(e.target.value) as any })} 
                  className="w-full accent-blue-600 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
                <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mt-2">
                  <span>🌸 轻微</span>
                  <span className="font-bold text-blue-600">{form.smellScore}</span>
                  <span>🤢 强烈</span>
                </div>
              </div>
            </div>

            <div>
              <label className="label">伴随症状</label>
              <div className="flex flex-wrap gap-2">
                {symptomOptions.map(symptom => (
                  <button
                    key={symptom.value}
                    type="button"
                    onClick={() => toggleSymptom(symptom.value)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                      form.symptoms.includes(symptom.value)
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {symptom.emoji} {symptom.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-700">
          <label className="label">备注</label>
          <textarea 
            value={form.notes} 
            onChange={e => setForm({ ...form, notes: e.target.value })} 
            rows={3}
            className="input"
            placeholder="记录其他相关信息，如饮食、运动、情绪等..."
          />
        </div>

        <div className="mt-6 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl">
          <div className="flex items-center space-x-2 mb-4">
            <input
              type="checkbox"
              id="encrypt-notes"
              checked={secure.enabled}
              onChange={e => setSecure({ ...secure, enabled: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
            />
            <label htmlFor="encrypt-notes" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
              启用备注加密
            </label>
          </div>
          
          {secure.enabled && (
            <div className="animate-fade-in">
              <input
                type="password"
                placeholder="设置加密密码"
                value={secure.pass || ''}
                onChange={e => setSecure({ ...secure, pass: e.target.value })}
                className="input"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
                <span>🔒</span>
                密码将用于加密您的备注内容，请务必牢记
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 flex justify-end gap-4">
          <button
            onClick={() => navigate(-1)}
            className="btn btn-secondary"
          >
            取消
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="btn btn-primary min-w-[120px] shadow-lg shadow-blue-600/20"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                保存中...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                💾 保存记录
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}