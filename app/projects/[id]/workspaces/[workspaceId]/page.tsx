"use client"

import { WorkspaceEditor } from "@/components/workspace-editor"
import { AppLayout } from "@/components/app-layout"
import { ProtectedRoute } from "@/components/protected-route"

interface WorkspacePageProps {
  params: {
    id: string
    workspaceId: string
  }
}

export default function WorkspacePage({ params }: WorkspacePageProps) {
  return (
    <ProtectedRoute>
      <AppLayout>
        <WorkspaceEditor projectId={params.id} workspaceId={params.workspaceId} />
      </AppLayout>
    </ProtectedRoute>
  )
}
