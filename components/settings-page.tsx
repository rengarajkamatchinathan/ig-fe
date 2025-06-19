"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  AlertCircle,
  CheckCircle2,
  CloudCog,
  CloudIcon,
  CloudLightning,
  Save,
  Eye,
  EyeOff,
  ArrowLeft,
  Terminal,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { ModeToggle } from "@/components/mode-toggle"

export function SettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [provider, setProvider] = useState("aws")
  const [isValidating, setIsValidating] = useState(false)
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [showSecrets, setShowSecrets] = useState(false)
  const [credentials, setCredentials] = useState<any>(null)

  // Form state for each provider
  const [awsCredentials, setAwsCredentials] = useState({
    accessKey: "",
    secretKey: "",
    region: "us-west-2",
  })

  const [azureCredentials, setAzureCredentials] = useState({
    tenantId: "",
    clientId: "",
    clientSecret: "",
    subscriptionId: "",
  })

  const [gcpCredentials, setGcpCredentials] = useState({
    projectId: "",
    serviceAccountKey: "",
  })

  // Load existing credentials on mount
  useEffect(() => {
    const savedCredentials = localStorage.getItem("terraform-credentials")
    if (!savedCredentials) {
      router.push("/")
      return
    }

    const creds = JSON.parse(savedCredentials)
    setCredentials(creds)
    setProvider(creds.provider || "aws")

    if (creds.aws) {
      setAwsCredentials(creds.aws)
    }
    if (creds.azure) {
      setAzureCredentials(creds.azure)
    }
    if (creds.gcp) {
      setGcpCredentials(creds.gcp)
    }
  }, [router])

  const handleValidateCredentials = () => {
    setIsValidating(true)

    // Simulate validation
    setTimeout(() => {
      setIsValidating(false)
      setIsValid(true)

      toast({
        title: "Credentials validated",
        description: "Your cloud provider credentials have been successfully validated.",
        variant: "default",
      })
    }, 1500)
  }

  const handleSaveCredentials = () => {
    const newCredentials = {
      provider,
      aws: awsCredentials,
      azure: azureCredentials,
      gcp: gcpCredentials,
    }

    localStorage.setItem("terraform-credentials", JSON.stringify(newCredentials))
    setCredentials(newCredentials)

    toast({
      title: "Credentials saved",
      description: "Your cloud provider credentials have been successfully updated.",
      variant: "default",
    })
  }

  const maskSecret = (secret: string) => {
    if (!secret) return ""
    if (showSecrets) return secret
    return "*".repeat(Math.min(secret.length, 20))
  }

  if (!credentials) {
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
                <h1 className="text-xl font-semibold">Settings</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <ModeToggle />
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">Manage your cloud provider credentials and application settings.</p>
        </div>

        <div className="grid gap-6">
          {/* Credentials Section */}
          <Card className="shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <CloudCog className="h-6 w-6 text-primary" />
                    Cloud Provider Credentials
                  </CardTitle>
                  <CardDescription>View and update your cloud provider credentials.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowSecrets(!showSecrets)} className="gap-2">
                    {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {showSecrets ? "Hide" : "Show"} Secrets
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={provider} onValueChange={setProvider}>
                <TabsList className="grid grid-cols-3 mb-6">
                  <TabsTrigger value="aws" className="flex items-center gap-2">
                    <CloudIcon className="h-4 w-4" />
                    AWS
                  </TabsTrigger>
                  <TabsTrigger value="azure" className="flex items-center gap-2">
                    <CloudLightning className="h-4 w-4" />
                    Azure
                  </TabsTrigger>
                  <TabsTrigger value="gcp" className="flex items-center gap-2">
                    <CloudCog className="h-4 w-4" />
                    GCP
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="aws">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="aws-access-key">Access Key</Label>
                        <Input
                          id="aws-access-key"
                          placeholder="AKIAIOSFODNN7EXAMPLE"
                          value={showSecrets ? awsCredentials.accessKey : maskSecret(awsCredentials.accessKey)}
                          onChange={(e) => setAwsCredentials({ ...awsCredentials, accessKey: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="aws-secret-key">Secret Key</Label>
                        <Input
                          id="aws-secret-key"
                          type={showSecrets ? "text" : "password"}
                          placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                          value={showSecrets ? awsCredentials.secretKey : maskSecret(awsCredentials.secretKey)}
                          onChange={(e) => setAwsCredentials({ ...awsCredentials, secretKey: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="aws-region">Region</Label>
                      <Input
                        id="aws-region"
                        placeholder="us-west-2"
                        value={awsCredentials.region}
                        onChange={(e) => setAwsCredentials({ ...awsCredentials, region: e.target.value })}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="azure">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="azure-tenant-id">Tenant ID</Label>
                        <Input
                          id="azure-tenant-id"
                          placeholder="00000000-0000-0000-0000-000000000000"
                          value={azureCredentials.tenantId}
                          onChange={(e) => setAzureCredentials({ ...azureCredentials, tenantId: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="azure-client-id">Client ID</Label>
                        <Input
                          id="azure-client-id"
                          placeholder="00000000-0000-0000-0000-000000000000"
                          value={azureCredentials.clientId}
                          onChange={(e) => setAzureCredentials({ ...azureCredentials, clientId: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="azure-client-secret">Client Secret</Label>
                        <Input
                          id="azure-client-secret"
                          type={showSecrets ? "text" : "password"}
                          placeholder="Your client secret"
                          value={
                            showSecrets ? azureCredentials.clientSecret : maskSecret(azureCredentials.clientSecret)
                          }
                          onChange={(e) => setAzureCredentials({ ...azureCredentials, clientSecret: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="azure-subscription-id">Subscription ID</Label>
                        <Input
                          id="azure-subscription-id"
                          placeholder="00000000-0000-0000-0000-000000000000"
                          value={azureCredentials.subscriptionId}
                          onChange={(e) => setAzureCredentials({ ...azureCredentials, subscriptionId: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="gcp">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="gcp-project-id">Project ID</Label>
                      <Input
                        id="gcp-project-id"
                        placeholder="my-project-123456"
                        value={gcpCredentials.projectId}
                        onChange={(e) => setGcpCredentials({ ...gcpCredentials, projectId: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gcp-service-account-key">Service Account Key (JSON)</Label>
                      <textarea
                        id="gcp-service-account-key"
                        className="min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder='{"type": "service_account", "project_id": "my-project", ...}'
                        value={
                          showSecrets ? gcpCredentials.serviceAccountKey : maskSecret(gcpCredentials.serviceAccountKey)
                        }
                        onChange={(e) => setGcpCredentials({ ...gcpCredentials, serviceAccountKey: e.target.value })}
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {isValid === true && (
                <Alert className="mt-6 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <AlertTitle>Credentials validated</AlertTitle>
                  <AlertDescription>Your cloud provider credentials have been successfully validated.</AlertDescription>
                </Alert>
              )}

              {isValid === false && (
                <Alert
                  className="mt-6 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"
                  variant="destructive"
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Validation failed</AlertTitle>
                  <AlertDescription>
                    There was an error validating your credentials. Please check and try again.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={handleValidateCredentials} disabled={isValidating}>
                  {isValidating ? "Validating..." : "Validate Credentials"}
                </Button>
                <Button onClick={handleSaveCredentials} className="gap-2">
                  <Save className="h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Additional Settings Sections */}
          <Card>
            <CardHeader>
              <CardTitle>Application Settings</CardTitle>
              <CardDescription>Configure your application preferences.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Theme</h4>
                    <p className="text-sm text-muted-foreground">Choose your preferred theme</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      Light
                    </Button>
                    <Button variant="outline" size="sm">
                      Dark
                    </Button>
                    <Button variant="outline" size="sm">
                      System
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Auto-save</h4>
                    <p className="text-sm text-muted-foreground">Automatically save changes to Terraform files</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Enabled
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Default AI Model</h4>
                    <p className="text-sm text-muted-foreground">Choose the default AI model for code generation</p>
                  </div>
                  <Button variant="outline" size="sm">
                    GPT-4
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
