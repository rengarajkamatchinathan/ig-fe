"use client"

import { useState, useEffect } from "react"
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

// Enhanced Monaco Editor with One Dark Pro theme
const MonacoEditor = dynamic(() => import("@/components/monaco-editor"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#1e1e1e]">
      <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
      <div className="text-gray-400">Loading editor</div>
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
  
  // Core state
  const [project, setProject] = useState<any>(null)
  const [workspace, setWorkspace] = useState<any>(null)
  const [files, setFiles] = useState<FileStructure>({})
  // debug("Global file state : ", files)
  const [selectedFile, setSelectedFile] = useState<string>("")
  const [fileContent, setFileContent] = useState<string>("")
  const [ideLoading, setIdeLoading] = useState(false);
  
  // UI state
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false)
  const [showAIPrompt, setShowAIPrompt] = useState<boolean | null>(null)
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [version, setVersion] = useState(1);
  
  // API state
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null)
  // debug("Prompt history recent API RESPONSE", apiResponse)
  
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"


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

    // Fetch workspace (you might want to move this to backend as well)
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
          // debug("Prompt history RESPONSE recent", response)
          setApiResponse(response);
          // setApiResponse(history[history.length - 1].generated_content);

          setFiles(nestedFiles)
          
          // Set first file as selected
          const firstFile = getFirstFileName(nestedFiles)
          if (firstFile) {
            setSelectedFile(firstFile)
          }
          
          // debug("Prompt history", history)

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

    // const userMessage: ChatMessage = {
    //   id: Date.now().toString(),
    //   type: "user",
    //   content: chatInput,
    //   timestamp: new Date(),
    // }
    // setChatMessages((prev) => [...prev, userMessage])

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
      // setApiResponse(data)

      // // Process the API response and convert to nested file structure
      // const nestedFiles = createNestedStructure(data.infrastructure)
      // setFiles(nestedFiles)
      
      // // Set first file as selected
      // const firstFile = getFirstFileName(nestedFiles)
      // if (firstFile) {
      //   setSelectedFile(firstFile)
      // }

      // setShowAIPrompt(false)

      // // Auto-expand the modules folder if it exists
      // if (nestedFiles.modules) {
      //   setExpandedFolders((prev) => new Set([...prev, "modules"]))
      // }

      // Add success message
      // const assistantMessage: ChatMessage = {
      //   id: (Date.now() + 1).toString(),
      //   type: "assistant",
      //   content: `Great! I've generated your Terraform infrastructure for "${currentPrompt}". You can now see the files in the explorer and start editing them. The infrastructure includes ${Object.keys(data.infrastructure).length} files.`,
      //   timestamp: new Date(),
      // }

      // setChatMessages((prev) => [...prev, assistantMessage])

      toast({
        title: "Infrastructure Generated!",
        description: `Successfully created ${Object.keys(data.infrastructure).length} Terraform files.`,
      })
    } catch (error: any) {
      console.error("API Error:", error)

      // const errorMessage: ChatMessage = {
      //   id: (Date.now() + 1).toString(),
      //   content: `I'm sorry, there was an error generating your infrastructure: ${error.message}. Please try again.`,
      //   type: "assistant",
      //   timestamp: new Date(),
      // }
      // setChatMessages((prev) => [...prev, errorMessage])

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

    // setIsGenerating(true)

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

      // Process the API response and convert to nested file structure
      if(data?.infrastructure!=null){
        const nestedFiles = createNestedStructure(data.infrastructure)
        setFiles(nestedFiles)
        
        // Set first file as selected
        const firstFile = getFirstFileName(nestedFiles)
        if (firstFile) {
          setSelectedFile(firstFile)
        }

        setShowAIPrompt(false)

        // Auto-expand the modules folder if it exists
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

      // const errorMessage: ChatMessage = {
      //   id: (Date.now() + 1).toString(),
      //   content: `I'm sorry, there was an error loading the infrastructure: ${error.message}. Please try again.`,
      //   type: "assistant",
      //   timestamp: new Date(),
      // }
      // setChatMessages((prev) => [...prev, errorMessage])

      toast({
        title: "Loading Failed",
        description: error.message || "Failed to load Terraform files.",
        variant: "destructive",
      })
    } finally {
      // setIsGenerating(false)
    }
  }
  const handleVersionTerraformRestore = async (chatId: string, versionId: number) => {
    if (!chatId) return;
    // console.log('Debug: Restoring version', versionId, 'for chat ID:', chatId);
    
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

      // const data: ApiResponse = rawData.generated_content;

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
  

  // Render functions
  // Update file content when selected file changes
  useEffect(() => {
    if (selectedFile && Object.keys(files).length > 0) {
      const content = getFileContent(selectedFile, files)
      console.log('Setting content for file:', selectedFile, 'Content length:', content.length) // Debug log
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
  const handleContentChange = (content: string) => {
    setFileContent(content);
  
    // Only update files state if we have a selected file
    if (!selectedFile) return;
  
    setFiles((prevFiles) => {
      const updatedFiles = JSON.parse(JSON.stringify(prevFiles)); // Deep clone
      const parts = selectedFile.split("/");
      let current = updatedFiles;
  
      // Navigate to the correct file in the nested structure
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (current[part] && typeof current[part] === "object") {
          current = current[part] as FileStructure;
        } else {
          // Path doesn't exist, don't update
          return prevFiles;
        }
      }
  
      // Update the content of the selected file
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
      // Use functional updates to ensure consistency
      setSelectedFile(prevFile => {
        if (prevFile !== path) {
          console.log('File changed from', prevFile, 'to', path);
          // Update content in the next tick
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

      // Navigate/create the nested structure
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i]
        if (!(part in current)) {
          current[part] = {}
        }
        current = current[part] as FileStructure
      }

      // Set the file content at the final location
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

  // Code Push Handler for Git
  // This function will handle the git push operation
  const handleCodePush = () => {
    console.log("Handle git code push triggered");
  
    // Convert the current files state back to the flat structure
    const flatFiles = flattenNestedStructure(files);
  
    console.log("Flat files structure:", flatFiles);
    // Call API - Post `/git/push`
  };
  const flattenNestedStructure = (nestedFiles: FileStructure, parentPath = ""): Record<string, string> => {
    const flatFiles: Record<string, string> = {};
  
    Object.entries(nestedFiles).forEach(([key, value]) => {
      const currentPath = parentPath ? `${parentPath}/${key}` : key;
  
      if (typeof value === "string") {
        // If the value is a string, it's a file, so add it to the flat structure
        flatFiles[currentPath] = value;
      } else if (typeof value === "object") {
        // If the value is an object, recursively flatten it
        Object.assign(flatFiles, flattenNestedStructure(value as FileStructure, currentPath));
      }
    });
  
    return flatFiles;
  };

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
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">Generate Infrastructure</h1>
              <p className="text-sm text-muted-foreground mb-6">
                Describe the infrastructure you want to build and I'll generate the Terraform code for you.
              </p>
            </div>

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
          </div>
        </div>
      </div>
    )
  }

  // Main workspace interface
  return (
    <div className="min-h-screen bg-background">
      <div className="w-full">
       <div className="flex gap-4 h-[90vh] px-2 py-0">
          {/* Chat Panel */}
          <div className="w-96 bg-card flex flex-col border h-full py-3 rounded-md">
            <div className="border-b px-3 pb-2 text-sm">
              <button className="font-medium bg-muted px-2 py-1 rounded-md">
               AI Chat
              </button>
            </div>
            <ScrollArea className="flex-1 px-3">
              <div className="space-y-6 mb-6 text-xs">
                {chatMessages.map((message, index) => (
                  <div
                    key={message.id}
                    className="rounded-xl flex gap-3 items-start"
                  >
                    {message.type === "user" && (
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center text-[0.6rem] font-medium opacity-70 gap-2">
                        <h1 className="text-[0.7rem]">Sam K</h1>
                        <p className="text-nowrap font-normal pt-[0.1rem]">
                          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>

                      <div className="min-w-0 p-4 bg-muted/30 rounded-xl gap-3 items-start leading-7 border border-border/50">
                        {message.type === "assistant" ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none text-foreground">
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <div className="text-foreground leading-relaxed">{message.content}</div>
                        )}

                        {/* Version Control */}
                        <div className="flex items-center justify-between w-full border border-opacity-80 hover:border-opacity-100 rounded-md px-2 py-2 mt-2">
                          <span className="font-semibold flex items-center gap-1">
                            <FileClock className="w-4 h-4" />
                            Version {index + 1}
                          </span>

                          <div className="flex items-center gap-1 font-medium">
                            <button
                              className="hover:bg-muted/50 px-2 rounded-md opacity-80 hover:opacity-100"
                              onClick={() => handleVersionTerraformView(message.id,index+1)}
                            >
                              View
                            </button>
                            <button onClick={()=> handleVersionTerraformRestore(message.id,index+1)}
                             className="hover:bg-muted/50 px-2 border rounded-md opacity-80 hover:opacity-100">
                              Restore
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {isGenerating && (
                  <div className="p-4 rounded-xl flex gap-3 items-start bg-muted/30 border border-border/50">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      <span className="text-sm text-foreground">Generating response...</span>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Chat Input */}
            <div className="border-border px-3">
              <div className="flex gap-3 items-end">
                <div className="flex-1 border rounded-xl bg-background p-4 max-w-full">
                  <div className="flex gap-2 items-end">
                    <textarea
                      placeholder="Describe your infrastructure needs..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          handleChatSubmit()
                        }
                      }}
                      className="flex-1 placeholder:text-xs text-xs bg-transparent border-none outline-none resize-none text-foreground placeholder:text-muted-foreground min-h-[60px] max-h-32 overflow-y-auto break-words whitespace-pre-wrap word-wrap"
                      style={{
                        wordWrap: "break-word",
                        overflowWrap: "break-word",
                        whiteSpace: "pre-wrap",
                      }}
                      disabled={isGenerating}
                      rows={2}
                    />
                    {chatInput.trim() && (
                      <Button
                        onClick={handleChatSubmit}
                        size="icon"
                        className="bg-primary hover:bg-primary/90 rounded-lg flex-shrink-0"
                        disabled={isGenerating || !chatInput.trim()}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* IDE Section */}
          <div className="flex-1 flex flex-col border-y border-l rounded-md">
            
            {
            ideLoading?
              <div className="flex items-center justify-center h-full w-full">
                <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading Version {version}</span>
              </div>
            :
              // IDE
              <div className="flex-1 grid grid-cols-12 gap-0 overflow-hidden">
                {/* File Explorer */}
                <div className="border-r col-span-3 bg-muted/30 flex flex-col h-full overflow-hidden">
                  <div className="p-3 border-b flex items-center justify-between flex-shrink-0">
                    <h3 className="text-sm font-medium">Project Files</h3>
                  </div>
                  <ScrollArea className="flex-1 p-2 overflow-auto">
                    {renderFileTree(files)}
                  </ScrollArea>
                </div>

                {/* Main Content Area */}
                <div className="flex flex-col col-span-9 min-w-0 relative h-full overflow-hidden">
                  {/* Code Editor */}
                  <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                   
                    {/* File Header */}
                    <div className="p-2 border-b border-r bg-muted/50 flex items-center justify-between flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <FileCode className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">{selectedFile}</span>
                      </div>
        
                      <span className="flex items-center gap-1 text-[0.65rem] px-2 py-1 font-semibold">
                        {/* <FileClock className="w-4 h-4" /> */}
                        V{version}
                      </span>

                      {/* <button onClick={handleCodePush} title="Push code to repo" className="text-xs border border-gray-400/30 px-2 py-1 rounded-md hover:bg-gray-600/30 font-semibold flex items-center ">
                         <GitBranchIcon className="w-[0.85rem] h-[0.85rem]"/>
                         Push
                      </button> */}
                      <div>
                  <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 border">
                    <GitBranch className="h-5 w-5" />
                  </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent className="w-96" align="end" forceMount>
                  <div className="px-4 py-4 w-full space-y-4">
                    {/* HEADER */}
                    <div>
                    <h1 className="text-[0.9rem] font-medium">Select a branch</h1>
                    <p className="text-xs text-muted-foreground font-medium">
                      Select which branch you want to sync changes to.
                    </p>
                    </div>

                    {/* MAIN */}
                    <div className="text-sm space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Repository</p>
                      <div className="border rounded-md w-full px-2 py-1">rengaraj02k/my-new-proj</div>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">Branch</p>
                      <select className="border rounded-md w-full px-2 py-1">
                      <option value="main">main</option>
                      <option value="dev">dev</option>
                      <option value="feature-branch">feature-branch</option>
                      </select>
                    </div>
                    </div>

                    {/* FINAL PUSH BUTTON */}
                    <div className="text-right">
                    <Button variant={"ghost"} className="px-4 py-2">
                      Push Changes
                    </Button>
                    </div>
                  </div>
                  </DropdownMenuContent>
                  </DropdownMenu>
                      </div>
                    </div>

                    {/* Monaco Editor */}
                    <div className="flex-1 bg-[#1e1e1e] overflow-hidden">
                    <MonacoEditor
                        key={`${selectedFile}-${version}`}
                        value={selectedFile ? getFileContent(selectedFile, files) : ""} // Direct calculation
                        onChange={handleContentChange}
                        language={getFileLanguage(selectedFile)}
                        filename={selectedFile}
                      />
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>

        {/* Terraform Actions */}
        <TerraformActions
          projectId={projectId}
          workspaceId={workspaceId}
          tfFiles={flattenNestedStructure(files)}
          orgId={project?.organization_id || ""}
          project={project}
          onAnalyseInfra={() => setIsAnalysisOpen(true)}
        />
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
