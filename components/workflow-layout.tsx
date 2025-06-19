"use client"

import type React from "react"
import { Settings, Terminal } from "lucide-react"
import { ModeToggle } from "./mode-toggle"

interface WorkflowLayoutProps {
  children: React.ReactNode
  title?: string
  showBackButton?: boolean
  onBack?: () => void
  onSettingsClick?: () => void
}

export function WorkflowLayout({ children, title, showBackButton, onBack, onSettingsClick }: WorkflowLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Terminal className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold">Infragenie</h1>
            </div>
            <div className="flex items-center space-x-4">
              <ModeToggle />
              <Settings
                className="h-5 w-5 text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                onClick={onSettingsClick}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="h-[calc(100vh-73px)]">{children}</main>
    </div>
  )
}
