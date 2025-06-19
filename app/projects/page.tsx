"use client"

import { ProjectsList } from "@/components/projects-list"
import { AppLayout } from "@/components/app-layout"
import { ProtectedRoute } from "@/components/protected-route"

export default function ProjectsPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
          <ProjectsList />
      </AppLayout>
    </ProtectedRoute>
  )
}
