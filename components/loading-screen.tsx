"use client"

import { Loader2, Terminal } from "lucide-react"

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-2">
          <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Infragenie</h1>
        </div>
      </div>
    </div>
  )
}
