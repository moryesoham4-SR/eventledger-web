import { createContext, useContext, useState, useEffect } from 'react'
import * as authApi from '../api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    const token = localStorage.getItem('access_token')
    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser))
      } catch {
        // Corrupted/invalid localStorage value — clear it and fall back to
        // logged-out rather than crashing the whole app on load.
        localStorage.removeItem('user')
        localStorage.removeItem('access_token')
      }
    }
    setLoading(false)
  }, [])

  const doLogin = async (email, password) => {
    const data = await authApi.login(email, password)
    localStorage.setItem('access_token', data.access_token)
    localStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
    return data
  }

  const doRegister = async (name, email, password, orgName) => {
    const data = await authApi.register(name, email, password, orgName)
    const newUser = { id: data.user_id, name, email, org_name: orgName, is_super_admin: false }
    localStorage.setItem('access_token', data.access_token)
    localStorage.setItem('user', JSON.stringify(newUser))
    setUser(newUser)
    return data
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login: doLogin, register: doRegister, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
