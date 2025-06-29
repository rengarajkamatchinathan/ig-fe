"use client";

import React, { useEffect, useState } from "react";
import {
  CheckCircle,
  Loader2,
  Play,
  RefreshCw,
  Trash2,
  XCircle,
  Shield,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ActionStatus = "idle" | "loading" | "success" | "error";

interface ActionState {
  validate: ActionStatus;
  plan: ActionStatus;
  apply: ActionStatus;
  destroy: ActionStatus;
  compliance: ActionStatus;
}

interface Credential {
  credential_id: number;
  cloud_provider_id: number;
  name?: string;
}

interface TerraformActionsProps {
  onAnalyseInfra?: () => void;
  projectId: string;
  workspaceId: string;
  tfFiles: Record<string, string>;
  orgId: string;
  project?: {
    provider?: string;
  };
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function TerraformActions({
  onAnalyseInfra,
  projectId,
  workspaceId,
  tfFiles,
  orgId,
  project,
}: TerraformActionsProps) {
  const { toast } = useToast();
  const [actionState, setActionState] = useState<ActionState>({
    validate: "idle",
    plan: "idle",
    apply: "idle",
    destroy: "idle",
    compliance: "idle",
  });
  const [output, setOutput] = useState<string>("");
  const [currentlyRunning, setCurrentlyRunning] = useState<string[]>([]);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [selectedCredentialId, setSelectedCredentialId] = useState("");
  const [credentialsLoading, setCredentialsLoading] = useState(false);
  const [credentialsError, setCredentialsError] = useState("");
  const [terminalOutput, setTerminalOutput] = useState("");
  const [isPlanning, setIsPlanning] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    setCredentialsLoading(true);
    setCredentialsError("");
    console.log("Fetching credentials for org:", orgId);
    fetch(`${API_BASE_URL}/credentials/org/${orgId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch credentials");
        return res.json();
      })
      .then((data: Credential[]) => {
        console.log("Received credentials:", data);
        setCredentials(data);
        if (data.length === 0) {
          setCredentialsError(
            "No credentials found for this organization. Please add credentials first."
          );
        } else {
          // Find the first credential matching the project's cloud provider
          const projectProvider = project?.provider?.toLowerCase() || "aws";

          // Set default credential IDs based on provider
          let defaultCredId: number | undefined;
          if (projectProvider === "aws") {
            defaultCredId = 6;
          } else if (projectProvider === "azure") {
            defaultCredId = 3;
          }

          // First try to find the default credential
          let matchingCred = data.find(
            (cred) => cred.credential_id === defaultCredId
          );

          // If default not found, fall back to provider type matching
          if (!matchingCred) {
            matchingCred = data.find((cred) => {
              const credProvider =
                cred.cloud_provider_id === 1
                  ? "aws"
                  : cred.cloud_provider_id === 2
                  ? "azure"
                  : "gcp";
              return credProvider === projectProvider;
            });
          }

          if (matchingCred) {
            console.log("Selected credential:", matchingCred.credential_id);
            setSelectedCredentialId(matchingCred.credential_id.toString());
          } else {
            setCredentialsError(
              `No matching credentials found for ${projectProvider.toUpperCase()}. Using default credential ID: ${defaultCredId}`
            );
            if (defaultCredId) {
              setSelectedCredentialId(defaultCredId.toString());
            }
          }
        }
      })
      .catch((err) => {
        console.error("Error fetching credentials:", err);
        setCredentialsError("Failed to load credentials. Please try again.");
      })
      .finally(() => {
        setCredentialsLoading(false);
      });
  }, [orgId, project]);

  const handlePlan = async () => {
    if (!selectedCredentialId) {
      setTerminalOutput(
        "Error: No valid credential found for this project's cloud provider."
      );
      return;
    }

    // Convert to number and validate
    const credentialId = parseInt(selectedCredentialId, 10);
    if (isNaN(credentialId) || credentialId <= 0) {
      setTerminalOutput("Error: Invalid credential ID.");
      return;
    }

    console.log(
      "Using credential_id:",
      credentialId,
      "type:",
      typeof credentialId
    );
    console.log("Available credentials:", credentials);

    const requestData = {
      tf_files: tfFiles,
      project_id: projectId,
      workspace_id: workspaceId,
      credential_id: credentialId,
    };
    console.log("Sending request with data:", requestData);

    setTerminalOutput("");
    setIsPlanning(true);

    try {
      const response = await fetch(`${API_BASE_URL}/terraform/plan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.detail || `HTTP error! status: ${response.status}`
        );
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body available");
      }

      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        setTerminalOutput((prev) => prev + text);
      }
    } catch (error: any) {
      console.error("Plan error:", error);
      setTerminalOutput(
        `Error: ${error.message || "An unknown error occurred"}`
      );
    } finally {
      setIsPlanning(false);
    }
  };

  const runTerraformValidate = async () => {
    if (!selectedCredentialId) {
      toast({
        title: "Error",
        description:
          "No valid credential found for this project's cloud provider.",
        variant: "destructive",
      });
      setActionState((prev) => ({ ...prev, validate: "error" }));
      return;
    }
    const credentialId = parseInt(selectedCredentialId, 10);
    if (isNaN(credentialId) || credentialId <= 0) {
      toast({
        title: "Error",
        description: "Invalid credential ID.",
        variant: "destructive",
      });
      setActionState((prev) => ({ ...prev, validate: "error" }));
      return;
    }
    setActionState((prev) => ({ ...prev, validate: "loading" }));
    setCurrentlyRunning((prev) => [...prev, "validate"]);
    setOutput("");
    try {
      const response = await fetch(`${API_BASE_URL}/terraform/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          workspace_id: workspaceId,
          tf_files: tfFiles,
          credential_id: credentialId,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.detail || `HTTP error! status: ${response.status}`
        );
      }
      if (!response.body) {
        throw new Error("No response body available");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let output = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        output += text;
        setOutput(output);
      }
      setActionState((prev) => ({ ...prev, validate: "success" }));
      toast({
        title: "Validate completed",
        description: "The validate operation was successful.",
        variant: "default",
      });
    } catch (error: any) {
      console.error("Validate error:", error);
      setOutput(`Error: ${error.message || "An unknown error occurred"}`);
      setActionState((prev) => ({ ...prev, validate: "error" }));
      toast({
        title: "Validate failed",
        description: error.message || "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setCurrentlyRunning((prev) => prev.filter((item) => item !== "validate"));
    }
  };

  const runTerraformApply = async () => {
    if (!selectedCredentialId) {
      toast({
        title: "Error",
        description:
          "No valid credential found for this project's cloud provider.",
        variant: "destructive",
      });
      setActionState((prev) => ({ ...prev, apply: "error" }));
      return;
    }
    const credentialId = parseInt(selectedCredentialId, 10);
    if (isNaN(credentialId) || credentialId <= 0) {
      toast({
        title: "Error",
        description: "Invalid credential ID.",
        variant: "destructive",
      });
      setActionState((prev) => ({ ...prev, apply: "error" }));
      return;
    }
    setActionState((prev) => ({ ...prev, apply: "loading" }));
    setCurrentlyRunning((prev) => [...prev, "apply"]);
    setOutput("");
    try {
      const response = await fetch(`${API_BASE_URL}/terraform/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          workspace_id: workspaceId,
          tf_files: tfFiles,
          credential_id: credentialId,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.detail || `HTTP error! status: ${response.status}`
        );
      }
      if (!response.body) {
        throw new Error("No response body available");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let output = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        output += text;
        setOutput(output);
      }
      setActionState((prev) => ({ ...prev, apply: "success" }));
      toast({
        title: "Apply completed",
        description: "The apply operation was successful.",
        variant: "default",
      });
    } catch (error: any) {
      console.error("Apply error:", error);
      setOutput(`Error: ${error.message || "An unknown error occurred"}`);
      setActionState((prev) => ({ ...prev, apply: "error" }));
      toast({
        title: "Apply failed",
        description: error.message || "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setCurrentlyRunning((prev) => prev.filter((item) => item !== "apply"));
    }
  };

  const runTerraformPlan = async () => {
    if (!selectedCredentialId) {
      toast({
        title: "Error",
        description:
          "No valid credential found for this project's cloud provider.",
        variant: "destructive",
      });
      setActionState((prev) => ({ ...prev, plan: "error" }));
      return;
    }

    // Convert to number and validate
    const credentialId = parseInt(selectedCredentialId, 10);
    if (isNaN(credentialId) || credentialId <= 0) {
      toast({
        title: "Error",
        description: "Invalid credential ID.",
        variant: "destructive",
      });
      setActionState((prev) => ({ ...prev, plan: "error" }));
      return;
    }

    setActionState((prev) => ({ ...prev, plan: "loading" }));
    setCurrentlyRunning((prev) => [...prev, "plan"]);
    setOutput("");

    try {
      const response = await fetch(`${API_BASE_URL}/terraform/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          workspace_id: workspaceId,
          tf_files: tfFiles,
          credential_id: credentialId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.detail || `HTTP error! status: ${response.status}`
        );
      }

      if (!response.body) {
        throw new Error("No response body available");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let output = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        output += text;
        setOutput(output);
      }

      setActionState((prev) => ({ ...prev, plan: "success" }));
      toast({
        title: "Plan completed",
        description: "The plan operation was successful.",
        variant: "default",
      });
    } catch (error: any) {
      console.error("Plan error:", error);
      setOutput(`Error: ${error.message || "An unknown error occurred"}`);
      setActionState((prev) => ({ ...prev, plan: "error" }));
      toast({
        title: "Plan failed",
        description: error.message || "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setCurrentlyRunning((prev) => prev.filter((item) => item !== "plan"));
    }
  };

  const runTerraformDestroy = async () => {
    if (!selectedCredentialId) {
      toast({
        title: "Error",
        description:
          "No valid credential found for this project's cloud provider.",
        variant: "destructive",
      });
      setActionState((prev) => ({ ...prev, destroy: "error" }));
      return;
    }
    const credentialId = parseInt(selectedCredentialId, 10);
    if (isNaN(credentialId) || credentialId <= 0) {
      toast({
        title: "Error",
        description: "Invalid credential ID.",
        variant: "destructive",
      });
      setActionState((prev) => ({ ...prev, destroy: "error" }));
      return;
    }
    setActionState((prev) => ({ ...prev, destroy: "loading" }));
    setCurrentlyRunning((prev) => [...prev, "destroy"]);
    setOutput("");
    try {
      const response = await fetch(`${API_BASE_URL}/terraform/destroy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          workspace_id: workspaceId,
          tf_files: tfFiles,
          credential_id: credentialId,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.detail || `HTTP error! status: ${response.status}`
        );
      }
      if (!response.body) {
        throw new Error("No response body available");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let output = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        output += text;
        setOutput(output);
      }
      setActionState((prev) => ({ ...prev, destroy: "success" }));
      toast({
        title: "Destroy completed",
        description: "The destroy operation was successful.",
        variant: "default",
      });
    } catch (error: any) {
      console.error("Destroy error:", error);
      setOutput(`Error: ${error.message || "An unknown error occurred"}`);
      setActionState((prev) => ({ ...prev, destroy: "error" }));
      toast({
        title: "Destroy failed",
        description: error.message || "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setCurrentlyRunning((prev) => prev.filter((item) => item !== "destroy"));
    }
  };

  const runTerraformCompliance = async () => {
    if (!selectedCredentialId) {
      toast({
        title: "Error",
        description:
          "No valid credential found for this project's cloud provider.",
        variant: "destructive",
      });
      setActionState((prev) => ({ ...prev, compliance: "error" }));
      return;
    }
    const credentialId = parseInt(selectedCredentialId, 10);
    if (isNaN(credentialId) || credentialId <= 0) {
      toast({
        title: "Error",
        description: "Invalid credential ID.",
        variant: "destructive",
      });
      setActionState((prev) => ({ ...prev, compliance: "error" }));
      return;
    }
    setActionState((prev) => ({ ...prev, compliance: "loading" }));
    setCurrentlyRunning((prev) => [...prev, "compliance"]);
    setOutput("");
    try {
      const response = await fetch(`${API_BASE_URL}/terraform/compliance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          workspace_id: workspaceId,
          tf_files: tfFiles,
          credential_id: credentialId,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.detail || `HTTP error! status: ${response.status}`
        );
      }
      if (!response.body) {
        throw new Error("No response body available");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let output = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        output += text;
        setOutput(output);
      }
      setActionState((prev) => ({ ...prev, compliance: "success" }));
      toast({
        title: "Compliance completed",
        description: "The compliance check was successful.",
        variant: "default",
      });
    } catch (error: any) {
      console.error("Compliance error:", error);
      setOutput(`Error: ${error.message || "An unknown error occurred"}`);
      setActionState((prev) => ({ ...prev, compliance: "error" }));
      toast({
        title: "Compliance failed",
        description: error.message || "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setCurrentlyRunning((prev) =>
        prev.filter((item) => item !== "compliance")
      );
    }
  };

  const runSingleAction = async (
    action: keyof ActionState | "compliance"
  ): Promise<boolean> => {
    if (action === "plan") {
      await runTerraformPlan();
      return true;
    }
    if (action === "validate") {
      await runTerraformValidate();
      return true;
    }
    if (action === "apply") {
      await runTerraformApply();
      return true;
    }
    if (action === "destroy") {
      await runTerraformDestroy();
      return true;
    }
    if (action === "compliance") {
      await runTerraformCompliance();
      return true;
    }
    return new Promise((resolve) => {
      // Update state to loading
      setActionState((prev) => ({ ...prev, [action]: "loading" }));

      // Add to currently running
      setCurrentlyRunning((prev) => [...prev, action]);

      // Simulate action execution
      const messages: Record<string, string> = {
        validate: `Running terraform validate...
Initializing the backend...
Validating configuration files...
Success! The configuration is valid.

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
      };

      // Append to output
      if (messages[action]) {
        setOutput((prev) => prev + messages[action]);
      }

      // Simulate typing effect for the new content
      setTimeout(() => {
        // Remove from currently running
        setCurrentlyRunning((prev) => prev.filter((item) => item !== action));

        // Set success state
        setActionState((prev) => ({ ...prev, [action]: "success" }));

        // Show toast notification
        toast({
          title: `Terraform ${action} completed`,
          description: `The ${action} operation was successful.`,
          variant: "default",
        });

        // Reset to idle after a delay
        setTimeout(() => {
          setActionState((prev) => ({ ...prev, [action]: "idle" }));
        }, 2000);

        resolve(true);
      }, 2000); // Simulate command execution time
    });
  };

  const runActionChain = async (targetAction: keyof ActionState) => {
    try {
      // Clear previous output
      setOutput("");

      // Define the dependency chain
      const dependencies: Record<string, string[]> = {
        validate: [],
        plan: ["validate"],
        compliance: ["validate", "plan"],
        apply: ["validate", "plan"],
        destroy: ["validate"],
      };

      const requiredActions = dependencies[targetAction];

      // Check which actions need to be run
      const actionsToRun: string[] = [];

      for (const dep of requiredActions) {
        if (actionState[dep as keyof ActionState] !== "success") {
          actionsToRun.push(dep);
        }
      }

      // Add the target action
      actionsToRun.push(targetAction);

      // Remove duplicates and maintain order
      const uniqueActions = [...new Set(actionsToRun)];

      // Show what will be executed
      if (uniqueActions.length > 1) {
        toast({
          title: "Executing command chain",
          description: `Running: ${uniqueActions.join(" → ")}`,
          variant: "default",
        });
      }

      // Execute actions in sequence
      for (const action of uniqueActions) {
        await runSingleAction(action as keyof ActionState);
      }
    } catch (error) {
      toast({
        title: "Execution failed",
        description: "There was an error executing the command chain.",
        variant: "destructive",
      });
    }
  };

  const getButtonVariant = (action: keyof ActionState) => {
    const status = actionState[action];
    if (status === "success") return "default";
    if (status === "error") return "destructive";
    return "outline";
  };

  const getButtonContent = (
    action: keyof ActionState,
    label: string,
    icon: React.ReactNode
  ) => {
    const status = actionState[action];

    if (status === "loading") {
      return (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Running...
        </>
      );
    }

    if (status === "success") {
      return (
        <>
          <CheckCircle className="h-4 w-4" />
          Success
        </>
      );
    }

    if (status === "error") {
      return (
        <>
          <XCircle className="h-4 w-4" />
          {label} Failed
        </>
      );
    }

    return (
      <>
        {icon}
        {label}
      </>
    );
  };

  const isAnyActionRunning = currentlyRunning.length > 0;

  const getActionDependencies = (action: keyof ActionState) => {
    const dependencies: Record<string, string[]> = {
      validate: [],
      plan: ["validate"],
      apply: ["validate", "plan"],
      destroy: ["validate"],
    };
    return dependencies[action];
  };

  const getActionDescription = (action: keyof ActionState) => {
    const deps = getActionDependencies(action);
    const unmetDeps = deps.filter(
      (dep) => actionState[dep as keyof ActionState] !== "success"
    );

    if (unmetDeps.length > 0) {
      return `Will run: ${[...unmetDeps, action].join(" → ")}`;
    }

    switch (action) {
      case "validate":
        return "Check configuration syntax";
      case "plan":
        return "Preview infrastructure changes";
      case "apply":
        return "Create/update infrastructure";
      case "destroy":
        return "Remove all infrastructure";
      default:
        return "";
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          {/* Content on the left */}
          <div className="flex-1">
            <CardTitle className="text-lg">Terraform Operations</CardTitle>
            <CardDescription>
              Execute Terraform commands with automatic dependency resolution
            </CardDescription>
          </div>

          {/* Button on the right with reduced width */}
          <div className="ml-4">
            <Button
              onClick={handlePlan}
              disabled={
                !selectedCredentialId || isPlanning || credentialsLoading
              }
              className="px-6 w-40"
            >
              {isPlanning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Planning...
                </>
              ) : (
                "Run Plan"
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Status Message */}
        {credentialsLoading ? (
          <div className="text-sm text-muted-foreground">
            Loading credentials...
          </div>
        ) : credentialsError ? (
          <div className="text-sm text-red-500">{credentialsError}</div>
        ) : selectedCredentialId ? (
          <div className="text-sm text-green-600">
            Using{" "}
            {credentials.find(
              (c) => c.credential_id.toString() === selectedCredentialId
            )?.cloud_provider_id === 1
              ? "AWS"
              : credentials.find(
                  (c) => c.credential_id.toString() === selectedCredentialId
                )?.cloud_provider_id === 2
              ? "Azure"
              : "GCP"}
            credentials (ID: {selectedCredentialId})
          </div>
        ) : (
          <div className="text-sm text-amber-500">
            No credentials available. Please add credentials in the credentials
            page first.
          </div>
        )}

        {/* Terminal Output */}
        <div className="mt-4 bg-black text-green-400 p-4 rounded-md font-mono text-sm">
          <pre className="whitespace-pre-wrap">
            {terminalOutput || "Terraform output will appear here..."}
          </pre>
        </div>

        {/* Command Buttons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Validate */}
          <div className="space-y-2">
            <Button
              variant={getButtonVariant("validate")}
              size="lg"
              className={cn(
                "w-full h-16 flex flex-col gap-1",
                actionState.validate === "success" &&
                  "border-green-500 bg-green-50 text-green-700 hover:bg-green-100",
                actionState.validate === "error" &&
                  "border-red-500 bg-red-50 text-red-700 hover:bg-red-100",
                currentlyRunning.includes("validate") &&
                  "border-blue-500 bg-blue-50 text-blue-700"
              )}
              disabled={isAnyActionRunning}
              onClick={() => runActionChain("validate")}
            >
              {getButtonContent(
                "validate",
                "Validate",
                <Shield className="h-5 w-5" />
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              {getActionDescription("validate")}
            </p>
          </div>

          {/* Plan */}
          <div className="space-y-2">
            <Button
              variant={getButtonVariant("plan")}
              size="lg"
              className={cn(
                "w-full h-16 flex flex-col gap-1",
                actionState.plan === "success" &&
                  "border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100",
                actionState.plan === "error" &&
                  "border-red-500 bg-red-50 text-red-700 hover:bg-red-100",
                currentlyRunning.includes("plan") &&
                  "border-blue-500 bg-blue-50 text-blue-700"
              )}
              disabled={isAnyActionRunning}
              onClick={() => runActionChain("plan")}
            >
              {getButtonContent("plan", "Plan", <Play className="h-5 w-5" />)}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              {getActionDescription("plan")}
            </p>
          </div>

          {/* Compliance */}
          <div className="space-y-2">
            <Button
              variant={getButtonVariant("compliance")}
              size="lg"
              className={cn(
                "w-full h-16 flex flex-col gap-1",
                actionState.compliance === "success" &&
                  "border-purple-500 bg-purple-50 text-purple-700 hover:bg-purple-100",
                actionState.compliance === "error" &&
                  "border-red-500 bg-red-50 text-red-700 hover:bg-red-100",
                currentlyRunning.includes("compliance") &&
                  "border-blue-500 bg-blue-50 text-blue-700"
              )}
              disabled={isAnyActionRunning}
              onClick={() => runActionChain("compliance" as any)}
            >
              {getButtonContent(
                "compliance",
                "Compliance",
                <Shield className="h-5 w-5" />
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Run compliance checks on your plan
            </p>
          </div>

          {/* Apply */}
          <div className="space-y-2">
            <Button
              variant={getButtonVariant("apply")}
              size="lg"
              className={cn(
                "w-full h-16 flex flex-col gap-1",
                actionState.apply === "success" &&
                  "border-green-500 bg-green-50 text-green-700 hover:bg-green-100",
                actionState.apply === "error" &&
                  "border-red-500 bg-red-50 text-red-700 hover:bg-red-100",
                currentlyRunning.includes("apply") &&
                  "border-blue-500 bg-blue-50 text-blue-700"
              )}
              disabled={isAnyActionRunning}
              onClick={() => runActionChain("apply")}
            >
              {getButtonContent(
                "apply",
                "Apply",
                <CheckCircle className="h-5 w-5" />
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              {getActionDescription("apply")}
            </p>
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
                actionState.destroy === "error" &&
                  "border-red-500 bg-red-50 text-red-700 hover:bg-red-100",
                actionState.destroy === "idle" &&
                  "border-red-200 text-red-600 hover:bg-red-50",
                currentlyRunning.includes("destroy") &&
                  "border-blue-500 bg-blue-50 text-blue-700"
              )}
              disabled={isAnyActionRunning}
              onClick={() => runActionChain("destroy")}
            >
              {getButtonContent(
                "destroy",
                "Destroy",
                <Trash2 className="h-5 w-5" />
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              {getActionDescription("destroy")}
            </p>
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
                  : "bg-gray-100 text-gray-500 border-2 border-gray-300"
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
                  : "bg-gray-100 text-gray-500 border-2 border-gray-300"
              )}
            >
              2
            </div>
            <span className="text-sm font-medium">Plan</span>
          </div>

          <div className="w-8 h-0.5 bg-gray-300"></div>

          {/* Compliance step */}
          <div className="flex items-center space-x-2">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium",
                actionState.compliance === "success"
                  ? "bg-purple-100 text-purple-700 border-2 border-purple-500"
                  : currentlyRunning.includes("compliance")
                  ? "bg-blue-100 text-blue-700 border-2 border-blue-500"
                  : "bg-gray-100 text-gray-500 border-2 border-gray-300"
              )}
            >
              3
            </div>
            <span className="text-sm font-medium">Compliance</span>
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
                  : "bg-gray-100 text-gray-500 border-2 border-gray-300"
              )}
            >
              4
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
                  : "bg-gray-100 text-gray-500 border-2 border-gray-300"
              )}
            >
              5
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
                Commands automatically run their dependencies. Clicking "Apply"
                will run Validate → Plan → Apply if needed.
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
                  compliance: "idle",
                });
                setOutput("");
                setCurrentlyRunning([]);
              }}
            >
              <RefreshCw className="h-4 w-4" />
              Reset All
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              onClick={onAnalyseInfra} // Use the passed prop
            >
              <BarChart3 className="h-4 w-4" />
              Analyze Infrastructure
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
