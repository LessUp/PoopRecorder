import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3001'

export default function Login() {
  const [email, setEmail] = useState('user@example.com')
  const [password, setPassword] = useState('pass12345')
  const [isRegistering, setIsRegistering] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function doAuth(isReg: boolean) {
    try {
      const endpoint = isReg ? '/auth/register' : '/auth/login'
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      
      if (isReg && res.ok) {
        // If registered successfully, automatically login
        await doAuth(false)
        return
      }

      if (res.ok) {
        const data = await res.json()
        login(data.token, email)
        navigate('/')
      } else {
        alert(isReg ? '注册失败' : '登录失败')
      }
    } catch (error) {
      console.error('Auth error:', error)
      alert('网络错误')
    }
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="card">
        <h2 className="text-2xl font-bold mb-6 text-center">
          {isRegistering ? '注册账号' : '登录'}
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="label">邮箱</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          
          <div>
            <label className="label">密码</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          
          <div className="flex flex-col gap-3 mt-6">
            <button
              className="btn btn-primary w-full py-3"
              onClick={() => doAuth(isRegistering)}
            >
              {isRegistering ? '注册并登录' : '登录'}
            </button>
            
            <button
              className="text-sm text-gray-600 dark:text-gray-400 hover:underline text-center"
              onClick={() => setIsRegistering(!isRegistering)}
            >
              {isRegistering ? '已有账号？去登录' : '没有账号？去注册'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
