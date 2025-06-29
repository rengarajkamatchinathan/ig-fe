"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
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
  Terminal,
  CheckCircle,
  X,
  User,
  Bot,
  FileClock,
  Loader2,
  GitBranchIcon,
  MessageSquare,
  Code2,
  Play,
  Settings,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeft,
  GripVertical,
  Clock,
  Zap,
  Activity,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TerraformActions } from "@/components/terraform-actions"
import ReactMarkdown from 'react-markdown'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"

// Enhanced Monaco Editor with One Dark Pro theme
const MonacoEditor = dynamic(() => import("@/components/monaco-editor"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#1e1e1e]">
      <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
      <div className="text-gray-400 ml-2">Loading editor...</div>
    </div>
  ),
})

// Types
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

interface SecurityData {
  security_factors: string[]
  mitigation_strategies: string[]
  acceptance_criteria: string[]
  security_level: string
}

interface CostItem {
  component: string
  estimated_monthly_cost: string
  factors: string[]
  optimization_tips?: string[]
}

interface CostSummary {
  total_monthly_cost: string
  cost_breakdown: Record<string, any>
  optimization_suggestions?: string[]
  cost_factors?: string[]
}

interface ApiResponse {
  infrastructure: Record<string, string>
  security: SecurityData
  costs: CostItem[]
  cost_summary: CostSummary
  metadata: any
  documentation: any
}

const debug = (message: string, data?: any) => {
  if (process.env.NODE_ENV === "development") {
    console.log(`[DEBUG] ${message}`, data || "")  
  }}

