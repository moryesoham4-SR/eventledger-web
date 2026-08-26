import { createContext, useContext, useState, useEffect } from 'react'
import * as authApi from '../api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedUser = sessionStorage.getItem('user')
    const token = sessionStorage.getItem('access_token')
    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser))
      } catch {
        // Corrupted/invalid sessionStorage value — clear it and fall back to
        // logged-out rather than crashing the whole app on load.
        sessionStorage.removeItem('user')
        sessionStorage.removeItem('access_token')
      }
    }
    setLoading(false)
  }, [])

  const doLogin = async (email, password) => {
    const data = await authApi.login(email, password)
    sessionStorage.setItem('access_token', data.access_token)
    sessionStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
    return data
  }

  const doRegister = async (name, email, password, orgName) => {
    const data = await authApi.register(name, email, password, orgName)
    const newUser = { id: data.user_id, name, email, org_name: orgName, is_super_admin: false }
    sessionStorage.setItem('access_token', data.access_token)
    sessionStorage.setItem('user', JSON.stringify(newUser))
    setUser(newUser)
    return data
  }

  const loginWithToken = (token, userObj) => {
    sessionStorage.setItem('access_token', token)
    sessionStorage.setItem('user', JSON.stringify(userObj))
    setUser(userObj)
  }

  const logout = () => {
    sessionStorage.removeItem('access_token')
    sessionStorage.removeItem('user')
    setUser(null)
  }

  /** Merges a partial update (e.g. after saving Settings) into the cached
   * user, both in memory and in sessionStorage, so the sidebar/avatar reflect
   * it immediately instead of only after the next login. */
  const updateUser = (partial) => {
    setUser((u) => {
      if (!u) return u
      const next = { ...u, ...partial }
      try {
        sessionStorage.setItem('user', JSON.stringify(next))
      } catch {
        // ignore write failures (private browsing, etc.)
      }
      return next
    })
  }

  return (
    <AuthContext.Provider value={{ user, loading, login: doLogin, register: doRegister, loginWithToken, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
