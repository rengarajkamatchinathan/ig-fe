"use client"

import type React from "react"

import { useState } from "react"
import { CheckCircle, Loader2, Play, RefreshCw, Trash2, XCircle, Shield, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type ActionStatus = "idle" | "loading" | "success" | "error"

interface ActionState {
  validate: ActionStatus
  plan: ActionStatus
  apply: ActionStatus
  destroy: ActionStatus
}

export function TerraformActions() {
  const { toast } = useToast()
  const [actionState, setActionState] = useState<ActionState>({
    validate: "idle",
    plan: "idle",
    apply: "idle",
    destroy: "idle",
  })
  const [output, setOutput] = useState<string>("")
  const [currentlyRunning, setCurrentlyRunning] = useState<string[]>([])

  const runSingleAction = async (action: keyof ActionState): Promise<boolean> => {
    return new Promise((resolve) => {
      // Update state to loading
      setActionState((prev) => ({ ...prev, [action]: "loading" }))

      // Add to currently running
      setCurrentlyRunning((prev) => [...prev, action])

      // Simulate action execution
      const messages: Record<string, string> = {
        validate: `Running terraform validate...
Initializing the backend...
Validating configuration files...
Success! The configuration is valid.

`,
        plan: `Running terraform plan...
Initializing the backend...
Refreshing Terraform state in-memory prior to plan...
Generating execution plan...

Terraform will perform the following actions:
  + aws_vpc.main
  + aws_subnet.public_1  
  + aws_subnet.public_2

Plan: 3 to add, 0 to change, 0 to destroy.

`,
        apply: `Running terraform apply...
Initializing the backend...
Applying configuration...

aws_vpc.main: Creating...
aws_vpc.main: Creation complete after 2s
aws_subnet.public_1: Creating...
aws_subnet.public_2: Creating...
aws_subnet.public_1: Creation complete after 1s
aws_subnet.public_2: Creation complete after 1s

Apply complete! Resources: 3 added, 0 changed, 0 destroyed.

`,
        destroy: `Running terraform destroy...
Initializing the backend...
Refreshing Terraform state in-memory prior to destroy...

Terraform will perform the following actions:
  - aws_subnet.public_1
  - aws_subnet.public_2
  - aws_vpc.main

aws_subnet.public_1: Destroying...
aws_subnet.public_2: Destroying...
aws_subnet.public_1: Destruction complete after 1s
aws_subnet.public_2: Destruction complete after 1s
aws_vpc.main: Destroying...
aws_vpc.main: Destruction complete after 2s

Destroy complete! Resources: 3 destroyed.

`,
      }

      // Append to output
      setOutput((prev) => prev + messages[action])

      // Simulate typing effect for the new content
      setTimeout(() => {
        // Remove from currently running
        setCurrentlyRunning((prev) => prev.filter((item) => item !== action))

        // Set success state
        setActionState((prev) => ({ ...prev, [action]: "success" }))

        // Show toast notification
        toast({
          title: `Terraform ${action} completed`,
          description: `The ${action} operation was successful.`,
          variant: "default",
        })

        // Reset to idle after a delay
        setTimeout(() => {
          setActionState((prev) => ({ ...prev, [action]: "idle" }))
        }, 2000)

        resolve(true)
      }, 2000) // Simulate command execution time
    })
  }

  const runActionChain = async (targetAction: keyof ActionState) => {
    try {
      // Clear previous output
      setOutput("")

      // Define the dependency chain
      const dependencies: Record<string, string[]> = {
        validate: [],
        plan: ["validate"],
        apply: ["validate", "plan"],
        destroy: ["validate"], // Destroy should validate first for safety
      }

      const requiredActions = dependencies[targetAction]

      // Check which actions need to be run
      const actionsToRun: string[] = []

      for (const dep of requiredActions) {
        if (actionState[dep as keyof ActionState] !== "success") {
          actionsToRun.push(dep)
        }
      }

      // Add the target action
      actionsToRun.push(targetAction)

      // Remove duplicates and maintain order
      const uniqueActions = [...new Set(actionsToRun)]

      // Show what will be executed
      if (uniqueActions.length > 1) {
        toast({
          title: "Executing command chain",
          description: `Running: ${uniqueActions.join(" → ")}`,
          variant: "default",
        })
      }

      // Execute actions in sequence
      for (const action of uniqueActions) {
        await runSingleAction(action as keyof ActionState)
      }
    } catch (error) {
      toast({
        title: "Execution failed",
        description: "There was an error executing the command chain.",
        variant: "destructive",
      })
    }
  }

  const getButtonVariant = (action: keyof ActionState) => {
    const status = actionState[action]
    if (status === "success") return "default"
    if (status === "error") return "destructive"
    return "outline"
  }

  const getButtonContent = (action: keyof ActionState, label: string, icon: React.ReactNode) => {
    const status = actionState[action]

    if (status === "loading") {
      return (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Running...
        </>
      )
    }

    if (status === "success") {
      return (
        <>
          <CheckCircle className="h-4 w-4" />
          Success
        </>
      )
    }

    if (status === "error") {
      return (
        <>
          <XCircle className="h-4 w-4" />
          Failed
        </>
      )
    }

    return (
      <>
        {icon}
        {label}
      </>
    )
  }

  const isAnyActionRunning = currentlyRunning.length > 0

  const getActionDependencies = (action: keyof ActionState) => {
    const dependencies: Record<string, string[]> = {
      validate: [],
      plan: ["validate"],
      apply: ["validate", "plan"],
      destroy: ["validate"],
    }
    return dependencies[action]
  }

  const getActionDescription = (action: keyof ActionState) => {
    const deps = getActionDependencies(action)
    const unmetDeps = deps.filter((dep) => actionState[dep as keyof ActionState] !== "success")

    if (unmetDeps.length > 0) {
      return `Will run: ${[...unmetDeps, action].join(" → ")}`
    }

    switch (action) {
      case "validate":
        return "Check configuration syntax"
      case "plan":
        return "Preview infrastructure changes"
      case "apply":
        return "Create/update infrastructure"
      case "destroy":
        return "Remove all infrastructure"
      default:
        return ""
    }
  }

  return (
    <Card className="mt-4">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Terraform Operations</CardTitle>
        <CardDescription>Execute Terraform commands with automatic dependency resolution</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Command Buttons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Validate */}
          <div className="space-y-2">
            <Button
              variant={getButtonVariant("validate")}
              size="lg"
              className={cn(
                "w-full h-16 flex flex-col gap-1",
                actionState.validate === "success" && "border-green-500 bg-green-50 text-green-700 hover:bg-green-100",
                actionState.validate === "error" && "border-red-500 bg-red-50 text-red-700 hover:bg-red-100",
                currentlyRunning.includes("validate") && "border-blue-500 bg-blue-50 text-blue-700",
              )}
              disabled={isAnyActionRunning}
              onClick={() => runActionChain("validate")}
            >
              {getButtonContent("validate", "Validate", <Shield className="h-5 w-5" />)}
            </Button>
            <p className="text-xs text-muted-foreground text-center">{getActionDescription("validate")}</p>
          </div>

          {/* Plan */}
          <div className="space-y-2">
            <Button
              variant={getButtonVariant("plan")}
              size="lg"
              className={cn(
                "w-full h-16 flex flex-col gap-1",
                actionState.plan === "success" && "border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100",
                actionState.plan === "error" && "border-red-500 bg-red-50 text-red-700 hover:bg-red-100",
                currentlyRunning.includes("plan") && "border-blue-500 bg-blue-50 text-blue-700",
              )}
              disabled={isAnyActionRunning}
              onClick={() => runActionChain("plan")}
            >
              {getButtonContent("plan", "Plan", <Play className="h-5 w-5" />)}
            </Button>
            <p className="text-xs text-muted-foreground text-center">{getActionDescription("plan")}</p>
          </div>

          {/* Apply */}
          <div className="space-y-2">
            <Button
              variant={getButtonVariant("apply")}
              size="lg"
              className={cn(
                "w-full h-16 flex flex-col gap-1",
                actionState.apply === "success" && "border-green-500 bg-green-50 text-green-700 hover:bg-green-100",
                actionState.apply === "error" && "border-red-500 bg-red-50 text-red-700 hover:bg-red-100",
                currentlyRunning.includes("apply") && "border-blue-500 bg-blue-50 text-blue-700",
              )}
              disabled={isAnyActionRunning}
              onClick={() => runActionChain("apply")}
            >
              {getButtonContent("apply", "Apply", <CheckCircle className="h-5 w-5" />)}
            </Button>
            <p className="text-xs text-muted-foreground text-center">{getActionDescription("apply")}</p>
          </div>

          {/* Destroy */}
          <div className="space-y-2">
            <Button
              variant={getButtonVariant("destroy")}
              size="lg"
              className={cn(
                "w-full h-16 flex flex-col gap-1",
                actionState.destroy === "success" &&
                  "border-orange-500 bg-orange-50 text-orange-700 hover:bg-orange-100",
                actionState.destroy === "error" && "border-red-500 bg-red-50 text-red-700 hover:bg-red-100",
                actionState.destroy === "idle" && "border-red-200 text-red-600 hover:bg-red-50",
                currentlyRunning.includes("destroy") && "border-blue-500 bg-blue-50 text-blue-700",
              )}
              disabled={isAnyActionRunning}
              onClick={() => runActionChain("destroy")}
            >
              {getButtonContent("destroy", "Destroy", <Trash2 className="h-5 w-5" />)}
            </Button>
            <p className="text-xs text-muted-foreground text-center">{getActionDescription("destroy")}</p>
          </div>
        </div>

        {/* Workflow Steps */}
        <div className="flex items-center justify-center space-x-2 py-4">
          <div className="flex items-center space-x-2">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium",
                actionState.validate === "success"
                  ? "bg-green-100 text-green-700 border-2 border-green-500"
                  : currentlyRunning.includes("validate")
                    ? "bg-blue-100 text-blue-700 border-2 border-blue-500"
                    : "bg-gray-100 text-gray-500 border-2 border-gray-300",
              )}
            >
              1
            </div>
            <span className="text-sm font-medium">Validate</span>
          </div>

          <div className="w-8 h-0.5 bg-gray-300"></div>

          <div className="flex items-center space-x-2">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium",
                actionState.plan === "success"
                  ? "bg-blue-100 text-blue-700 border-2 border-blue-500"
                  : currentlyRunning.includes("plan")
                    ? "bg-blue-100 text-blue-700 border-2 border-blue-500"
                    : "bg-gray-100 text-gray-500 border-2 border-gray-300",
              )}
            >
              2
            </div>
            <span className="text-sm font-medium">Plan</span>
          </div>

          <div className="w-8 h-0.5 bg-gray-300"></div>

          <div className="flex items-center space-x-2">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium",
                actionState.apply === "success"
                  ? "bg-green-100 text-green-700 border-2 border-green-500"
                  : currentlyRunning.includes("apply")
                    ? "bg-blue-100 text-blue-700 border-2 border-blue-500"
                    : "bg-gray-100 text-gray-500 border-2 border-gray-300",
              )}
            >
              3
            </div>
            <span className="text-sm font-medium">Apply</span>
          </div>

          <div className="w-8 h-0.5 bg-gray-300"></div>

          <div className="flex items-center space-x-2">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium",
                actionState.destroy === "success"
                  ? "bg-orange-100 text-orange-700 border-2 border-orange-500"
                  : currentlyRunning.includes("destroy")
                    ? "bg-blue-100 text-blue-700 border-2 border-blue-500"
                    : "bg-gray-100 text-gray-500 border-2 border-gray-300",
              )}
            >
              4
            </div>
            <span className="text-sm font-medium">Destroy</span>
          </div>
        </div>

        {/* Currently Running Commands */}
        {currentlyRunning.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-3">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Executing: {currentlyRunning.join(" → ")}
              </span>
            </div>
          </div>
        )}

        {/* Dependency Warning */}
        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <p className="font-medium">Smart Execution</p>
              <p>
                Commands automatically run their dependencies. Clicking "Apply" will run Validate → Plan → Apply if
                needed.
              </p>
            </div>
          </div>
        </div>

        {/* Output Terminal */}
        {output && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Command Output</h4>
            <div className="bg-black text-green-400 p-4 rounded-md text-sm font-mono overflow-auto max-h-[300px] border">
              <pre className="whitespace-pre-wrap">{output}</pre>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={() => {
                setActionState({
                  validate: "idle",
                  plan: "idle",
                  apply: "idle",
                  destroy: "idle",
                })
                setOutput("")
                setCurrentlyRunning([])
              }}
            >
              <RefreshCw className="h-4 w-4" />
              Reset All
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isAnyActionRunning}
              onClick={() => runActionChain("validate")}
              className="gap-2"
            >
              <Shield className="h-4 w-4" />
              Quick Validate
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isAnyActionRunning}
              onClick={() => runActionChain("plan")}
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              Quick Plan
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
