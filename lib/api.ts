const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// Provider mappings to match backend
const PROVIDER_ID_MAP: Record<"aws" | "azure" | "gcp", number> = {
  aws: 1,
  azure: 2,
  gcp: 3,
}

const PROVIDER_NAME_MAP: Record<number, "aws" | "azure" | "gcp"> = {
  1: "aws",
  2: "azure",
  3: "gcp",
}

// Types
export interface Project {
  id: string
  name: string
  description: string
  provider: "aws" | "azure" | "gcp"
  createdAt: Date | null
  lastModified: Date | null
}

export interface Workspace {
  id: string
  name: string
  environment: string
  description: string
  projectId: string
  createdAt: string
  lastModified: string
}

export interface Credentials {
  provider: "aws" | "azure" | "gcp"
  aws?: {
    accessKey: string
    secretKey: string
    region: string
  }
  azure?: {
    tenantId: string
    clientId: string
    clientSecret: string
    subscriptionId: string
  }
  gcp?: {
    projectId: string
    serviceAccountKey: string
  }
}

// API Client
class ApiClient {
  private getAuthHeaders() {
    const token = localStorage.getItem("auth-token")
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  // Projects API
  async getProjects(): Promise<Project[]> {
    const response = await fetch(`${API_BASE_URL}/projects`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    })
    if (!response.ok) throw new Error("Failed to fetch projects")

    const backendProjects = await response.json()

    // Map backend fields to frontend fields
    return backendProjects.map((p: any) => ({
      ...p,
      id: p.project_id,
      name: p.project_name,
      provider: PROVIDER_NAME_MAP[p.cloud_provider_id] || "aws",
      createdAt: p.created_at ? new Date(p.created_at) : null,
      lastModified: p.last_modified ? new Date(p.last_modified) : null,
    }))
  }

  async createProject(project: {
    name: string
    description: string
    provider: "aws" | "azure" | "gcp"
    state_bucket?: string
  }): Promise<Project> {
    const response = await fetch(`${API_BASE_URL}/projects`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        project_name: project.name,
        owner_id: 1, // TODO: Replace with actual user ID
        cloud_provider_id: PROVIDER_ID_MAP[project.provider],
        org_id: 1, // TODO: Replace with actual org ID
        state_bucket: project.state_bucket || null,
      }),
    })
    if (!response.ok) throw new Error("Failed to create project")

    const createdProject = await response.json()

    // Map backend fields to frontend fields
    return {
      ...createdProject,
      id: createdProject.project_id,
      name: createdProject.project_name,
      provider: project.provider,
      createdAt: new Date(createdProject.createdAt),
      lastModified: new Date(createdProject.lastModified),
    }
  }

  async getProject(id: string): Promise<Project> {
    const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
      headers: this.getAuthHeaders(),
    })
    if (!response.ok) throw new Error("Failed to fetch project")

    const p = await response.json()
    return {
      ...p,
      id: p.project_id,
      name: p.project_name,
      provider: PROVIDER_NAME_MAP[p.cloud_provider_id] || "aws",
      createdAt: p.created_at ? new Date(p.created_at) : null,
      lastModified: p.last_modified ? new Date(p.last_modified) : null,
    }
  }

  async updateProject(id: string, project: Partial<Project>): Promise<Project> {
    const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        ...(project.name && { project_name: project.name }),
        ...(project.provider && { cloud_provider_id: PROVIDER_ID_MAP[project.provider] }),
      }),
    })
    if (!response.ok) throw new Error("Failed to update project")

    const updatedProject = await response.json()
    return {
      ...updatedProject,
      id: updatedProject.project_id,
      name: updatedProject.project_name,
      provider: PROVIDER_NAME_MAP[updatedProject.cloud_provider_id] || "aws",
      createdAt: updatedProject.created_at ? new Date(updatedProject.created_at) : null,
      lastModified: updatedProject.last_modified ? new Date(updatedProject.last_modified) : null,
    }
  }

  async deleteProject(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    })
    if (!response.ok) throw new Error("Failed to delete project")
  }

  // Workspaces API
  async getWorkspaces(projectId: string): Promise<Workspace[]> {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/workspaces`, {
      headers: this.getAuthHeaders(),
    })
    if (!response.ok) throw new Error("Failed to fetch workspaces")
    return response.json()
  }

  async createWorkspace(
    projectId: string,
    workspace: Omit<Workspace, "id" | "projectId" | "createdAt" | "lastModified">,
  ): Promise<Workspace> {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/workspaces`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(workspace),
    })
    if (!response.ok) throw new Error("Failed to create workspace")
    return response.json()
  }

  async getWorkspace(projectId: string, workspaceId: string): Promise<Workspace> {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/workspaces/${workspaceId}`, {
      headers: this.getAuthHeaders(),
    })
    if (!response.ok) throw new Error("Failed to fetch workspace")
    return response.json()
  }

  async updateWorkspace(projectId: string, workspaceId: string, workspace: Partial<Workspace>): Promise<Workspace> {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/workspaces/${workspaceId}`, {
      method: "PUT",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(workspace),
    })
    if (!response.ok) throw new Error("Failed to update workspace")
    return response.json()
  }

  async deleteWorkspace(projectId: string, workspaceId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/workspaces/${workspaceId}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    })
    if (!response.ok) throw new Error("Failed to delete workspace")
  }

  // Credentials API (keeping localStorage for now as per your existing code)
  getCredentials(): Credentials | null {
    const savedCredentials = localStorage.getItem("terraform-credentials")
    return savedCredentials ? JSON.parse(savedCredentials) : null
  }

  saveCredentials(credentials: Credentials): void {
    localStorage.setItem("terraform-credentials", JSON.stringify(credentials))
  }

  async validateCredentials(credentials: Credentials): Promise<{ valid: boolean; message?: string }> {
    const response = await fetch(`${API_BASE_URL}/credentials/validate`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(credentials),
    })
    if (!response.ok) throw new Error("Failed to validate credentials")
    return response.json()
  }

  // Files API
  async getFiles(projectId: string, workspaceId: string): Promise<Record<string, string>> {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/workspaces/${workspaceId}/files`, {
      headers: this.getAuthHeaders(),
    })
    if (!response.ok) throw new Error("Failed to fetch files")
    return response.json()
  }

  async saveFiles(projectId: string, workspaceId: string, files: Record<string, string>): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/workspaces/${workspaceId}/files`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ files }),
    })
    if (!response.ok) throw new Error("Failed to save files")
  }

  // Terraform Generation API
  async generateTerraform(data: {
    cloud_provider: string
    prompt: string
    provider: string
  }): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/terraform/generate`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error("Failed to generate terraform")
    return response.json()
  }
}

export const apiClient = new ApiClient()
export { PROVIDER_ID_MAP, PROVIDER_NAME_MAP }
