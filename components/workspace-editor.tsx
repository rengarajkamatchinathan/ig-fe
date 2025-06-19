"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import dynamic from "next/dynamic"
import {
  ChevronDown,
  ChevronRight,
  FileCode,
  FileText,
  Folder,
  FolderOpen,
  Send,
  Sparkles,
  BarChart3,
  Shield,
  DollarSign,
  GitBranch,
  ArrowLeft,
  Settings,
  Terminal,
  Plus,
  Trash2,
  Save,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ModeToggle } from "@/components/mode-toggle"
import { TerraformActions } from "@/components/terraform-actions"

// Enhanced Monaco Editor with One Dark Pro theme
const MonacoEditor = dynamic(() => import("@/components/monaco-editor"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#1e1e1e]">
      <div className="text-gray-400">Loading editor...</div>
    </div>
  ),
})

// Sample file structure
const initialFiles = {
  "main.tf": `provider "aws" {
  region = var.region
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = {
    Name        = "\${var.environment}-vpc"
    Environment = var.environment
  }
}

resource "aws_subnet" "public" {
  count = length(var.public_subnet_cidrs)
  
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  
  tags = {
    Name        = "\${var.environment}-public-subnet-\${count.index + 1}"
    Environment = var.environment
    Type        = "Public"
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  
  tags = {
    Name        = "\${var.environment}-igw"
    Environment = var.environment
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
  
  tags = {
    Name        = "\${var.environment}-public-rt"
    Environment = var.environment
  }
}

resource "aws_route_table_association" "public" {
  count = length(aws_subnet.public)
  
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}`,
  "variables.tf": `variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
  
  validation {
    condition = can(regex("^[a-z]{2}-[a-z]+-[0-9]$", var.region))
    error_message = "Region must be a valid AWS region format."
  }
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
  
  validation {
    condition = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
  
  validation {
    condition = can(cidrhost(var.vpc_cidr, 0))
    error_message = "VPC CIDR must be a valid IPv4 CIDR block."
  }
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
  
  validation {
    condition = length(var.public_subnet_cidrs) >= 2
    error_message = "At least 2 public subnets are required for high availability."
  }
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
  
  validation {
    condition = contains(["t3.micro", "t3.small", "t3.medium"], var.instance_type)
    error_message = "Instance type must be one of: t3.micro, t3.small, t3.medium."
  }
}`,
  "outputs.tf": `output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = aws_subnet.public[*].id
}

output "internet_gateway_id" {
  description = "ID of the Internet Gateway"
  value       = aws_internet_gateway.main.id
}

output "public_route_table_id" {
  description = "ID of the public route table"
  value       = aws_route_table.public.id
}`,
}

type FileStructure = {
  [key: string]: string | FileStructure
}

interface ChatMessage {
  id: string
  type: "user" | "assistant"
  content: string
  timestamp: Date
}

interface WorkspaceEditorProps {
  projectId: string
  workspaceId: string
}

