'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  checkAuth,
  login as apiLogin,
  logout as apiLogout,
  type DashboardRole,
  type DashboardUser,
} from './api'

interface AuthContext {
  isAuthenticated: boolean
  isLoading: boolean
  user: DashboardUser | null
  role: DashboardRole | null
  login: (email: string | undefined, password: string) => Promise<DashboardUser>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContext | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DashboardUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkAuth()
      .then((data) => setUser(data.authenticated ? data.user : null))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false))
  }, [])

  async function login(email: string | undefined, password: string) {
    const data = await apiLogin(email, password)
    setUser(data.user)
    return data.user
  }

  async function logout() {
    await apiLogout()
    setUser(null)
  }

  const isAuthenticated = user !== null
  const role = user?.role ?? null

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, role, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
