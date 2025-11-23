import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3001'

export default function Login() {
  const [email, setEmail] = useState('user@example.com')
  const [password, setPassword] = useState('pass12345')
  const [isRegistering, setIsRegistering] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function doAuth(isReg: boolean) {
    if (!email || !password) {
      alert('请输入邮箱和密码')
      return
    }
    
    setLoading(true)
    try {
      const endpoint = isReg ? '/auth/register' : '/auth/login'
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      
      if (isReg && res.ok) {
        // If registered successfully, automatically login
        const loginRes = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        })
        
        if (loginRes.ok) {
          const data = await loginRes.json()
          login(data.token, email)
          navigate('/')
        } else {
          alert('注册成功，但自动登录失败，请手动登录')
          setIsRegistering(false)
        }
        return
      }

      if (res.ok) {
        const data = await res.json()
        login(data.token, email)
        navigate('/')
      } else {
        const data = await res.json()
        alert(data.message || (isReg ? '注册失败' : '登录失败'))
      }
    } catch (error) {
      console.error('Auth error:', error)
      alert('网络错误，请检查服务器连接')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 animate-fade-in">
      <div className="card max-w-md w-full bg-white dark:bg-gray-800 shadow-xl border-0">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
            💩
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {isRegistering ? '创建新账号' : '欢迎回来'}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
            {isRegistering ? '开始记录您的健康数据' : '登录以查看您的健康记录'}
          </p>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="label">邮箱</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </div>
          
          <div>
            <label className="label">密码</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          
          <div className="flex flex-col gap-4 mt-8">
            <button
              className="btn btn-primary w-full py-3 shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-shadow"
              onClick={() => doAuth(isRegistering)}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  请稍候...
                </span>
              ) : (
                isRegistering ? '注册并登录' : '登录'
              )}
            </button>
            
            <button
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-center transition-colors"
              onClick={() => setIsRegistering(!isRegistering)}
            >
              {isRegistering ? (
                <span>已有账号？ <span className="text-blue-600 dark:text-blue-400 font-medium">去登录</span></span>
              ) : (
                <span>还没有账号？ <span className="text-blue-600 dark:text-blue-400 font-medium">立即注册</span></span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