export function WorkspaceEditor({ projectId, workspaceId }: WorkspaceEditorProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [project, setProject] = useState<any>(null)
  const [workspace, setWorkspace] = useState<any>(null)
  const [files, setFiles] = useState<FileStructure>({})
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [selectedFile, setSelectedFile] = useState<string>("")
  const [fileContent, setFileContent] = useState<string>("")
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      type: "assistant",
      content:
        "Hello! I'm your AI assistant. I can help you create and modify your Terraform files. Describe the infrastructure you want to build and I'll generate the code for you!",
      timestamp: new Date(),
    },
  ])
  const [chatInput, setChatInput] = useState("")
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  // Check if files are empty or don't exist
  const hasFiles = Object.keys(files).length > 0
  const hasContent = hasFiles && Object.values(files).some((file) => typeof file === "string" && file.trim().length > 0)

  useEffect(() => {
    // Load project and workspace data
    const savedProjects = localStorage.getItem("terraform-projects")
    if (savedProjects) {
      const projects = JSON.parse(savedProjects).map((p: any) => ({
        ...p,
        createdAt: new Date(p.createdAt),
        lastModified: new Date(p.lastModified),
      }))
      const currentProject = projects.find((p: any) => p.id === projectId)
      if (currentProject) {
        setProject(currentProject)
      } else {
        router.push("/projects")
        return
      }
    }

    const savedWorkspaces = localStorage.getItem(`terraform-workspaces-${projectId}`)
    if (savedWorkspaces) {
      const workspaces = JSON.parse(savedWorkspaces).map((w: any) => ({
        ...w,
        createdAt: new Date(w.createdAt),
        lastModified: new Date(w.lastModified),
      }))
      const currentWorkspace = workspaces.find((w: any) => w.id === workspaceId)
      if (currentWorkspace) {
        setWorkspace(currentWorkspace)
        // Load saved files for this workspace
        const savedFiles = localStorage.getItem(`terraform-files-${workspaceId}`)
        if (savedFiles) {
          const parsedFiles = JSON.parse(savedFiles)
          setFiles(parsedFiles)
          if (Object.keys(parsedFiles).length > 0) {
            setSelectedFile(Object.keys(parsedFiles)[0])
          }
        }
      } else {
        router.push(`/projects/${projectId}`)
        return
      }
    }
  }, [projectId, workspaceId, router])

  useEffect(() => {
    // Get content of selected file
    const getFileContent = (path: string, structure: FileStructure): string => {
      const parts = path.split("/")
      const current = parts[0]

      if (parts.length === 1) {
        return structure[current] as string
      }

      const remaining = parts.slice(1).join("/")
      return getFileContent(remaining, structure[current] as FileStructure)
    }

    try {
      if (selectedFile && hasFiles) {
        const content = getFileContent(selectedFile, files)
        setFileContent(content)
      }
    } catch (error) {
      console.error("Error getting file content:", error)
    }
  }, [selectedFile, files, hasFiles])

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(path)) {
        newSet.delete(path)
      } else {
        newSet.add(path)
      }
      return newSet
    })
  }

  const handleFileSelect = (path: string) => {
    setSelectedFile(path)
  }

  const handleContentChange = (content: string) => {
    setFileContent(content)

    // Update file content in the structure
    const updateFileContent = (path: string, structure: FileStructure, content: string): FileStructure => {
      const parts = path.split("/")
      const current = parts[0]

      if (parts.length === 1) {
        return {
          ...structure,
          [current]: content,
        }
      }

      const remaining = parts.slice(1).join("/")
      return {
        ...structure,
        [current]: updateFileContent(remaining, structure[current] as FileStructure, content),
      }
    }

    const updatedFiles = updateFileContent(selectedFile, files, content)
    setFiles(updatedFiles)

    // Save to localStorage
    localStorage.setItem(`terraform-files-${workspaceId}`, JSON.stringify(updatedFiles))
  }

  const handleChatSubmit = async () => {
    if (!chatInput.trim()) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: chatInput,
      timestamp: new Date(),
    }

    setChatMessages((prev) => [...prev, userMessage])
    setChatInput("")
    setIsGenerating(true)

    // Simulate AI response and file generation
    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: `I'll help you create "${chatInput}". I've generated the Terraform files for your infrastructure. You can now see them in the file explorer and start editing!`,
        timestamp: new Date(),
      }

      setChatMessages((prev) => [...prev, assistantMessage])

      // Generate files based on the request
      const newFiles = { ...initialFiles }
      setFiles(newFiles)
      setSelectedFile("main.tf")

      // Save to localStorage
      localStorage.setItem(`terraform-files-${workspaceId}`, JSON.stringify(newFiles))

      setIsGenerating(false)

      toast({
        title: "Files Generated! 🎉",
        description: "Your Terraform infrastructure files have been created successfully.",
      })
    }, 2000)
  }

  const getFileLanguage = (filename: string): string => {
    if (filename.endsWith(".tf")) return "hcl"
    if (filename.endsWith(".sh")) return "shell"
    if (filename.endsWith(".json")) return "json"
    if (filename.endsWith(".yaml") || filename.endsWith(".yml")) return "yaml"
    return "plaintext"
  }

  const renderFileTree = (structure: FileStructure, path = "") => {
    return Object.entries(structure).map(([key, value]) => {
      const fullPath = path + key
      const isFolder = typeof value === "object"
      const isExpanded = expandedFolders.has(fullPath)

      if (isFolder) {
        return (
          <div key={fullPath}>
            <div
              className={cn(
                "flex items-center py-1 px-2 rounded-md cursor-pointer hover:bg-secondary group",
                selectedFile === fullPath && "bg-secondary",
              )}
              onClick={() => toggleFolder(fullPath)}
            >
              <span className="mr-1">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </span>
              <span className="mr-2">
                {isExpanded ? (
                  <FolderOpen className="h-4 w-4 text-yellow-500" />
                ) : (
                  <Folder className="h-4 w-4 text-yellow-500" />
                )}
              </span>
              <span className="text-sm">{key}</span>
            </div>
            {isExpanded && <div className="pl-6">{renderFileTree(value as FileStructure, fullPath)}</div>}
          </div>
        )
      }

      return (
        <div
          key={fullPath}
          className={cn(
            "flex items-center py-1 px-2 rounded-md cursor-pointer hover:bg-secondary group",
            selectedFile === fullPath && "bg-secondary",
          )}
          onClick={() => handleFileSelect(fullPath)}
        >
          <span className="mr-1 opacity-0 w-4"></span>
          <span className="mr-2">
            {key.endsWith(".tf") ? (
              <FileCode className="h-4 w-4 text-blue-500" />
            ) : key.endsWith(".sh") ? (
              <FileCode className="h-4 w-4 text-green-500" />
            ) : (
              <FileText className="h-4 w-4 text-gray-500" />
            )}
          </span>
          <span className="text-sm">{key}</span>
        </div>
      )
    })
  }

  if (!project || !workspace) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Terminal className="h-12 w-12 text-primary mx-auto mb-4" />
          <div className="text-lg font-medium">Loading workspace...</div>
        </div>
      </div>
    )
  }

  // Show AI prompt interface if no files or empty files
  if (!hasContent) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link href={`/projects/${projectId}`}>
                  <Button variant="ghost" size="icon">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
                
                {/* Workspace name and Project Header for IDE */}
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl font-semibold">{project.name}</h1>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-lg">{workspace.name}</span>
                </div>
              </div>
              {/* <div className="flex items-center space-x-4">
                <ModeToggle />
                <Link href="/settings">
                  <Settings className="h-5 w-5 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
                </Link>
              </div> */}
            </div>
          </div>
        </header>

        {/* AI Prompt Interface */}
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-4">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-full">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
              </div>
              <h1 className="text-3xl font-bold mb-2">Welcome to your Workspace! 🚀</h1>
              <p className="text-lg text-muted-foreground mb-6">
                Describe the infrastructure you want to build and I'll generate the Terraform code for you.
              </p>
            </div>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  AI Infrastructure Generator
                </CardTitle>
                <CardDescription>
                  Tell me what you want to build and I'll create the Terraform files for you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Describe your infrastructure... (e.g., 'Create a VPC with public and private subnets, an EKS cluster, and RDS database')"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="min-h-[120px] resize-none"
                  disabled={isGenerating}
                />
                <Button
                  onClick={handleChatSubmit}
                  className="w-full"
                  size="lg"
                  disabled={!chatInput.trim() || isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating Infrastructure...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Terraform Files
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Example Prompts */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">💡 Example Prompts</CardTitle>
                <CardDescription>Click on any example to get started quickly</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    "Create a VPC with public and private subnets",
                    "Set up an EKS cluster with worker nodes",
                    "Deploy a web application with load balancer",
                    "Create a database with backup configuration",
                    "Set up a CI/CD pipeline with CodePipeline",
                    "Create a serverless API with Lambda and API Gateway",
                  ].map((example, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="text-left justify-start h-auto p-3"
                      onClick={() => setChatInput(example)}
                      disabled={isGenerating}
                    >
                      <div className="text-sm">{example}</div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Chat Messages */}
            {chatMessages.length > 1 && (
              <Card className="mt-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    AI Assistant
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-4">
                      {chatMessages.map((message) => (
                        <div
                          key={message.id}
                          className={cn("flex gap-3", message.type === "user" ? "justify-end" : "justify-start")}
                        >
                          <div
                            className={cn(
                              "max-w-[80%] rounded-lg p-3 text-sm",
                              message.type === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
                            )}
                          >
                            {message.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Show full workspace editor when files exist
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href={`/projects/${projectId}`}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div className="flex items-center space-x-2">
                <Terminal className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-semibold">{project.name}</h1>
                <span className="text-muted-foreground">•</span>
                <span className="text-lg">{workspace.name}</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <ModeToggle />
              <Link href="/settings">
                <Settings className="h-5 w-5 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="h-[calc(100vh-73px)] flex flex-col">
        <div className="flex-1 grid grid-cols-[300px_1fr] gap-0">
          {/* File Explorer */}
          <div className="border-r bg-muted/30 flex flex-col">
            <div className="p-3 border-b flex items-center justify-between">
              <h3 className="text-sm font-medium">Project Files</h3>
              <Button variant="ghost" size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1 p-2">{renderFileTree(files)}</ScrollArea>
          </div>

          {/* Main Content Area */}
          <div className="flex flex-col">
            {/* Code Editor */}
            <div className="flex-1 flex flex-col">
              <div className="p-2 border-b bg-muted/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">{selectedFile}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {getFileLanguage(selectedFile).toUpperCase()}
                  </Badge>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex-1">
                <MonacoEditor
                  value={fileContent}
                  onChange={handleContentChange}
                  language={getFileLanguage(selectedFile)}
                  filename={selectedFile}
                />
              </div>
            </div>

            {/* Chat Interface */}
            <div className="h-80 border-t flex flex-col">
              <div className="p-3 border-b bg-muted/50">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">AI Assistant</span>
                  <Badge variant="secondary" className="text-xs">
                    Online
                  </Badge>
                </div>
              </div>

              <ScrollArea className="flex-1 p-3">
                <div className="space-y-3">
                  {chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={cn("flex gap-3", message.type === "user" ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] rounded-lg p-3 text-sm",
                          message.type === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
                        )}
                      >
                        {message.content}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="p-3 border-t">
                <div className="flex gap-2">
                  <Input
                    placeholder="Ask me to modify your Terraform files..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleChatSubmit()}
                  />
                  <Button onClick={handleChatSubmit} size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Terraform Actions */}
        <TerraformActions />

        {/* Floating Analysis Button */}
        <div className="fixed bottom-6 right-6">
          <Dialog open={isAnalysisOpen} onOpenChange={setIsAnalysisOpen}>
            <DialogTrigger asChild>
              <Button
                size="lg"
                className="h-14 px-6 rounded-full shadow-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                <BarChart3 className="h-5 w-5 mr-2" />
                Analyze Infrastructure
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Infrastructure Analysis
                </DialogTitle>
                <DialogDescription>Comprehensive analysis of your Terraform infrastructure</DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="cost" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="cost" className="gap-2">
                    <DollarSign className="h-4 w-4" />
                    Cost
                  </TabsTrigger>
                  <TabsTrigger value="security" className="gap-2">
                    <Shield className="h-4 w-4" />
                    Security
                  </TabsTrigger>
                  <TabsTrigger value="pipeline" className="gap-2">
                    <GitBranch className="h-4 w-4" />
                    Pipeline
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="cost" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Cost Estimation</CardTitle>
                      <CardDescription>Monthly cost breakdown for your infrastructure</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                          <span>VPC (Virtual Private Cloud)</span>
                          <span className="font-semibold">$0.00</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                          <span>Public Subnets (2x)</span>
                          <span className="font-semibold">$0.00</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                          <span>Auto Scaling Group (t3.micro x2)</span>
                          <span className="font-semibold">$15.18</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                          <span>Security Groups</span>
                          <span className="font-semibold">$0.00</span>
                        </div>
                        <div className="border-t pt-3">
                          <div className="flex justify-between items-center text-lg font-bold">
                            <span>Total Monthly Cost</span>
                            <span className="text-green-600">$15.18</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="security" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Security Analysis</CardTitle>
                      <CardDescription>Security recommendations and compliance checks</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm">VPC has DNS resolution enabled</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm">SSH access restricted to private networks</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                          <span className="text-sm">Security group allows all outbound traffic</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span className="text-sm">HTTP traffic allowed from anywhere (0.0.0.0/0)</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="pipeline" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>CI/CD Pipeline Code</CardTitle>
                      <CardDescription>Generated pipeline configuration for deployment</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm overflow-auto">
                        <pre>{`name: Deploy Infrastructure

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Terraform
      uses: hashicorp/setup-terraform@v2
      with:
        terraform_version: 1.5.0
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v2
      with:
        aws-access-key-id: \${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: \${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-west-2
    
    - name: Terraform Init
      run: terraform init
      
    - name: Terraform Validate
      run: terraform validate
      
    - name: Terraform Plan
      run: terraform plan -out=tfplan
      
    - name: Terraform Apply
      if: github.ref == 'refs/heads/main'
      run: terraform apply -auto-approve tfplan`}</pre>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  )
}
