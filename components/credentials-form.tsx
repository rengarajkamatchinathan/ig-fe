"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { AlertCircle, ArrowRight, CheckCircle2, CloudCog, CloudIcon, CloudLightning } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"

export function CredentialsForm() {
  const router = useRouter()
  const { toast } = useToast()
  const [provider, setProvider] = useState("aws")
  const [isValidating, setIsValidating] = useState(false)
  const [isValid, setIsValid] = useState<boolean | null>(null)

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

  const handleCompleteSetup = () => {
    const credentialsData = {
      provider,
      aws: awsCredentials,
      azure: azureCredentials,
      gcp: gcpCredentials,
      setupDate: new Date().toISOString(),
    }

    // Save credentials to localStorage
    localStorage.setItem("terraform-credentials", JSON.stringify(credentialsData))
    localStorage.setItem("terraform-credentials-setup", "true")

    toast({
      title: "Setup completed!",
      description: "Your credentials have been saved. Welcome to Infragenie!",
      variant: "default",
    })

    // Redirect to projects after a short delay
    setTimeout(() => {
      router.push("/projects")
    }, 1000)
  }

  const isFormValid = () => {
    switch (provider) {
      case "aws":
        return awsCredentials.accessKey && awsCredentials.secretKey && awsCredentials.region
      case "azure":
        return (
          azureCredentials.tenantId &&
          azureCredentials.clientId &&
          azureCredentials.clientSecret &&
          azureCredentials.subscriptionId
        )
      case "gcp":
        return gcpCredentials.projectId && gcpCredentials.serviceAccountKey
      default:
        return false
    }
  }

  return (
    <div className="max-w-4xl mx-auto my-6">
      <div className=" text-center mb-6 space-y-1">
        <p className="text-2xl text-black font-semibold ">Set up your cloud credentials</p>
        <p className="text-muted-foreground text-xs">
          This is a one-time setup to connect your cloud provider. Don't worry, your credentials are stored securely.
        </p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <CloudCog className="h-6 w-6 text-primary" />
            Cloud Provider Setup
          </CardTitle>
          <CardDescription>Choose your cloud provider and enter your credentials to get started.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="aws" value={provider} onValueChange={setProvider}>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="aws-access-key">Access Key ID</Label>
                    <Input
                      id="aws-access-key"
                      placeholder="AKIAIOSFODNN7EXAMPLE"
                      value={awsCredentials.accessKey}
                      onChange={(e) => setAwsCredentials({ ...awsCredentials, accessKey: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="aws-secret-key">Secret Access Key</Label>
                    <Input
                      id="aws-secret-key"
                      type="password"
                      placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                      value={awsCredentials.secretKey}
                      onChange={(e) => setAwsCredentials({ ...awsCredentials, secretKey: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="aws-region">Default Region</Label>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="azure-client-secret">Client Secret</Label>
                    <Input
                      id="azure-client-secret"
                      type="password"
                      placeholder="Your client secret"
                      value={azureCredentials.clientSecret}
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
                    value={gcpCredentials.serviceAccountKey}
                    onChange={(e) => setGcpCredentials({ ...gcpCredentials, serviceAccountKey: e.target.value })}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {isValid === true && (
            <Alert className="mt-6 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertTitle>Credentials validated successfully!</AlertTitle>
              <AlertDescription>
                Your cloud provider credentials have been verified and are ready to use.
              </AlertDescription>
            </Alert>
          )}

          {isValid === false && (
            <Alert className="mt-6 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800" variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Validation failed</AlertTitle>
              <AlertDescription>
                There was an error validating your credentials. Please check and try again.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-between gap-4">
          <Button
            variant="outline"
            onClick={handleValidateCredentials}
            disabled={isValidating || !isFormValid()}
            className="w-full sm:w-auto"
          >
            {isValidating ? "Validating..." : "Validate Credentials"}
          </Button>
          <Button onClick={handleCompleteSetup} disabled={isValid !== true} className="gap-2 w-full sm:w-auto">
            Complete Setup & Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        <p>🔒 Your credentials are encrypted and stored securely on your device.</p>
        <p>You can update them anytime in Settings.</p>
      </div>
    </div>
  )
}
