import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3001'

export default function Settings() {
  const { token } = useAuth()
  const [settings, setSettings] = useState({
    theme: 'light',
    language: 'zh-CN',
    notifications: true,
    autoSync: true,
    offlineMode: true,
    defaultReminder: true,
    reminderTime: '09:00',
    dataRetention: 'forever'
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('app-settings')
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings))
    }
  }, [])

  const saveSettings = async () => {
    setSaving(true)
    setMessage('')
    
    try {
      // Save to localStorage
      localStorage.setItem('app-settings', JSON.stringify(settings))
      
      // If user is logged in, try to save to server
      if (token) {
        try {
          const response = await fetch(`${API_BASE}/settings`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(settings)
          })
          
          if (!response.ok) {
            throw new Error('Failed to save server settings')
          }
        } catch (error) {
          console.warn('Failed to save settings to server:', error)
        }
      }
      
      setMessage('设置已保存成功！')
    } catch (error) {
      console.error('Failed to save settings:', error)
      setMessage('保存设置失败，请重试')
    } finally {
      setSaving(false)
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const resetSettings = () => {
    if (confirm('确定要重置所有设置吗？')) {
      const defaultSettings = {
        theme: 'light',
        language: 'zh-CN',
        notifications: true,
        autoSync: true,
        offlineMode: true,
        defaultReminder: true,
        reminderTime: '09:00',
        dataRetention: 'forever'
      }
      setSettings(defaultSettings)
      localStorage.setItem('app-settings', JSON.stringify(defaultSettings))
      setMessage('设置已重置为默认值')
    }
  }

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'poop-recorder-settings.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const importedSettings = JSON.parse(e.target?.result as string)
        setSettings(importedSettings)
        localStorage.setItem('app-settings', JSON.stringify(importedSettings))
        setMessage('设置导入成功！')
      } catch (error) {
        alert('导入失败：文件格式不正确')
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-fade-in pb-20">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">设置</h2>
        {message && (
          <div className="px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium animate-fade-in">
            {message}
          </div>
        )}
      </div>

      {/* 外观设置 */}
      <div className="card bg-white dark:bg-gray-800">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">外观设置</h3>
        <div className="space-y-4">
          <div>
            <label className="label">主题</label>
            <select
              value={settings.theme}
              onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
              className="input"
            >
              <option value="light">浅色主题</option>
              <option value="dark">深色主题</option>
              <option value="auto">自动跟随系统</option>
            </select>
          </div>

          <div>
            <label className="label">语言</label>
            <select
              value={settings.language}
              onChange={(e) => setSettings({ ...settings, language: e.target.value })}
              className="input"
            >
              <option value="zh-CN">简体中文</option>
              <option value="en-US">English</option>
            </select>
          </div>
        </div>
      </div>

      {/* 通知设置 */}
      <div className="card bg-white dark:bg-gray-800">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">通知设置</h3>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100">启用通知</label>
              <p className="text-xs text-gray-500 dark:text-gray-400">接收健康提醒和分析报告</p>
            </div>
            <button
              type="button"
              onClick={() => setSettings({ ...settings, notifications: !settings.notifications })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                settings.notifications ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.notifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100">每日提醒</label>
              <p className="text-xs text-gray-500 dark:text-gray-400">每天提醒您记录健康数据</p>
            </div>
            <button
              type="button"
              onClick={() => setSettings({ ...settings, defaultReminder: !settings.defaultReminder })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                settings.defaultReminder ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.defaultReminder ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {settings.defaultReminder && (
            <div className="animate-fade-in">
              <label className="label">提醒时间</label>
              <input
                type="time"
                value={settings.reminderTime}
                onChange={(e) => setSettings({ ...settings, reminderTime: e.target.value })}
                className="input"
              />
            </div>
          )}
        </div>
      </div>

      {/* 数据同步 */}
      <div className="card bg-white dark:bg-gray-800">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">数据同步</h3>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100">自动同步</label>
              <p className="text-xs text-gray-500 dark:text-gray-400">网络可用时自动同步数据</p>
            </div>
            <button
              type="button"
              onClick={() => setSettings({ ...settings, autoSync: !settings.autoSync })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                settings.autoSync ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.autoSync ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100">离线模式</label>
              <p className="text-xs text-gray-500 dark:text-gray-400">优先使用本地存储，减少网络请求</p>
            </div>
            <button
              type="button"
              onClick={() => setSettings({ ...settings, offlineMode: !settings.offlineMode })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                settings.offlineMode ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.offlineMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 数据管理 */}
      <div className="card bg-white dark:bg-gray-800">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">数据管理</h3>
        <div className="space-y-4">
          <div>
            <label className="label">数据保留期限</label>
            <select
              value={settings.dataRetention}
              onChange={(e) => setSettings({ ...settings, dataRetention: e.target.value })}
              className="input"
            >
              <option value="forever">永久保留</option>
              <option value="1year">1年</option>
              <option value="6months">6个月</option>
              <option value="3months">3个月</option>
              <option value="1month">1个月</option>
            </select>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={exportSettings}
              className="btn btn-secondary flex-1"
            >
              📤 导出设置
            </button>
            <label className="btn btn-secondary flex-1 cursor-pointer">
              📥 导入设置
              <input
                type="file"
                accept=".json"
                onChange={importSettings}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex flex-col sm:flex-row gap-4 pt-4">
        <button
          onClick={saveSettings}
          disabled={saving}
          className="btn btn-primary flex-1 shadow-lg shadow-blue-600/20 disabled:shadow-none"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              保存中...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              💾 保存设置
            </span>
          )}
        </button>
        
        <button
          onClick={resetSettings}
          className="btn btn-secondary text-red-600 hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-900/20 dark:hover:border-red-800"
        >
          重置所有设置
        </button>
      </div>
    </div>
  )
}