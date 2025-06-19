"use client"

import { useState, useEffect } from "react"
import { ChevronDown, ChevronRight, FileCode, FileText, Folder, FolderOpen, RefreshCw, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { TerraformActions } from "@/components/terraform-actions"

// Sample file structure
const initialFiles = {
  "main.tf": `provider "aws" {
  region = "us-west-2"
}

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  
  tags = {
    Name = "main-vpc"
  }
}

resource "aws_subnet" "public_1" {
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.1.0/24"
  availability_zone = "us-west-2a"
  
  tags = {
    Name = "public-subnet-1"
  }
}

resource "aws_subnet" "public_2" {
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.2.0/24"
  availability_zone = "us-west-2b"
  
  tags = {
    Name = "public-subnet-2"
  }
}`,
  "variables.tf": `variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t2.micro"
}`,
  "outputs.tf": `output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = [aws_subnet.public_1.id, aws_subnet.public_2.id]
}`,
  "modules/": {
    "ec2/": {
      "main.tf": `resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = var.instance_type
  subnet_id     = var.subnet_id
  
  tags = {
    Name = "web-server"
  }
}`,
      "variables.tf": `variable "ami_id" {
  description = "AMI ID for the EC2 instance"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t2.micro"
}

variable "subnet_id" {
  description = "Subnet ID for the EC2 instance"
  type        = string
}`,
    },
  },
}

type FileStructure = {
  [key: string]: string | FileStructure
}

export function FileEditor() {
  const { toast } = useToast()
  const [files, setFiles] = useState<FileStructure>(initialFiles)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["modules/", "modules/ec2/"]))
  const [selectedFile, setSelectedFile] = useState<string>("main.tf")
  const [fileContent, setFileContent] = useState<string>("")

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
      if (selectedFile) {
        const content = getFileContent(selectedFile, files)
        setFileContent(content)
      }
    } catch (error) {
      console.error("Error getting file content:", error)
    }
  }, [selectedFile, files])

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

    setFiles((prev) => updateFileContent(selectedFile, prev, content))
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
            ) : (
              <FileText className="h-4 w-4 text-gray-500" />
            )}
          </span>
          <span className="text-sm">{key}</span>
        </div>
      )
    })
  }

  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="grid grid-cols-[300px_1fr] h-full gap-4">
        {/* File Explorer */}
        <div className="border rounded-md overflow-hidden flex flex-col">
          <div className="p-2 border-b bg-muted/50 flex items-center justify-between">
            <h3 className="text-sm font-medium">File Explorer</h3>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <div className="overflow-auto p-2 flex-1">{renderFileTree(files)}</div>
        </div>

        {/* Code Editor */}
        <div className="border rounded-md overflow-hidden flex flex-col">
          <div className="p-2 border-b bg-muted/50 flex items-center justify-between">
            <div className="flex items-center">
              <h3 className="text-sm font-medium">{selectedFile}</h3>
              <Button variant="ghost" size="icon" className="h-6 w-6 ml-2">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            <textarea
              className="w-full h-full p-4 font-mono text-sm bg-background focus:outline-none resize-none"
              value={fileContent}
              onChange={(e) => handleContentChange(e.target.value)}
              spellCheck={false}
            />
          </div>
        </div>
      </div>

      {/* Terraform Actions */}
      <TerraformActions />
    </div>
  )
}
