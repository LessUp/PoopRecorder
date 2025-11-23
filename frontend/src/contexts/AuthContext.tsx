import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface AuthState {
  token?: string
  email?: string
}

interface AuthContextType extends AuthState {
  login: (token: string, email: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(() => {
    const raw = localStorage.getItem('auth')
    return raw ? JSON.parse(raw) : {}
  })

  const login = (token: string, email: string) => {
    localStorage.setItem('auth', JSON.stringify({ token, email }))
    setAuth({ token, email })
  }

  const logout = () => {
    localStorage.removeItem('auth')
    setAuth({})
  }

  return (
    <AuthContext.Provider value={{ ...auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