export function WorkspaceEditor({ projectId, workspaceId }: WorkspaceEditorProps) {
  const router = useRouter()
  const { toast } = useToast()
  const chatScrollRef = useRef<HTMLDivElement>(null)
  const resizeRef = useRef<HTMLDivElement>(null)
  
  // Core state
  const [project, setProject] = useState<any>(null)
  const [workspace, setWorkspace] = useState<any>(null)
  const [files, setFiles] = useState<FileStructure>({})
  const [selectedFile, setSelectedFile] = useState<string>("")
  const [fileContent, setFileContent] = useState<string>("")
  const [ideLoading, setIdeLoading] = useState(false);
  
  // UI state
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false)
  const [showAIPrompt, setShowAIPrompt] = useState<boolean | null>(null)
  const [isChatVisible, setIsChatVisible] = useState(true)
  const [chatWidth, setChatWidth] = useState(320) // Default chat width
  const [isResizing, setIsResizing] = useState(false)
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [version, setVersion] = useState(1);
  
  // API state
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null)
  
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

  // Auto-scroll to bottom of chat when new messages are added
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [chatMessages, isGenerating])

  // Handle chat panel resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      
      const newWidth = e.clientX
      if (newWidth >= 280 && newWidth <= 600) { // Min 280px, Max 600px
        setChatWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  // Effects
  useEffect(() => {
    // Fetch project
    fetch(`${apiUrl}/projects/${projectId}`)
      .then(res => res.json())
      .then(p => {
        if (p && p.project_id) {
          const mappedProject = {
            ...p,
            id: String(p.project_id),
            name: p.project_name,
            provider: p.cloud_provider_id === 1 ? 'aws' : p.cloud_provider_id === 2 ? 'azure' : 'gcp',
            organization_id: p.org_id,
            createdAt: p.created_at ? new Date(p.created_at) : null,
            lastModified: p.last_modified ? new Date(p.last_modified) : null,
          }
          setProject(mappedProject)
          console.log("Project loaded:", mappedProject);
        } else {
          router.push("/projects")
        }
      })
      .catch(() => router.push("/projects"))

    // Fetch workspace
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
      } else {
        router.push(`/projects/${projectId}`)
      }
    }

    // Fetch prompt history and setup files
    getWorkspaceChatHistory(workspaceId);
  }, [projectId, workspaceId, router, apiUrl])

  const getWorkspaceChatHistory = async (workspaceId: string) => {
    fetch(`${apiUrl}/prompt-history/workspace/${workspaceId}`)
      .then(res => res.json())
      .then(history => {
        setVersion(history?.length);
        if (
          Array.isArray(history) &&
          history.length > 0 &&
          history[history.length - 1].generated_content &&
          history[history.length - 1].generated_content.infrastructure
        ) {
          setShowAIPrompt(false)
          const infra = history[history.length - 1].generated_content.infrastructure
          const nestedFiles = createNestedStructure(infra)
          const response = history[history.length - 1].generated_content;
          setApiResponse(response);

          setFiles(nestedFiles)
          
          // Set first file as selected
          const firstFile = getFirstFileName(nestedFiles)
          if (firstFile) {
            setSelectedFile(firstFile)
          }

          // Set chat messages from history
          const chatMessagesFromHistory: ChatMessage[] = history.map(item => ({
            id: item.id,
            type: "user",
            content: item.prompt_content,
            timestamp: new Date(),
          }))
          setChatMessages(chatMessagesFromHistory)
        } else {
          setShowAIPrompt(true)
        }
      })
      .catch(() => setShowAIPrompt(true))
  }

  const handleChatSubmit = async () => {
    if (!chatInput.trim()) return

    const currentPrompt = chatInput
    setChatInput("")
    setIsGenerating(true)

    try {
      const response = await fetch(`${apiUrl}/terraform/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cloud_provider: project?.provider || "aws",
          prompt: currentPrompt,
          provider: "gemini",
          user_id: 1,
          workspace_id: workspaceId,
        }),
      })

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
      }

      const data: ApiResponse = await response.json()
      getWorkspaceChatHistory(workspaceId);

      toast({
        title: "Infrastructure Generated!",
        description: `Successfully created ${Object.keys(data.infrastructure).length} Terraform files.`,
      })
    } catch (error: any) {
      console.error("API Error:", error)

      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate Terraform files.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleVersionTerraformView = async (chatId: string, versionId: number) => {
    if (!chatId) return

    setVersion(versionId);
    setIdeLoading(true);

    try {
      const response = await fetch(`${apiUrl}/prompt-history/${chatId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
      }

      const rawData = await response.json()
      if (!rawData) {
        throw new Error("Invalid API response: Missing infrastructure data")
      }

      const data = rawData.generated_content
      setApiResponse(data)

      if(data?.infrastructure!=null){
        const nestedFiles = createNestedStructure(data.infrastructure)
        setFiles(nestedFiles)
        
        const firstFile = getFirstFileName(nestedFiles)
        if (firstFile) {
          setSelectedFile(firstFile)
        }

        setShowAIPrompt(false)

        if (nestedFiles.modules) {
          setExpandedFolders((prev) => new Set([...prev, "modules"]))
        }
      }else{
        setSelectedFile('');
      }
      
      setIdeLoading(false);
      toast({
        title: "Infrastructure Loaded!",
        description: `Successfully loaded ${Object.keys(data.infrastructure).length} Terraform files.`,
      })
      setVersion(versionId);
    } catch (error: any) {
      console.error("API Error:", error)

      toast({
        title: "Loading Failed",
        description: error.message || "Failed to load Terraform files.",
        variant: "destructive",
      })
    }
  }

  const handleVersionTerraformRestore = async (chatId: string, versionId: number) => {
    if (!chatId) return;
    
    setVersion(chatMessages.length);
    setIdeLoading(true);

    const params = new URLSearchParams({
      prompt_id: chatId.toString(),
      user_id: "1",
      workspace_id: workspaceId.toString(),
    });    

    try {
      const response = await fetch(`${apiUrl}/restore?${params.toString()}`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const rawData = await response.json();
      if (!rawData) {
        throw new Error("Invalid API response: Missing infrastructure data");
      }

      getWorkspaceChatHistory(workspaceId);

      setIdeLoading(false);
      toast({
        title: "Infrastructure Restored!",
        description: `Successfully restored Terraform files.`,
      });
      setVersion(versionId);
    } catch (error: any) {
      console.error("API Error:", error);

      toast({
        title: "Restore Failed",
        description: error.message || "Failed to restore Terraform files.",
        variant: "destructive",
      });
    }
  };

  // Update file content when selected file changes
  useEffect(() => {
    if (selectedFile && Object.keys(files).length > 0) {
      const content = getFileContent(selectedFile, files)
      console.log('Setting content for file:', selectedFile, 'Content length:', content.length)
      setFileContent(content)
    } else {
      setFileContent("")
    }
  }, [selectedFile, files])
  
  const renderFileTree = (structure: FileStructure, path = "") => {
    return Object.entries(structure).map(([key, value]) => {
      const fullPath = path ? `${path}/${key}` : key
      const isFolder = typeof value === "object"
      const isExpanded = expandedFolders.has(fullPath)

      if (isFolder) {
        return (
          <div key={fullPath}>
            <div
              className={cn(
                "flex items-center py-2 px-3 rounded-lg cursor-pointer hover:bg-secondary/80 group transition-colors",
                selectedFile === fullPath && "bg-secondary",
              )}
              onClick={() => toggleFolder(fullPath)}
            >
              <span className="mr-2">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </span>
              <span className="mr-2">
                {isExpanded ? (
                  <FolderOpen className="h-4 w-4 text-amber-500" />
                ) : (
                  <Folder className="h-4 w-4 text-amber-500" />
                )}
              </span>
              <span className="text-sm font-medium">{key}</span>
            </div>
            {isExpanded && <div className="pl-6 mt-1">{renderFileTree(value as FileStructure, fullPath)}</div>}
          </div>
        )
      }

      return (
        <div
          key={fullPath}
          className={cn(
            "flex items-center py-2 px-3 rounded-lg cursor-pointer hover:bg-secondary/80 group transition-colors",
            selectedFile === fullPath && "bg-secondary border-l-2 border-primary",
          )}
          onClick={() => handleFileSelect(fullPath)}
        >
          <span className="mr-2 opacity-0 w-4"></span>
          <span className="mr-2">
            {key.endsWith(".tf") ? (
              <FileCode className="h-4 w-4 text-blue-500" />
            ) : key.endsWith(".sh") ? (
              <Terminal className="h-4 w-4 text-green-500" />
            ) : (
              <FileText className="h-4 w-4 text-gray-500" />
            )}
          </span>
          <span className="text-sm">{key}</span>
        </div>
      )
    })
  }

  const handleContentChange = (content: string) => {
    setFileContent(content);
  
    if (!selectedFile) return;
  
    setFiles((prevFiles) => {
      const updatedFiles = JSON.parse(JSON.stringify(prevFiles));
      const parts = selectedFile.split("/");
      let current = updatedFiles;
  
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (current[part] && typeof current[part] === "object") {
          current = current[part] as FileStructure;
        } else {
          return prevFiles;
        }
      }
  
      const fileName = parts[parts.length - 1];
      if (current[fileName] !== undefined) {
        current[fileName] = content;
      }
  
      return updatedFiles;
    });
  };
  
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
    const content = getFileContent(path, files);
    if (typeof content === "string") {
      setSelectedFile(prevFile => {
        if (prevFile !== path) {
          console.log('File changed from', prevFile, 'to', path);
          setTimeout(() => setFileContent(content), 0);
          return path;
        }
        return prevFile;
      });
    }
  }

  const createNestedStructure = (flatFiles: Record<string, string>): FileStructure => {
    const result: FileStructure = {}

    Object.entries(flatFiles).forEach(([filePath, content]) => {
      const parts = filePath.split("/")
      let current = result

      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i]
        if (!(part in current)) {
          current[part] = {}
        }
        current = current[part] as FileStructure
      }

      const fileName = parts[parts.length - 1]
      current[fileName] = content
    })

    return result
  }

  const getFileContent = (path: string, structure: FileStructure): string => {
    if (!path || !structure) return ""
    
    const parts = path.split("/")
    let current: any = structure
  
    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = current[part]
      } else {
        return ""
      }
    }
  
    return typeof current === "string" ? current : ""
  }

  const getFirstFileName = (structure: FileStructure): string => {
    for (const [key, value] of Object.entries(structure)) {
      if (typeof value === "string") {
        return key
      } else if (typeof value === "object") {
        const nestedFile = getFirstFileName(value as FileStructure)
        if (nestedFile) {
          return `${key}/${nestedFile}`
        }
      }
    }
    return ""
  }

  const getFileLanguage = (filename: string): string => {
    if (filename.endsWith(".tf")) return "hcl"
    if (filename.endsWith(".sh")) return "shell"
    if (filename.endsWith(".json")) return "json"
    if (filename.endsWith(".yaml") || filename.endsWith(".yml")) return "yaml"
    return "plaintext"
  }

  const handleCodePush = () => {
    console.log("Handle git code push triggered");
    const flatFiles = flattenNestedStructure(files);
    console.log("Flat files structure:", flatFiles);
  };

  const flattenNestedStructure = (nestedFiles: FileStructure, parentPath = ""): Record<string, string> => {
    const flatFiles: Record<string, string> = {};
  
    Object.entries(nestedFiles).forEach(([key, value]) => {
      const currentPath = parentPath ? `${parentPath}/${key}` : key;
  
      if (typeof value === "string") {
        flatFiles[currentPath] = value;
      } else if (typeof value === "object") {
        Object.assign(flatFiles, flattenNestedStructure(value as FileStructure, currentPath));
      }
    });
  
    return flatFiles;
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

  // Loading state
  if (!project || !workspace || showAIPrompt === null) {
    return (
      <div className="bg-background flex items-center justify-center h-full">
        <div className="flex items-center gap-4">
          <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
          <div className="text-lg font-medium">Loading workspace</div>
        </div>
      </div>
    )
  }

  // AI Prompt interface
  if (showAIPrompt) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-4xl font-bold mb-4">Generate Infrastructure</h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Describe the infrastructure you want to build and I'll generate the Terraform code for you.
              </p>
            </div>

            <Card className="shadow-lg border-2">
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div>
                    <label className="text-base font-medium mb-3 block">What would you like to build?</label>
                    <Textarea
                      placeholder="Describe your infrastructure... (e.g., 'Create a VPC with public and private subnets, an EKS cluster, and RDS database')"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      className="min-h-[140px] resize-none text-base"
                      disabled={isGenerating}
                    />
                  </div>
                  <Button
                    onClick={handleChatSubmit}
                    className="w-full h-12 text-base"
                    size="lg"
                    disabled={!chatInput.trim() || isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="animate-spin h-5 w-5 mr-3" />
                        Generating Infrastructure...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5 mr-3" />
                        Generate Terraform Files
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Example Prompts */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Example Prompts
                </CardTitle>
                <CardDescription>Click on any example to get started quickly</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      className="text-left justify-start h-auto p-4 hover:bg-muted/50"
                      onClick={() => setChatInput(example)}
                      disabled={isGenerating}
                    >
                      <div className="text-sm leading-relaxed">{example}</div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // Main workspace interface
  return (
    <div className="min-h-screen bg-background">
      <div className="w-full h-screen flex flex-col">
        {/* Enhanced Workspace Header */}
        <div className="border-b bg-gradient-to-r from-card/80 to-card/60 backdrop-blur-sm">
          <div className="px-6 py-6">
            <div className="flex items-center justify-between">
              {/* Left Section - Workspace Info */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center shadow-sm",
                    getProviderColor(project?.provider || "aws")
                  )}>
                    <span className="text-xl">{getProviderIcon(project?.provider || "aws")}</span>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">{workspace?.name}</h1>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-sm text-muted-foreground">{project?.name}</p>
                      <Separator orientation="vertical" className="h-4" />
                      <Badge variant="outline" className="gap-1 text-xs">
                        <Activity className="h-3 w-3" />
                        {project?.provider?.toUpperCase()}
                      </Badge>
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <Code2 className="h-3 w-3" />
                        v{version}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Section - Actions */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
                  <Clock className="h-3 w-3" />
                  Last updated: {workspace?.lastModified?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) || "N/A"}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsChatVisible(!isChatVisible)}
                  className="gap-2 shadow-sm"
                >
                  {isChatVisible ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
                  {isChatVisible ? "Hide Chat" : "Show Chat"}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAnalysisOpen(true)}
                  className="gap-2 shadow-sm"
                >
                  <BarChart3 className="h-4 w-4" />
                  Analyze
                </Button>

                <Button
                  size="sm"
                  className="gap-2 bg-primary hover:bg-primary/90 shadow-sm"
                >
                  <Zap className="h-4 w-4" />
                  Deploy
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Resizable Chat Panel */}
          {isChatVisible && (
            <div className="flex">
              <div 
                className="bg-card border-r flex flex-col"
                style={{ width: `${chatWidth}px` }}
              >
                <div className="border-b px-4 py-3 bg-muted/30">
                  <h3 className="font-semibold flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    AI Chat
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {chatMessages.length} messages
                    </Badge>
                  </h3>
                </div>
                
                <ScrollArea className="flex-1 px-4" ref={chatScrollRef}>
                  <div className="space-y-6 py-4">
                    {chatMessages.map((message, index) => (
                      <div key={message.id} className="space-y-3">
                        <div className="flex gap-3 items-start">
                          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                            <User className="h-4 w-4 text-primary-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-medium">You</span>
                              <span className="text-xs text-muted-foreground">
                                {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                            <div className="bg-muted/50 rounded-lg p-3 text-sm leading-relaxed">
                              {message.content}
                            </div>
                          </div>
                        </div>

                        {/* Version Control */}
                        <div className="ml-11">
                          <Card className="border-dashed bg-muted/20">
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <FileClock className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm font-medium">Version {index + 1}</span>
                                  {index + 1 === version && (
                                    <Badge variant="default" className="text-xs">Current</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleVersionTerraformView(message.id, index + 1)}
                                    className="h-7 px-2 text-xs"
                                  >
                                    View
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleVersionTerraformRestore(message.id, index + 1)}
                                    className="h-7 px-2 text-xs"
                                  >
                                    Restore
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    ))}

                    {isGenerating && (
                      <div className="flex gap-3 items-start">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                          <Bot className="h-4 w-4" />
                        </div>
                        <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
                          <Loader2 className="animate-spin h-4 w-4" />
                          <span className="text-sm">Generating response...</span>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Chat Input */}
                <div className="border-t p-4 bg-muted/20">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Describe your infrastructure needs..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          handleChatSubmit()
                        }
                      }}
                      className="min-h-[60px] resize-none"
                      disabled={isGenerating}
                    />
                    <Button
                      onClick={handleChatSubmit}
                      size="icon"
                      disabled={isGenerating || !chatInput.trim()}
                      className="self-end"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Resize Handle */}
              <div
                ref={resizeRef}
                className="w-1 bg-border hover:bg-primary/50 cursor-col-resize transition-colors"
                onMouseDown={() => setIsResizing(true)}
              >
                <div className="w-full h-full flex items-center justify-center">
                  <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </div>
          )}

          {/* IDE Section */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {ideLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader2 className="animate-spin h-8 w-8 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading Version {version}...</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex overflow-hidden">
                {/* File Explorer */}
                <div className="w-80 bg-muted/30 border-r flex flex-col overflow-hidden">
                  <div className="p-4 border-b bg-muted/50">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Folder className="h-4 w-4" />
                      Project Files
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {Object.keys(files).length} files
                      </Badge>
                    </h3>
                  </div>
                  <ScrollArea className="flex-1 p-3">
                    <div className="space-y-1">
                      {renderFileTree(files)}
                    </div>
                  </ScrollArea>
                </div>

                {/* Code Editor */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* File Header */}
                  <div className="border-b bg-muted/50 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileCode className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">{selectedFile || "No file selected"}</span>
                      {selectedFile && (
                        <Badge variant="outline" className="text-xs">
                          {getFileLanguage(selectedFile)}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2">
                            <GitBranch className="h-4 w-4" />
                            Push
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-80" align="end">
                          <div className="p-4 space-y-4">
                            <div>
                              <h4 className="font-medium mb-2">Select a branch</h4>
                              <p className="text-xs text-muted-foreground">
                                Select which branch you want to sync changes to.
                              </p>
                            </div>
                            <div className="space-y-3">
                              <div>
                                <label className="text-xs text-muted-foreground">Repository</label>
                                <div className="border rounded-md px-3 py-2 text-sm bg-background">
                                  rengaraj02k/my-new-proj
                                </div>
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground">Branch</label>
                                <select className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                                  <option value="main">main</option>
                                  <option value="dev">dev</option>
                                  <option value="feature-branch">feature-branch</option>
                                </select>
                              </div>
                            </div>
                            <div className="flex justify-end">
                              <Button size="sm">Push Changes</Button>
                            </div>
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Monaco Editor */}
                  <div className="flex-1 bg-[#1e1e1e] overflow-hidden">
                    {selectedFile ? (
                      <MonacoEditor
                        key={`${selectedFile}-${version}`}
                        value={getFileContent(selectedFile, files)}
                        onChange={handleContentChange}
                        language={getFileLanguage(selectedFile)}
                        filename={selectedFile}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <div className="text-center">
                          <FileCode className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Select a file to start editing</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Terraform Actions */}
        <div className="border-t bg-card/50">
          <TerraformActions
            projectId={projectId}
            workspaceId={workspaceId}
            tfFiles={flattenNestedStructure(files)}
            orgId={project?.organization_id || ""}
            project={project}
            onAnalyseInfra={() => setIsAnalysisOpen(true)}
          />
        </div>

        {/* Analysis Dialog */}
        <Dialog open={isAnalysisOpen} onOpenChange={setIsAnalysisOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Infrastructure Analysis
              </DialogTitle>
              <DialogDescription>Comprehensive analysis of your Terraform infrastructure</DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="cost" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="cost" className="gap-1">
                  <DollarSign className="h-4 w-4" />
                  Cost
                </TabsTrigger>
                <TabsTrigger value="security" className="gap-1">
                  <Shield className="h-4 w-4" />
                  Security
                </TabsTrigger>
                <TabsTrigger value="Compliance" className="gap-1">
                  <Shield className="h-4 w-4" />
                  Compliance
                </TabsTrigger>
                <TabsTrigger value="pipeline" className="gap-1">
                  <GitBranch className="h-4 w-4" />
                  Pipeline
                </TabsTrigger>
              </TabsList>
              <TabsContent value="cost" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Cost Estimation</CardTitle>
                    <CardDescription>
                      {apiResponse?.cost_summary?.total_monthly_cost
                        ? `Total monthly cost: ${apiResponse.cost_summary.total_monthly_cost}`
                        : "Monthly cost breakdown for your infrastructure"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {apiResponse?.costs && apiResponse.costs.length > 0 ? (
                        <>
                          {apiResponse.costs.map((costItem, index) => (
                            <div key={index} className="space-y-2">
                              <div className="flex justify-between items-start p-3 bg-muted rounded-lg">
                                <div className="flex-1">
                                  <span className="font-medium">{costItem.component}</span>
                                  {costItem.factors && costItem.factors.length > 0 && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      <strong>Factors:</strong> {costItem.factors.slice(0, 2).join(", ")}
                                      {costItem.factors.length > 2 && "..."}
                                    </div>
                                  )}
                                </div>
                                <span className="font-semibold text-sm">{costItem.estimated_monthly_cost}</span>
                              </div>
                            </div>
                          ))}

                          {apiResponse.cost_summary && (
                            <div className="border-t pt-3">
                              <div className="flex justify-between items-center text-lg font-bold">
                                <span>Total Monthly Cost</span>
                                <span className="text-green-600">{apiResponse.cost_summary.total_monthly_cost}</span>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
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
                          <div className="border-t pt-3">
                            <div className="flex justify-between items-center text-lg font-bold">
                              <span>Total Monthly Cost</span>
                              <span className="text-green-600">$15.18</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="security" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Security Analysis
                      {apiResponse?.security?.security_level && (
                        <Badge variant={apiResponse.security.security_level === "High" ? "default" : "secondary"}>
                          {apiResponse.security.security_level}
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {apiResponse?.security
                        ? "Comprehensive security analysis with factors, mitigations, and acceptance criteria"
                        : "Security recommendations and compliance checks"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {apiResponse?.security ? (
                        <>
                          {apiResponse.security.security_factors &&
                            apiResponse.security.security_factors.length > 0 && (
                              <div>
                                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                  Security Factors
                                </h4>
                                <div className="space-y-2">
                                  {apiResponse.security.security_factors.map((factor, index) => (
                                    <div key={index} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                      <p className="text-sm text-green-800">{factor}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm">VPC has DNS resolution enabled</span>
                          </div>
                          <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                            <span className="text-sm">Security group allows all outbound traffic</span>
                          </div>
                        </>
                      )}
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
        terraform_version: 1.5.0`}</pre>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}