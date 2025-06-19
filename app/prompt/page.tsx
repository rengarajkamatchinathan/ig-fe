"use client"

import { PromptForm } from "@/components/prompt-form"
import { AppLayout } from "@/components/app-layout"
import { ProtectedRoute } from "@/components/protected-route"

export default function PromptPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">AI Assistant</h1>
            <p className="text-muted-foreground">
              Describe your infrastructure needs and let AI generate Terraform configurations.
            </p>
          </div>
          <PromptForm />
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
