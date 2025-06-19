"use client"

import { FileEditor } from "@/components/file-editor"
import { AppLayout } from "@/components/app-layout"
import { ProtectedRoute } from "@/components/protected-route"

export default function EditorPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="h-[calc(100vh-80px)]">
          <FileEditor />
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
