"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Calendar, Cloud, FolderOpen, Users, GitBranch, ArrowLeft, Settings, Terminal } from "lucide-react"
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

interface Project {
  id: string
  name: string
  description: string
  provider: "aws" | "azure" | "gcp"
  createdAt: Date
  lastModified: Date
}

interface Workspace {
  id: string
  name: string
  environment: string
  description: string
  createdAt: Date
  lastModified: Date
}

interface ProjectDashboardProps {
  projectId: string
}

export function ProjectDashboard({ projectId }: ProjectDashboardProps) {
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

  useEffect(() => {
    // Load project data
    const savedProjects = localStorage.getItem("terraform-projects")
    if (savedProjects) {
      const projects = JSON.parse(savedProjects).map((p: any) => ({
        ...p,
        createdAt: new Date(p.createdAt),
        lastModified: new Date(p.lastModified),
      }))
      const currentProject = projects.find((p: Project) => p.id === projectId)
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

    // Load workspaces for this project
    const savedWorkspaces = localStorage.getItem(`terraform-workspaces-${projectId}`)
    if (savedWorkspaces) {
      const parsedWorkspaces = JSON.parse(savedWorkspaces).map((w: any) => ({
        ...w,
        createdAt: new Date(w.createdAt),
        lastModified: new Date(w.lastModified),
      }))
      setWorkspaces(parsedWorkspaces)
    } else {
      // Create default workspaces
      const defaultWorkspaces: Workspace[] = [
        {
          id: "dev",
          name: "Development",
          environment: "dev",
          description: "Development environment for testing new features",
          createdAt: new Date(),
          lastModified: new Date(),
        },
        {
          id: "staging",
          name: "Staging",
          environment: "staging",
          description: "Staging environment for pre-production testing",
          createdAt: new Date(),
          lastModified: new Date(),
        },
      ]
      setWorkspaces(defaultWorkspaces)
      localStorage.setItem(`terraform-workspaces-${projectId}`, JSON.stringify(defaultWorkspaces))
    }
  }, [projectId, router])

  const handleCreateWorkspace = () => {
    if (!newWorkspace.name.trim() || !newWorkspace.environment.trim()) {
      toast({
        title: "Required fields missing",
        description: "Please enter both name and environment.",
        variant: "destructive",
      })
      return
    }

    const workspace: Workspace = {
      id: Date.now().toString(),
      name: newWorkspace.name,
      environment: newWorkspace.environment.toLowerCase(),
      description: newWorkspace.description,
      createdAt: new Date(),
      lastModified: new Date(),
    }

    const updatedWorkspaces = [...workspaces, workspace]
    setWorkspaces(updatedWorkspaces)
    localStorage.setItem(`terraform-workspaces-${projectId}`, JSON.stringify(updatedWorkspaces))

    setIsCreating(false)
    setNewWorkspace({ name: "", environment: "", description: "" })

    toast({
      title: "Workspace created",
      description: `Workspace "${workspace.name}" has been created successfully.`,
      variant: "default",
    })
  }

  const getEnvironmentColor = (env: string) => {
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

  if (!project) {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/projects">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div className="flex items-center space-x-2">
                <Terminal className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-semibold">{project.name}</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <ModeToggle />
              <Link href="/settings">
                <Settings className="h-5 w-5 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{project.name}</h1>
          <p className="text-muted-foreground">{project.description || "Project workspaces and environments"}</p>
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
              <div className="text-2xl font-bold">{project.createdAt.toLocaleDateString()}</div>
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
                <CardDescription>Manage different environments for your infrastructure project.</CardDescription>
              </div>
              <Dialog open={isCreating} onOpenChange={setIsCreating}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    New Workspace
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Workspace</DialogTitle>
                    <DialogDescription>Set up a new environment for your project.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="workspace-name">Workspace Name</Label>
                      <Input
                        id="workspace-name"
                        placeholder="Production Environment"
                        value={newWorkspace.name}
                        onChange={(e) => setNewWorkspace({ ...newWorkspace, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="workspace-env">Environment</Label>
                      <Input
                        id="workspace-env"
                        placeholder="prod"
                        value={newWorkspace.environment}
                        onChange={(e) => setNewWorkspace({ ...newWorkspace, environment: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="workspace-description">Description (Optional)</Label>
                      <Input
                        id="workspace-description"
                        placeholder="Production environment for live deployment"
                        value={newWorkspace.description}
                        onChange={(e) => setNewWorkspace({ ...newWorkspace, description: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreating(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateWorkspace}>Create Workspace</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {workspaces.map((workspace) => (
                <Link key={workspace.id} href={`/projects/${projectId}/workspaces/${workspace.id}`}>
                  <Card className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary/20">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{workspace.name}</CardTitle>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full border ${getEnvironmentColor(
                            workspace.environment,
                          )}`}
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
