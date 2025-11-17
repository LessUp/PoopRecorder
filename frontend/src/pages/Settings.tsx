import { useState, useEffect } from 'react'

const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3001'

export default function Settings({ token }: { token?: string }) {
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">设置</h2>
        {message && (
          <div className="px-4 py-2 bg-green-100 text-green-800 rounded-md">
            {message}
          </div>
        )}
      </div>

      {/* 外观设置 */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">外观设置</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">主题</label>
            <select
              value={settings.theme}
              onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="light">浅色主题</option>
              <option value="dark">深色主题</option>
              <option value="auto">自动</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">语言</label>
            <select
              value={settings.language}
              onChange={(e) => setSettings({ ...settings, language: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="zh-CN">简体中文</option>
              <option value="en-US">English</option>
            </select>
          </div>
        </div>
      </div>

      {/* 通知设置 */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">通知设置</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium">启用通知</label>
              <p className="text-xs text-gray-500">接收健康提醒和分析报告</p>
            </div>
            <button
              type="button"
              onClick={() => setSettings({ ...settings, notifications: !settings.notifications })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.notifications ? 'bg-blue-600' : 'bg-gray-200'
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
              <label className="text-sm font-medium">每日提醒</label>
              <p className="text-xs text-gray-500">每天提醒您记录健康数据</p>
            </div>
            <button
              type="button"
              onClick={() => setSettings({ ...settings, defaultReminder: !settings.defaultReminder })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.defaultReminder ? 'bg-blue-600' : 'bg-gray-200'
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
            <div>
              <label className="block text-sm font-medium mb-2">提醒时间</label>
              <input
                type="time"
                value={settings.reminderTime}
                onChange={(e) => setSettings({ ...settings, reminderTime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* 数据同步 */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">数据同步</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium">自动同步</label>
              <p className="text-xs text-gray-500">网络可用时自动同步数据</p>
            </div>
            <button
              type="button"
              onClick={() => setSettings({ ...settings, autoSync: !settings.autoSync })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.autoSync ? 'bg-blue-600' : 'bg-gray-200'
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
              <label className="text-sm font-medium">离线模式</label>
              <p className="text-xs text-gray-500">支持离线记录和查看</p>
            </div>
            <button
              type="button"
              onClick={() => setSettings({ ...settings, offlineMode: !settings.offlineMode })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.offlineMode ? 'bg-blue-600' : 'bg-gray-200'
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
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">数据管理</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">数据保留期限</label>
            <select
              value={settings.dataRetention}
              onChange={(e) => setSettings({ ...settings, dataRetention: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="forever">永久保留</option>
              <option value="1year">1年</option>
              <option value="6months">6个月</option>
              <option value="3months">3个月</option>
              <option value="1month">1个月</option>
            </select>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={exportSettings}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              导出设置
            </button>
            <label className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 cursor-pointer">
              导入设置
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
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">操作</h3>
        <div className="flex space-x-4">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>保存中...</span>
              </>
            ) : (
              <>
                <span>💾</span>
                <span>保存设置</span>
              </>
            )}
          </button>
          
          <button
            onClick={resetSettings}
            className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            重置设置
          </button>
        </div>
      </div>
    </div>
  )
}