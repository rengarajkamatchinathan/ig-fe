"use client"

import type React from "react"

import { Terminal, User, Settings, LogOut, Menu, X, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ModeToggle } from "@/components/mode-toggle"
import { useAuth } from "@/components/auth-provider"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { apiClient } from "@/lib/api"

interface BreadcrumbItem {
  label: string
  href: string
  isActive?: boolean
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([])

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  // Don't show navigation on credentials page (one-time setup)
  const isCredentialsPage = pathname === "/credentials"

  // Generate breadcrumbs based on current path
  useEffect(() => {
    const generateBreadcrumbs = async () => {
      const pathSegments = pathname.split("/").filter(Boolean)
      const crumbs: BreadcrumbItem[] = []

      // Always start with Projects if we're in the app
      if (pathSegments.length > 0 && pathSegments[0] === "projects") {
        crumbs.push({
          label: "Projects",
          href: "/projects",
          isActive: pathSegments.length === 1,
        })

        // If we have a project ID
        if (pathSegments.length >= 2) {
          const projectId = pathSegments[1]

          try {
            // Fetch project name from API
            const project = await apiClient.getProject(projectId)
            const projectName = project.name || projectId

            crumbs.push({
              label: projectName,
              href: `/projects/${projectId}`,
              isActive: pathSegments.length === 2,
            })

            // If we have workspaces
            if (pathSegments.length >= 4 && pathSegments[2] === "workspaces") {
              const workspaceId = pathSegments[3]

              try {
                // Fetch workspace name from API
                const workspace = await apiClient.getWorkspace(projectId, workspaceId)
                const workspaceName = workspace.name || workspaceId

                crumbs.push({
                  label: workspaceName,
                  href: `/projects/${projectId}/workspaces/${workspaceId}`,
                  isActive: true,
                })
              } catch (error) {
                console.error("Error fetching workspace:", error)
                // Fallback to localStorage if API fails
                const savedWorkspaces = localStorage.getItem(`terraform-workspaces-${projectId}`)
                let workspaceName = workspaceId

                if (savedWorkspaces) {
                  try {
                    const workspaces = JSON.parse(savedWorkspaces)
                    const workspace = workspaces.find((w: any) => w.id === workspaceId)
                    if (workspace && workspace.name) {
                      workspaceName = workspace.name
                    }
                  } catch (parseError) {
                    console.error("Error parsing workspaces from localStorage:", parseError)
                  }
                }

                crumbs.push({
                  label: workspaceName,
                  href: `/projects/${projectId}/workspaces/${workspaceId}`,
                  isActive: true,
                })
              }
            }
          } catch (error) {
            console.error("Error fetching project:", error)
            crumbs.push({
              label: projectId,
              href: `/projects/${projectId}`,
              isActive: pathSegments.length === 2,
            })
          }
        }
      } else if (pathname === "/profile") {
        crumbs.push({
          label: "Profile",
          href: "/profile",
          isActive: true,
        })
      } else if (pathname === "/settings") {
        crumbs.push({
          label: "Settings",
          href: "/settings",
          isActive: true,
        })
      }

      setBreadcrumbs(crumbs)
    }

    generateBreadcrumbs()
  }, [pathname])

  return (
    <div className="bg-background w-full h-screen flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto px-4">
          <div className="flex h-10 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-4">
              <Link href="/projects" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                <h1 className="text-xl font-semibold">Infragenie</h1>
              </Link>

              {/* Breadcrumb Navigation - Only show if not on credentials page */}
              {!isCredentialsPage && breadcrumbs.length > 0 && (
                <nav className="hidden md:flex items-center space-x-2 ml-4">
                  <div className="h-6 w-px bg-border"></div>
                  {breadcrumbs.map((crumb, index) => (
                    <div key={crumb.href} className="flex items-center space-x-2">
                      {index > 0 && <h1 className="text-muted-foreground" >/</h1>}
                      <Link
                        href={crumb.href}
                        className={cn(
                          "text-sm font-medium transition-colors hover:text-primary px-2 py-1 rounded-md",
                          crumb.isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {crumb.label}
                      </Link>
                    </div>
                  ))}
                </nav>
              )}
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-4">
              {/* Mobile menu button - Only show if not on credentials page */}
              {!isCredentialsPage && breadcrumbs.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="md:hidden"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
              )}

              <ModeToggle />

              {/* Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">{user ? getUserInitials(user.name) : "U"}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/profile")}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/settings")}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 dark:text-red-400">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Mobile Navigation - Only show if not on credentials page */}
          {!isCredentialsPage && mobileMenuOpen && breadcrumbs.length > 0 && (
            <div className="md:hidden border-t bg-background/95 backdrop-blur">
              <nav className="flex flex-col space-y-2 px-4 py-4">
                {breadcrumbs.map((crumb, index) => (
                  <Link
                    key={crumb.href}
                    href={crumb.href}
                    className={cn(
                      "text-sm font-medium transition-colors hover:text-primary px-2 py-2 rounded-md flex items-center",
                      crumb.isActive ? "text-primary bg-primary/10" : "text-muted-foreground",
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="ml-4" style={{ marginLeft: `${index * 16}px` }}>
                      {crumb.label}
                    </span>
                  </Link>
                ))}
              </nav>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )}
