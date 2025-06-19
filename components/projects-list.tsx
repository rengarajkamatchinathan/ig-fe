"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FolderPlus, Plus, Trash2, Search, Cloud, Settings, Terminal } from "lucide-react"
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

interface Project {
  id: string
  name: string
  description: string
  provider: "aws" | "azure" | "gcp"
  createdAt: Date
  lastModified: Date
}

export function ProjectsList() {
  const router = useRouter()
  const { toast } = useToast()
  const [projects, setProjects] = useState<Project[]>([])
  const [credentials, setCredentials] = useState<any>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    provider: "aws" as "aws" | "azure" | "gcp",
  })

  useEffect(() => {
    // Check for credentials
    const savedCredentials = localStorage.getItem("terraform-credentials")
    if (!savedCredentials) {
      router.push("/")
      return
    }

    const creds = JSON.parse(savedCredentials)
    setCredentials(creds)
    setNewProject((prev) => ({ ...prev, provider: creds.provider || "aws" }))

    // Load projects from localStorage
    const savedProjects = localStorage.getItem("terraform-projects")
    if (savedProjects) {
      const parsedProjects = JSON.parse(savedProjects).map((p: any) => ({
        ...p,
        createdAt: new Date(p.createdAt),
        lastModified: new Date(p.lastModified),
      }))
      setProjects(parsedProjects)
    }
  }, [router])

  const handleCreateProject = () => {
    if (!newProject.name.trim()) {
      toast({
        title: "Project name required",
        description: "Please enter a name for your project.",
        variant: "destructive",
      })
      return
    }

    const project: Project = {
      id: Date.now().toString(),
      name: newProject.name,
      description: newProject.description,
      provider: newProject.provider,
      createdAt: new Date(),
      lastModified: new Date(),
    }

    const updatedProjects = [...projects, project]
    setProjects(updatedProjects)
    localStorage.setItem("terraform-projects", JSON.stringify(updatedProjects))

    setIsCreating(false)
    setNewProject({ name: "", description: "", provider: credentials?.provider || "aws" })

    toast({
      title: "Project created",
      description: `Project "${project.name}" has been created successfully.`,
      variant: "default",
    })
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
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  if (!credentials) {
    return <div>Loading...</div>
  }

  return (
    <div className="bg-background h-full">
      <div className="flex h-full">
        {/* Sidebar */}
        <div className="w-80 border-r bg-muted/30 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Your Projects</h2>
              <Dialog open={isCreating} onOpenChange={setIsCreating}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    New
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Project</DialogTitle>
                    <DialogDescription>Enter the details for your new Terraform project.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="project-name">Project Name</Label>
                      <Input
                        id="project-name"
                        placeholder="My Infrastructure Project"
                        value={newProject.name}
                        onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="project-description">Description (Optional)</Label>
                      <Input
                        id="project-description"
                        placeholder="A brief description of your project"
                        value={newProject.description}
                        onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="project-provider">Cloud Provider</Label>
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
                          <SelectItem value="aws">Amazon Web Services (AWS)</SelectItem>
                          <SelectItem value="azure">Microsoft Azure</SelectItem>
                          <SelectItem value="gcp">Google Cloud Platform (GCP)</SelectItem>
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

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Projects List */}
          <div className="flex-1 overflow-auto">
            {filteredProjects.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                {projects.length === 0 ? "No projects yet" : "No projects match your search"}
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredProjects.map((project) => (
                  <Link key={project.id} href={`/projects/${project.id}`}>
                    <div className="p-3 rounded-lg hover:bg-accent cursor-pointer group transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate group-hover:text-primary transition-colors">
                            {project.name}
                          </h3>
                          <p className="text-sm text-muted-foreground truncate mt-1">
                            {project.description || "No description"}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="inline-flex items-center gap-1 text-xs bg-secondary px-2 py-1 rounded">
                              <Cloud className="h-3 w-3" />
                              {project.provider.toUpperCase()}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {project.createdAt.toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => handleDeleteProject(project.id, e)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <FolderPlus className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Welcome to Infragenie</h3>
            <p className="text-muted-foreground mb-6">
              Select a project from the sidebar to get started, or create a new project to begin building your
              infrastructure.
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
        </div>

      </div>
    </div>
  )
}
