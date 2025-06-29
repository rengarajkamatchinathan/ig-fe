"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Calendar, Cloud, FolderOpen, Users, GitBranch, ArrowLeft, Settings, Terminal, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { ModeToggle } from "@/components/mode-toggle"
import { apiClient, type Project, type Workspace } from "@/lib/api"
interface ProjectDashboardProps {
  projectId: string
}

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
const PROVIDER_NAME_MAP: Record<number, "aws" | "azure" | "gcp"> = {
  1: "aws",
  2: "azure",
  3: "gcp",
}

export function ProjectDashboard({ projectId }: ProjectDashboardProps) {
  if (!projectId) {
    return <div>Invalid project ID</div>;
  }

  const router = useRouter()
  const { toast } = useToast()
  const [project, setProject] = useState<Project | null>(null)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [newWorkspace, setNewWorkspace] = useState({
    name: "",
    environment: "",
    description: "",
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isWorkspacesLoading, setIsWorkspacesLoading] = useState(true)
  const [isWorkspaceCreating, setIsWorkspaceCreating] = useState(false)

  console.log('PROJECT:',project);
  useEffect(() => {
    const fetchProject = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`${apiUrl}/projects/${projectId}`)
        console.log('PROJET RESPONSE', response.json);
        if (!response.ok) throw new Error("Failed to fetch project")
        const p = await response.json()
        setProject({
          ...p,
          id: p.project_id,
          name: p.project_name,
          provider: PROVIDER_NAME_MAP[p.cloud_provider_id] || "aws",
          createdAt: p.created_at ? new Date(p.created_at) : null,
          lastModified: p.last_modified ? new Date(p.last_modified) : null,
        })
      } catch (err) {
        // fallback to localStorage if API fails
        const savedProjects = localStorage.getItem("terraform-projects")
        if (savedProjects) {
          const projects = JSON.parse(savedProjects).map((p: any) => ({
            ...p,
            id: p.project_id,
            createdAt: p.createdAt ? new Date(p.createdAt) : null,
            lastModified: p.lastModified ? new Date(p.lastModified) : null,
          }))
          const currentProject = projects.find((p: Project) => String(p.id) === String(projectId))
          if (currentProject) {
            setProject(currentProject)
          } else {
            router.push("/projects")
            return
          }
        } else {
          router.push("/projects")
          return
        }
      }
      setIsLoading(false)
    }
    fetchProject()

    // Fetch workspaces for this project from backend
    const fetchWorkspaces = async () => {
      setIsWorkspacesLoading(true);
      try {
        const response = await fetch(`${apiUrl}/workspaces/project/${projectId}`);
        if (!response.ok) throw new Error("Failed to fetch workspaces");
        const backendWorkspaces = await response.json();
        const mappedWorkspaces = backendWorkspaces.map((w: any) => ({
          ...w,
          id: w.workspace_id ? String(w.workspace_id) : String(Date.now()),
          name: w.workspace_name,
          environment: w.environment,
          description: w.description,
          createdAt: w.created_at ? new Date(w.created_at) : new Date(),
          lastModified: w.last_modified ? new Date(w.last_modified) : new Date(),
        }));
        setWorkspaces(mappedWorkspaces);
        localStorage.setItem(`terraform-workspaces-${projectId}`, JSON.stringify(mappedWorkspaces));
      } catch (err) {
        // fallback to localStorage if API fails
        const savedWorkspaces = localStorage.getItem(`terraform-workspaces-${projectId}`);
        if (savedWorkspaces) {
          const parsedWorkspaces = JSON.parse(savedWorkspaces).map((w: any) => ({
            ...w,
            createdAt: new Date(w.createdAt),
            lastModified: new Date(w.lastModified),
          }));
          setWorkspaces(parsedWorkspaces);
        }
      }
      setIsWorkspacesLoading(false);
    };
    fetchWorkspaces();
  }, [projectId, router])

  const handleCreateWorkspace = async () => {
    if (!newWorkspace.name.trim() ) {
      toast({
        title: "Required fields missing",
        description: "Please enter Workspace name",
        variant: "destructive",
      })
      return
    }
    if (!project) {
      toast({
        title: "Project not loaded",
        description: "Project information is missing. Please try again later.",
        variant: "destructive",
      })
      return
    }
    setIsWorkspaceCreating(true)
    try {
      const response = await fetch(`${apiUrl}/workspaces/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspace_name: newWorkspace.name,
          project_id: project.id,
          environment: newWorkspace.environment,
          description: newWorkspace.description,
        }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Backend error response:", errorText);
        throw new Error("Failed to create workspace");
      }
      const createdWorkspace = await response.json();
      const mappedWorkspace = {
        ...createdWorkspace,
        id: createdWorkspace.workspace_id ? String(createdWorkspace.workspace_id) : String(Date.now()),
        name: createdWorkspace.workspace_name,
        environment: createdWorkspace.environment || "",
        description: createdWorkspace.description,
        createdAt: createdWorkspace.created_at ? new Date(createdWorkspace.created_at) : new Date(),
        lastModified: createdWorkspace.last_modified ? new Date(createdWorkspace.last_modified) : new Date(),
      };
      const updatedWorkspaces = [...workspaces, mappedWorkspace];
      setWorkspaces(updatedWorkspaces);
      localStorage.setItem(`terraform-workspaces-${project.id}`, JSON.stringify(updatedWorkspaces));
      setIsCreating(false);
      setNewWorkspace({ name: "", environment: "", description: "" });
      toast({
        title: "Workspace created",
        description: `Workspace "${mappedWorkspace.name}" has been created successfully.`,
        variant: "default",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to create workspace. Please try again.",
        variant: "destructive",
      });
    }
    setIsWorkspaceCreating(false)
  }

  const getEnvironmentColor = (env: string | undefined) => {
    if (!env) return "bg-gray-100 text-gray-800 border-gray-200";
    switch (env.toLowerCase()) {
      case "dev":
      case "development":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "qa":
      case "test":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "staging":
      case "stage":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "prod":
      case "production":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  if (isLoading || !project) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading project...</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 py-8 ">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          {/* <p className="text-muted-foreground text-xs">{project.description || "Project workspaces and environments"}</p> */}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {/* Project Info */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cloud Provider</CardTitle>
              <Cloud className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">{project.provider}</div>
              <p className="text-xs text-muted-foreground">Infrastructure target</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Workspaces</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{workspaces.length}</div>
              <p className="text-xs text-muted-foreground">Active environments</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Created</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{project.createdAt?.toLocaleDateString() || "N/A"}</div>
              <p className="text-xs text-muted-foreground">Project creation date</p>
            </CardContent>
          </Card>
        </div>

        {/* Workspaces Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5" />
                  Workspaces
                </CardTitle>
                <CardDescription className="text-xs py-1">Manage different environments for your infrastructure project.</CardDescription>
              </div>
              <Dialog open={isCreating} onOpenChange={setIsCreating}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    New Workspace
                  </Button>
                </DialogTrigger>
                <DialogContent className="space-y-2">
                  <DialogHeader>
                    <DialogTitle className="text-center">Create New Workspace</DialogTitle>
                    <DialogDescription className="text-center text-xs">Set up a new environment for your project.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="workspace-name">Workspace Name</Label>
                      <Input
                        id="workspace-name"
                        placeholder="eg.Prod/Dev/QA"
                        value={newWorkspace.name}
                        onChange={(e) => setNewWorkspace({ ...newWorkspace, name: e.target.value })}
                      />
                    </div>
              
                    <div className="space-y-2">
                      <Label htmlFor="workspace-description">Description (Optional)</Label>
                      <Input
                        id="workspace-description"
                        placeholder="eg.Production environment for live deployment"
                        value={newWorkspace.description}
                        onChange={(e) => setNewWorkspace({ ...newWorkspace, description: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreating(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateWorkspace} disabled={isWorkspaceCreating}>
                      {isWorkspaceCreating ? (
                        <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      ) : null}
                      {isWorkspaceCreating ? "Creating..." : "Create Workspace"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {isWorkspacesLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading workspaces...</span>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {workspaces.map((workspace) => (
                  <Link key={workspace.id} href={`/projects/${project.id}/workspaces/${workspace.id}`}>
                    <Card className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary/20">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{workspace.name}</CardTitle>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full border ${getEnvironmentColor(workspace.environment)}`}
                          >
                            {workspace.environment}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">
                          {workspace.description || "No description provided"}
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Modified {workspace.lastModified.toLocaleDateString()}</span>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span>Active</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
