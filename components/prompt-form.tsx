"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ArrowRight, Bot, Loader2, Sparkles } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function PromptForm() {
  const router = useRouter()
  const { toast } = useToast()
  const [prompt, setPrompt] = useState("")
  const [model, setModel] = useState("gpt-4")
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Please enter a prompt to generate Terraform code.",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)

    // Simulate generation
    setTimeout(() => {
      setIsGenerating(false)

      toast({
        title: "Terraform code generated",
        description: "Your Terraform code has been successfully generated.",
        variant: "default",
      })

      router.push("/editor")
    }, 2000)
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Terraform Generation Prompt
          </CardTitle>
          <CardDescription>
            Describe the infrastructure you want to create and select an AI model to generate the Terraform code.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="prompt">Prompt</Label>
            <textarea
              id="prompt"
              className="min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Create an AWS infrastructure with a VPC, 2 public subnets, and an EC2 instance with auto-scaling..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Be specific about the resources, regions, and configurations you need.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">AI Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger id="model" className="w-full">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    <span>GPT-4</span>
                  </div>
                </SelectItem>
                <SelectItem value="claude">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    <span>Claude</span>
                  </div>
                </SelectItem>
                <SelectItem value="custom">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    <span>Custom Model</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={handleGenerate} disabled={isGenerating || !prompt.trim()} className="gap-2">
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                Generate Terraform Code
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
