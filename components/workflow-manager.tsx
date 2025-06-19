"use client"

import { useWorkflow } from "./workflow-provider"
import { WorkflowLayout } from "./workflow-layout"
import { CredentialsStep } from "./steps/credentials-step"
import { ProjectsStep } from "./steps/projects-step"
import { ProjectDashboardStep } from "./steps/project-dashboard-step"
import { PromptStep } from "./steps/prompt-step"
import { EditorStep } from "./steps/editor-step"
import { SettingsStep } from "./steps/settings-step"

export function WorkflowManager() {
  const { currentStep } = useWorkflow()

  const renderCurrentStep = () => {
    switch (currentStep) {
      case "credentials":
        return <CredentialsStep />
      case "projects":
        return <ProjectsStep />
      case "project-dashboard":
        return <ProjectDashboardStep />
      case "prompt":
        return <PromptStep />
      case "editor":
        return <EditorStep />
      case "settings":
        return <SettingsStep />
      default:
        return <CredentialsStep />
    }
  }

  return <WorkflowLayout>{renderCurrentStep()}</WorkflowLayout>
}
