"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FolderPlus, Plus, Trash2, Search, Cloud, Settings, Terminal, Loader2, Calendar, Building2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ModeToggle } from "@/components/mode-toggle"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import ReactMarkdown from "react-markdown"

interface Project {
  id: string
  name: string
  description: string
  provider: "aws" | "azure" | "gcp"
  createdAt: Date
  lastModified: Date
}

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

const PROVIDER_ID_MAP: Record<"aws" | "azure" | "gcp", number> = {
  aws: 1,
  azure: 2,
  gcp: 3,
};

const PROVIDER_NAME_MAP: Record<number, "aws" | "azure" | "gcp"> = {
  1: "aws",
  2: "azure",
  3: "gcp",
};

const getProviderIcon = (provider: string) => {
  switch (provider) {
    case "aws":
      return "🟠"
    case "azure":
      return "🔵"
    case "gcp":
      return "🔴"
    default:
      return "☁️"
  }
}

const getProviderColor = (provider: string) => {
  switch (provider) {
    case "aws":
      return "bg-orange-100 text-orange-800 border-orange-200"
    case "azure":
      return "bg-blue-100 text-blue-800 border-blue-200"
    case "gcp":
      return "bg-red-100 text-red-800 border-red-200"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

export function ProjectsList() {
  const router = useRouter()
  const { toast } = useToast()
  const [projects, setProjects] = useState<Project[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    provider: "aws" as "aws" | "azure" | "gcp",
    state_bucket:""
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Fetch projects from backend
    const fetchProjects = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${apiUrl}/projects`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        })
        if (!response.ok) throw new Error("Failed to fetch projects")
        const backendProjects = await response.json()
        console.log("Backend projects:", backendProjects);
        // Map backend fields to frontend fields
        const mappedProjects = backendProjects.map((p: any) => ({
          ...p,
          id: p.project_id,
          name: p.project_name,
          provider: PROVIDER_NAME_MAP[p.cloud_provider_id] || "aws",
          createdAt: p.created_at ? new Date(p.created_at) : null,
          lastModified: p.last_modified ? new Date(p.last_modified) : null,
        }));
        setProjects(mappedProjects)
        localStorage.setItem("terraform-projects", JSON.stringify(mappedProjects))
      } catch (err) {
        // Fallback to localStorage if API fails
        const savedProjects = localStorage.getItem("terraform-projects")
        if (savedProjects) {
          const parsedProjects = JSON.parse(savedProjects).map((p: any) => ({
            ...p,
            createdAt: p.createdAt ? new Date(p.createdAt) : null,
            lastModified: p.lastModified ? new Date(p.lastModified) : null,
          }))
          setProjects(parsedProjects)
        }
      }
      setIsLoading(false);
    }
    fetchProjects()
  }, [router])

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) {
      toast({
        title: "Project name required",
        description: "Please enter a name for your project.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch(`${apiUrl}/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project_name: newProject.name,
          owner_id: 1, // TODO: Replace with actual user ID
          cloud_provider_id: PROVIDER_ID_MAP[newProject.provider],
          org_id: 1, // TODO: Replace with actual org ID
          state_bucket: newProject.state_bucket || null,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create project")
      }

      const createdProject = await response.json()

      // Map backend fields to frontend fields
      const mappedProject = {
        ...createdProject,
        id: createdProject.project_id,
        name: createdProject.project_name, // map project_name to name
        provider: newProject.provider,     // ensure provider is set for display
        createdAt: new Date(createdProject.createdAt),
        lastModified: new Date(createdProject.lastModified),
      }

      const updatedProjects = [...projects, mappedProject]
      setProjects(updatedProjects)
      localStorage.setItem("terraform-projects", JSON.stringify(updatedProjects))

      setIsCreating(false)
      setNewProject({ name: "", description: "", provider: "aws", state_bucket: "" })

      toast({
        title: "Project created",
        description: `Project "${createdProject.project_name}" has been created successfully.`,
        variant: "default",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create project. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteProject = (projectId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const updatedProjects = projects.filter((p) => p.id !== projectId)
    setProjects(updatedProjects)
    localStorage.setItem("terraform-projects", JSON.stringify(updatedProjects))

    toast({
      title: "Project deleted",
      description: "The project has been deleted successfully.",
      variant: "default",
    })
  }

  const filteredProjects = projects.filter(
    (project) =>
      (project.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading projects...</span>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
            <p className="text-muted-foreground mt-2">
              Manage your infrastructure projects and workspaces
            </p>
          </div>
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-sm">
                <Plus className="h-4 w-4" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>
                  Set up a new infrastructure project with your preferred cloud provider.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <Label htmlFor="project-name">Project Name *</Label>
                  <Input
                    id="project-name"
                    placeholder="My Infrastructure Project"
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-description">Description</Label>
                  <Input
                    id="project-description"
                    placeholder="A brief description of your project"
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-provider">Cloud Provider *</Label>
                  <Select
                    value={newProject.provider}
                    onValueChange={(value: "aws" | "azure" | "gcp") =>
                      setNewProject({ ...newProject, provider: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aws">
                        <div className="flex items-center gap-2">
                          <span>🟠</span>
                          Amazon Web Services (AWS)
                        </div>
                      </SelectItem>
                      <SelectItem value="azure">
                        <div className="flex items-center gap-2">
                          <span>🔵</span>
                          Microsoft Azure
                        </div>
                      </SelectItem>
                      <SelectItem value="gcp">
                        <div className="flex items-center gap-2">
                          <span>🔴</span>
                          Google Cloud Platform (GCP)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateProject}>Create Project</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <div className="text-center py-16">
            {projects.length === 0 ? (
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
                <p className="text-muted-foreground mb-6">
                  Get started by creating your first infrastructure project.
                </p>
                <Dialog open={isCreating} onOpenChange={setIsCreating}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create Your First Project
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </div>
            ) : (
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No projects found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search terms or create a new project.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project, idx) => (
              <Link key={project.id || idx} href={`/projects/${project.id}`}>
                <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20 group">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate group-hover:text-primary transition-colors">
                          {project.name}
                        </CardTitle>
                        <CardDescription className="mt-1 line-clamp-2">
                          {project.description || "No description provided"}
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => handleDeleteProject(project.id, e)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <Badge 
                        variant="secondary" 
                        className={cn("gap-1", getProviderColor(project.provider))}
                      >
                        <span>{getProviderIcon(project.provider)}</span>
                        {project.provider.toUpperCase()}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {project.createdAt && !isNaN(project.createdAt.getTime())
                            ? project.createdAt.toLocaleDateString()
                            : "-"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}