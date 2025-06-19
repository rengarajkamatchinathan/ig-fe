"use client"

import { ProjectDashboard } from "@/components/project-dashboard"
import { AppLayout } from "@/components/app-layout"
import { ProtectedRoute } from "@/components/protected-route"

interface ProjectPageProps {
  params: {
    id: string
  }
}

export default function ProjectPage({ params }: ProjectPageProps) {
  return (
    <ProtectedRoute>
      <AppLayout>
        <ProjectDashboard projectId={params.id} />
      </AppLayout>
    </ProtectedRoute>
  )
}
