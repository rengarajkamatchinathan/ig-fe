"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

type WorkflowStep = "credentials" | "projects" | "project-dashboard" | "prompt" | "editor" | "settings"

interface Project {
  id: string
  name: string
  description: string
  provider: "aws" | "azure" | "gcp"
  createdAt: Date
  lastModified: Date
}

interface WorkflowContextType {
  currentStep: WorkflowStep
  setCurrentStep: (step: WorkflowStep) => void
  hasCredentials: boolean
  setHasCredentials: (has: boolean) => void
  projects: Project[]
  setProjects: (projects: Project[]) => void
  currentProject: Project | null
  setCurrentProject: (project: Project | null) => void
  goToStep: (step: WorkflowStep) => void
  selectProject: (project: Project) => void
  credentials: any
  setCredentials: (credentials: any) => void
  updateCredentials: (credentials: any) => void
  selectedProvider: "aws" | "azure" | "gcp" | null
  setSelectedProvider: (provider: "aws" | "azure" | "gcp") => void
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined)

export function useWorkflow() {
  const context = useContext(WorkflowContext)
  if (!context) {
    throw new Error("useWorkflow must be used within a WorkflowProvider")
  }
  return context
}

export function WorkflowProvider({ children }: { children: React.ReactNode }) {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>("credentials")
  const [hasCredentials, setHasCredentials] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [credentials, setCredentials] = useState<any>(null)
  const [selectedProvider, setSelectedProvider] = useState<"aws" | "azure" | "gcp" | null>(null)

  // Check if user has credentials and selected provider on mount
  useEffect(() => {
    const savedCredentials = localStorage.getItem("terraform-credentials")
    const savedCredentialsData = localStorage.getItem("terraform-credentials-data")
    const savedProvider = localStorage.getItem("terraform-selected-provider")

    if (savedCredentials && savedCredentialsData) {
      setHasCredentials(true)
      setCredentials(JSON.parse(savedCredentialsData))
      if (savedProvider) {
        setSelectedProvider(savedProvider as "aws" | "azure" | "gcp")
      }
      setCurrentStep("projects")
    }
  }, [])

  // Save credentials to localStorage when set
  useEffect(() => {
    if (hasCredentials) {
      localStorage.setItem("terraform-credentials", "true")
    }
  }, [hasCredentials])

  // Save credentials data to localStorage
  const updateCredentials = (newCredentials: any) => {
    setCredentials(newCredentials)
    localStorage.setItem("terraform-credentials-data", JSON.stringify(newCredentials))
  }

  // Save selected provider to localStorage
  useEffect(() => {
    if (selectedProvider) {
      localStorage.setItem("terraform-selected-provider", selectedProvider)
    }
  }, [selectedProvider])

  const goToStep = (step: WorkflowStep) => {
    if (!hasCredentials && step !== "credentials") return
    setCurrentStep(step)
  }

  const selectProject = (project: Project) => {
    setCurrentProject(project)
    setCurrentStep("project-dashboard")
  }

  return (
    <WorkflowContext.Provider
      value={{
        currentStep,
        setCurrentStep,
        hasCredentials,
        setHasCredentials,
        projects,
        setProjects,
        currentProject,
        setCurrentProject,
        goToStep,
        selectProject,
        credentials,
        setCredentials,
        updateCredentials,
        selectedProvider,
        setSelectedProvider,
      }}
    >
      {children}
    </WorkflowContext.Provider>
  )
}
