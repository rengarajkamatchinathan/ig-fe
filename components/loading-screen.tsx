"use client"

import { Terminal } from "lucide-react"

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-2">
          <Terminal className="h-8 w-8 text-primary animate-pulse" />
          <h1 className="text-2xl font-bold">Infragenie</h1>
        </div>
        <div className="flex items-center justify-center space-x-1">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
        </div>
        <p className="text-sm text-muted-foreground">Loading your workspace...</p>
      </div>
    </div>
  )
}
