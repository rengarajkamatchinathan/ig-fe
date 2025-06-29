"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, AlertCircle } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { ModeToggle } from "@/components/mode-toggle"
import { apiClient } from "@/lib/api"
import { jwtDecode } from "jwt-decode"

export default function LoginPage() {
  const { login } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [isSigningUp, setIsSigningUp] = useState(false)
  const [error, setError] = useState("")
  const [signupSuccess, setSignupSuccess] = useState("")

  const isFormValid = email.trim() !== "" && password.trim() !== ""

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSignupSuccess("")
    if (!isFormValid) {
      setError("Please enter both username and password")
      return
    }
    setIsSigningIn(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: email, // backend expects 'username'
          password,
        }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        setError(data.detail || "Login failed")
        setIsSigningIn(false)
        return
      }
      const data = await response.json()
      const token = data.access_token || data.token
      if (!token) {
        setError("No token returned from server")
        setIsSigningIn(false)
        return
      }
      let org_id = 1
      try {
        const decoded = jwtDecode(token)
        org_id = decoded.org_id || 1
      } catch (e) {}
      login(token, { email, name: email.split("@")[0], org_id })
      router.push("/credentials")
    } catch (err) {
      setError("Network error")
    } finally {
      setIsSigningIn(false)
    }
  }

  const handleSignup = async () => {
    setError("")
    setSignupSuccess("")
    if (!isFormValid) {
      setError("Please enter both username and password")
      return
    }
    setIsSigningUp(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: email,
          password,
        }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        setError(data.detail || "Signup failed")
        setIsSigningUp(false)
        return
      }
      setSignupSuccess("Signup successful! You can now sign in.")
      setTimeout(() => setSignupSuccess("") , 2000)
    } catch (err) {
      setError("Network error")
    } finally {
      setIsSigningUp(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-blue-200 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
      <div className="flex w-full max-w-4xl shadow-2xl rounded-xl overflow-hidden bg-white dark:bg-gray-950">
        {/* Left panel with logo and tagline */}
        <div className="hidden md:flex flex-col justify-center items-center w-1/2 bg-gradient-to-br from-blue-600 to-blue-400 dark:from-blue-900 dark:to-blue-700 p-10 text-white">
          <div className="flex flex-col items-center">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-4">
              <circle cx="24" cy="24" r="24" fill="#2563EB" />
              <path d="M24 14L34 34H14L24 14Z" fill="white" />
            </svg>
            <h1 className="text-3xl font-bold mb-2 tracking-tight">Infragenie</h1>
            <p className="text-lg font-light text-blue-100 dark:text-blue-200 text-center max-w-xs">
              Your AI-powered Terraform workspace manager
            </p>
          </div>
        </div>
        {/* Right panel with form */}
        <div className="flex-1 flex flex-col justify-center p-8 sm:p-12">
          <div className="w-full max-w-md mx-auto space-y-6">
            <Card className="shadow-lg border-0 bg-white dark:bg-gray-950">
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl text-center font-semibold">Sign In</CardTitle>
                <CardDescription className="text-center">Enter your credentials to access your Terraform workspace</CardDescription>
              </CardHeader>
              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">UserName</Label>
                    <Input
                      id="email"
                      type="text"
                      placeholder="Username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  {signupSuccess && (
                    <div className="text-green-600 text-center mt-2">{signupSuccess}</div>
                  )}
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                  <Button type="submit" className="w-full" disabled={!isFormValid || isSigningIn || isSigningUp}>
                    {isSigningIn ? "Signing in..." : "Sign in"}
                  </Button>
                  <div className="flex items-center w-full my-2">
                    <div className="flex-1 h-px bg-muted-foreground/20" />
                    <span className="mx-2 text-xs text-muted-foreground">or</span>
                    <div className="flex-1 h-px bg-muted-foreground/20" />
                  </div>
                  <Button type="button" variant="outline" className="w-full" onClick={handleSignup} disabled={!isFormValid || isSigningUp || isSigningIn}>
                    {isSigningUp ? "Signing up..." : "Sign up"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
            <div className="text-center text-xs text-muted-foreground mt-4">
              <span>Powered by Infragenie &mdash; Secure, simple, and smart cloud automation</span>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
    </div>
  )
}
