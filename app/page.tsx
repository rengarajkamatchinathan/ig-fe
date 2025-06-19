"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { LoadingScreen } from "@/components/loading-screen"

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        // Check if credentials are already set up
        const hasCredentials = localStorage.getItem("terraform-credentials-setup")

        if (hasCredentials) {
          router.push("/projects")
        } else {
          router.push("/credentials")
        }
      } else {
        router.push("/login")
      }
    }
  }, [isAuthenticated, isLoading, router])

  return <LoadingScreen />
}
