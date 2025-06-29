"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

interface User {
  email: string
  name: string
  org_id?: number
}

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  user: User | null
  token: string | null
  login: (token: string, user: User) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    // Check for existing token on mount
    const savedToken = localStorage.getItem("auth-token")
    const savedUser = localStorage.getItem("auth-user")

    if (savedToken && savedUser) {
      try {
        // Decode and validate token (basic validation)
        const tokenParts = savedToken.split(".")
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]))

          // Check if token is expired
          if (payload.exp * 1000 > Date.now()) {
            setToken(savedToken)
            setUser(JSON.parse(savedUser))
            setIsAuthenticated(true)
          } else {
            // Token expired, clear storage
            localStorage.removeItem("auth-token")
            localStorage.removeItem("auth-user")
          }
        }
      } catch (error) {
        // Invalid token, clear storage
        localStorage.removeItem("auth-token")
        localStorage.removeItem("auth-user")
      }
    }

    setIsLoading(false)
  }, [])

  const login = (newToken: string, newUser: User) => {
    setToken(newToken)
    setUser(newUser)
    setIsAuthenticated(true)
    localStorage.setItem("auth-token", newToken)
    localStorage.setItem("auth-user", JSON.stringify(newUser))
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    setIsAuthenticated(false)
    localStorage.removeItem("auth-token")
    localStorage.removeItem("auth-user")
    localStorage.removeItem("terraform-credentials")
    localStorage.removeItem("terraform-credentials-data")
    localStorage.removeItem("terraform-selected-provider")
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        token,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
