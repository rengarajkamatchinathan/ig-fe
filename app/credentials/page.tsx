"use client"

import { CredentialsForm } from "@/components/credentials-form"
import { AppLayout } from "@/components/app-layout"
import { ProtectedRoute } from "@/components/protected-route"

export default function CredentialsPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="max-w-4xl mx-auto">
          <CredentialsForm />
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
