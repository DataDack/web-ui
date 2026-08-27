import React, { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  CopyButton,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  css,
} from "@datadack/common-ui"
import { KeyRound, Palette, Plug, Plus, Settings, ShieldCheck, Tag, Trash2 } from "lucide-react"

import { PageHeader } from "@/components/console"

import { ssoApi } from "../sso.api"
import type { Application, Configuration, UpdateApplicationRequest } from "../sso.types"

// Emotion styles
const containerClass = css`
  width: 100%;
  padding: 24px;
`

export function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState("credentials")
  const [selectedConfigId, setSelectedConfigId] = useState<string>("")
  const [newEnvOpen, setNewEnvOpen] = useState(false)
  const [newEnvName, setNewEnvName] = useState("")

  // Fetch App details
  const { data: app, isLoading: isAppLoading } = useQuery({
    queryKey: ["sso", "applications", id],
    queryFn: () => ssoApi.getApplication(id!),
    enabled: !!id,
  })

  // Fetch Configurations
  const { data: configs = [], isLoading: isConfigsLoading } = useQuery({
    queryKey: ["sso", "configurations", id],
    queryFn: () => ssoApi.listConfigurations(id!),
    enabled: !!id,
  })

  // Selected configuration details
  const { data: activeConfig } = useQuery({
    queryKey: ["sso", "configuration", selectedConfigId],
    queryFn: () => ssoApi.getConfiguration(selectedConfigId),
    enabled: !!selectedConfigId,
  })

  // Automatically select the first configuration when loaded
  useEffect(() => {
    if (configs.length > 0 && !selectedConfigId) {
      // Prioritize development, fallback to first
      const dev = configs.find((c) => c.env === "development")
      setSelectedConfigId(dev ? dev.id : configs[0].id)
    }
  }, [configs, selectedConfigId])

  // Mutation to create a new environment configuration
  const createConfigMutation = useMutation({
    mutationFn: (env: string) =>
      ssoApi.createConfiguration(id!, {
        env,
        config: {},
        meta_data: {},
      }),
    onSuccess: (newConf) => {
      queryClient.invalidateQueries({ queryKey: ["sso", "configurations", id] })
      setSelectedConfigId(newConf.id)
      setNewEnvOpen(false)
      setNewEnvName("")
    },
  })

  const handleCreateConfig = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEnvName.trim()) return
    createConfigMutation.mutate(newEnvName.trim().toLowerCase())
  }

  if (isAppLoading || isConfigsLoading) {
    return (
      <div className="flex items-center justify-center p-12 h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!app) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-bold">Application not found</h2>
        <Button onClick={() => navigate("/managed-apps/sso")} className="mt-4">
          Back to List
        </Button>
      </div>
    )
  }

  return (
    <div className={containerClass}>
      <PageHeader
        icon={ShieldCheck}
        breadcrumbs={[
          { label: "Managed applications", to: "/managed-apps" },
          { label: "SSO Applications", to: "/managed-apps/sso" },
          { label: app.name },
        ]}
        title={app.name}
        description={`Application slug: ${app.slug}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {configs.length > 0 && (
              <Select value={selectedConfigId} onValueChange={setSelectedConfigId}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select Environment" />
                </SelectTrigger>
                <SelectContent>
                  {configs.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.env.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button variant="outline" size="sm" onClick={() => setNewEnvOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Add Env
            </Button>
          </div>
        }
      />

      {activeConfig ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="credentials" className="gap-2">
              <Plug className="h-4 w-4" /> Integration
            </TabsTrigger>
            <TabsTrigger value="env" className="gap-2">
              <KeyRound className="h-4 w-4" /> Env Vars
            </TabsTrigger>
            <TabsTrigger value="theme" className="gap-2">
              <Palette className="h-4 w-4" /> Theme
            </TabsTrigger>
            <TabsTrigger value="metadata" className="gap-2">
              <Tag className="h-4 w-4" /> Metadata
            </TabsTrigger>
            <TabsTrigger value="policies" className="gap-2">
              <ShieldCheck className="h-4 w-4" /> Policies
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" /> Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="credentials">
            <IntegrationTab app={app} activeConfig={activeConfig} />
          </TabsContent>

          <TabsContent value="env">
            <EnvVarsTab activeConfig={activeConfig} />
          </TabsContent>

          <TabsContent value="theme">
            <ThemeTab activeConfig={activeConfig} />
          </TabsContent>

          <TabsContent value="metadata">
            <MetadataTab activeConfig={activeConfig} />
          </TabsContent>

          <TabsContent value="policies">
            <PoliciesTab activeConfig={activeConfig} />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsTab app={app} configs={configs} />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="text-center p-12 border border-dashed rounded-lg">
          <h3 className="font-semibold text-lg">No Environment Configuration</h3>
          <p className="text-muted-foreground text-sm mb-4">
            This application doesn't have any environments configured.
          </p>
          <Button onClick={() => setNewEnvOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Environment
          </Button>
        </div>
      )}

      <Dialog open={newEnvOpen} onOpenChange={setNewEnvOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <form onSubmit={handleCreateConfig}>
            <DialogHeader>
              <DialogTitle>Add Environment Configuration</DialogTitle>
              <DialogDescription>
                Create a configuration profile for a custom deployment environment (e.g. production,
                staging).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1">
                <Label htmlFor="envName">Environment Name *</Label>
                <Input
                  id="envName"
                  placeholder="e.g. staging"
                  value={newEnvName}
                  onChange={(e) => setNewEnvName(e.target.value)}
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewEnvOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createConfigMutation.isPending || !newEnvName.trim()}>
                {createConfigMutation.isPending ? "Creating..." : "Create Environment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── 0. Integration Tab ────────────────────────────────────────────────────
// Where an application owner learns how to actually call the config endpoint.
// Without this the credentials are undiscoverable: the console reveals an IAM
// key once, and nothing anywhere says that the key prefix is the client id or
// that this endpoint exists.
function IntegrationTab({
  app,
  activeConfig,
}: Readonly<{ app: Application; activeConfig: Configuration }>) {
  const endpoint = `${window.location.origin}/api/v1/managedapps/sso/config`
  const curl = [
    `curl "${endpoint}" \\`,
    `  -H "X-Client-Id: $DATADACK_CLIENT_ID" \\`,
    `  -H "X-Client-Secret: $DATADACK_CLIENT_SECRET" \\`,
    `  -H "X-App-Slug: ${app.slug}" \\`,
    `  -H "X-Env: ${activeConfig.env}"`,
  ].join("\n")

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Client credentials</CardTitle>
          <CardDescription>
            This endpoint authenticates with an IAM access key, not a console session. Create a key
            under IAM &rarr; API keys: the <strong>client ID</strong> is the key prefix shown in that
            list, and the <strong>client secret</strong> is the full key revealed once at creation.
            Any active key in this account can read this application&apos;s configuration, so treat
            it as a server-side secret and never ship it in a browser bundle.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <IntegrationField label="Endpoint" value={endpoint} />
          <IntegrationField label="Application ID" value={app.id} />
          <IntegrationField label="Application slug" value={app.slug} />
          <IntegrationField label="Environment" value={activeConfig.env} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Request headers</CardTitle>
          <CardDescription>
            The secret is read from the header only — it is deliberately not accepted as a query
            parameter, which would leak it into access logs. Identify the application by either
            X-App-Slug or X-App-Id; X-Env defaults to production when omitted.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <HeaderRow name="X-Client-Id" note="IAM key prefix (or the credential UUID)" required />
          <HeaderRow name="X-Client-Secret" note="the raw sk_ key" required />
          <HeaderRow name="X-App-Slug" note={`this application: ${app.slug}`} />
          <HeaderRow name="X-App-Id" note="alternative to X-App-Slug" />
          <HeaderRow name="X-Env" note="defaults to production" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Example</CardTitle>
          <CardDescription>
            Returns this environment&apos;s env variables plus the web theme, metadata and policy
            blocks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="glass-1 overflow-x-auto rounded-lg p-4 font-mono text-xs leading-relaxed">
            {curl}
          </pre>
        </CardContent>
        <CardFooter className="justify-end border-t border-border pt-4">
          <CopyButton value={curl} label="Copy command" copiedLabel="Command copied" />
        </CardFooter>
      </Card>
    </div>
  )
}

function IntegrationField({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0">
      <Label className="text-muted-foreground text-xs">{label}</Label>
      <CopyButton value={value} copiedLabel="Copied" className="text-foreground text-[13px]" />
    </div>
  )
}

function HeaderRow({
  name,
  note,
  required = false,
}: Readonly<{
  name: string
  note: string
  required?: boolean
}>) {
  return (
    <div className="flex items-center gap-3">
      <code className="font-mono text-primary text-xs font-semibold">{name}</code>
      {required && (
        <span className="text-status-warning border-status-warning/40 rounded border px-1.5 py-0.5 text-[10px] uppercase">
          required
        </span>
      )}
      <span className="text-muted-foreground text-xs">{note}</span>
    </div>
  )
}

// ── 1. Env Variables Tab ──────────────────────────────────────────────────
function EnvVarsTab({ activeConfig }: { activeConfig: Configuration }) {
  const queryClient = useQueryClient()
  const [vars, setVars] = useState<{ key: string; value: string }[]>([])
  const [educationalPlatform, setEducationalPlatform] = useState("false")

  useEffect(() => {
    if (activeConfig && activeConfig.config) {
      const list: { key: string; value: string }[] = []
      let ed = "false"
      Object.entries(activeConfig.config).forEach(([k, v]) => {
        if (k === "web") return
        if (k === "EDUCATIONAL_PLATFORM") {
          ed = String(v)
          return
        }
        list.push({ key: k, value: String(v) })
      })
      setVars(list)
      setEducationalPlatform(ed)
    }
  }, [activeConfig])

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, any>) =>
      ssoApi.updateConfigSection(activeConfig.id, "env", "replace", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sso", "configuration", activeConfig.id] })
      alert("Environment variables saved!")
    },
  })

  const handleAddRow = () => {
    setVars([...vars, { key: "", value: "" }])
  }

  const handleRemoveRow = (index: number) => {
    setVars(vars.filter((_, i) => i !== index))
  }

  const handleChangeRow = (index: number, field: "key" | "value", val: string) => {
    const list = [...vars]
    list[index][field] = val
    setVars(list)
  }

  const handleSave = () => {
    const payload: Record<string, any> = {}
    vars.forEach((v) => {
      if (v.key.trim()) {
        payload[v.key.trim().toUpperCase()] = v.value
      }
    })
    payload["EDUCATIONAL_PLATFORM"] = educationalPlatform
    updateMutation.mutate(payload)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Environment variables</CardTitle>
        <CardDescription>
          Customize custom parameters exposed to your application at runtime. Variables defined here
          will be returned under the configuration's root block.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Read-only system key */}
        <div className="flex items-center gap-4 border border-dashed rounded-lg p-3 bg-muted/20">
          <div className="flex-1">
            <span className="font-mono text-xs font-semibold text-primary">
              EDUCATIONAL_PLATFORM
            </span>
          </div>
          <div className="w-[180px]">
            <Select value={educationalPlatform} onValueChange={setEducationalPlatform}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">TRUE</SelectItem>
                <SelectItem value="false">FALSE</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-10"></div>
        </div>

        {vars.map((v, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                placeholder="VARIABLE_NAME"
                value={v.key}
                onChange={(e) => handleChangeRow(i, "key", e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <div className="flex-1">
              <Input
                placeholder="value"
                value={v.value}
                onChange={(e) => handleChangeRow(i, "value", e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleRemoveRow(i)}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <Button variant="outline" size="sm" onClick={handleAddRow}>
          <Plus className="mr-1 h-4 w-4" /> Add Row
        </Button>
      </CardContent>
      <CardFooter className="border-t border-border justify-end pt-4">
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </CardFooter>
    </Card>
  )
}

// ── 2. Theme Tab ──────────────────────────────────────────────────────────
function ThemeTab({ activeConfig }: { activeConfig: Configuration }) {
  const queryClient = useQueryClient()
  const [primaryColor, setPrimaryColor] = useState("#000000")
  const [logoUrl, setLogoUrl] = useState("")
  const [fontFamily, setFontFamily] = useState("Inter")
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    if (activeConfig && activeConfig.config?.web?.theme) {
      const th = activeConfig.config.web.theme
      setPrimaryColor(th.primaryColor || "#000000")
      setLogoUrl(th.logoUrl || "")
      setFontFamily(th.fontFamily || "Inter")
      setDarkMode(!!th.darkMode)
    }
  }, [activeConfig])

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, any>) =>
      ssoApi.updateConfigSection(activeConfig.id, "theme", "replace", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sso", "configuration", activeConfig.id] })
      alert("Theme saved!")
    },
  })

  const handleSave = () => {
    updateMutation.mutate({
      primaryColor,
      logoUrl,
      fontFamily,
      darkMode,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Theme customization</CardTitle>
        <CardDescription>
          Apply customized color palette and logo graphics to dynamic client authentication screens.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="primaryColor">Primary Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                id="primaryColor"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-12 h-10 p-1"
              />
              <Input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fontFamily">Font Family</Label>
            <Input
              id="fontFamily"
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="logoUrl">Logo Image URL</Label>
          <Input
            id="logoUrl"
            placeholder="https://example.com/logo.png"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div>
            <Label htmlFor="darkMode">Dark Mode Theme</Label>
            <div className="text-xs text-muted-foreground">
              Forces dark mode theme as standard fallback.
            </div>
          </div>
          <Switch id="darkMode" checked={darkMode} onCheckedChange={setDarkMode} />
        </div>
      </CardContent>
      <CardFooter className="border-t border-border justify-end pt-4">
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </CardFooter>
    </Card>
  )
}

// ── 3. Metadata Tab ───────────────────────────────────────────────────────
function MetadataTab({ activeConfig }: { activeConfig: Configuration }) {
  const queryClient = useQueryClient()
  const [jsonText, setJsonText] = useState("{}")
  const [jsonError, setJsonError] = useState<string | null>(null)

  useEffect(() => {
    if (activeConfig) {
      const meta = activeConfig.config?.web?.meta_data || {}
      setJsonText(JSON.stringify(meta, null, 2))
    }
  }, [activeConfig])

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, any>) =>
      ssoApi.updateConfigSection(activeConfig.id, "metadata", "replace", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sso", "configuration", activeConfig.id] })
      alert("Metadata saved!")
    },
  })

  const handleSave = () => {
    try {
      const parsed = JSON.parse(jsonText)
      setJsonError(null)
      updateMutation.mutate(parsed)
    } catch (e: any) {
      setJsonError(e.message || "Invalid JSON syntax")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Metadata settings</CardTitle>
        <CardDescription>
          Custom key/value JSON configurations returned to your SSO clients to control feature
          flags, tags, and app options.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          rows={10}
          className="font-mono text-xs"
        />
        {jsonError && <p className="text-red-500 text-xs">{jsonError}</p>}
      </CardContent>
      <CardFooter className="border-t border-border justify-end pt-4">
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </CardFooter>
    </Card>
  )
}

// ── 4. Policies Tab ───────────────────────────────────────────────────────
function PoliciesTab({ activeConfig }: { activeConfig: Configuration }) {
  const queryClient = useQueryClient()
  const [jsonText, setJsonText] = useState("{}")
  const [jsonError, setJsonError] = useState<string | null>(null)

  useEffect(() => {
    if (activeConfig) {
      const pol = activeConfig.config?.web?.policies || {}
      setJsonText(JSON.stringify(pol, null, 2))
    }
  }, [activeConfig])

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, any>) =>
      ssoApi.updateConfigSection(activeConfig.id, "policies", "replace", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sso", "configuration", activeConfig.id] })
      alert("Access policies saved!")
    },
  })

  const handleSave = () => {
    try {
      const parsed = JSON.parse(jsonText)
      setJsonError(null)
      updateMutation.mutate(parsed)
    } catch (e: any) {
      setJsonError(e.message || "Invalid JSON syntax")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Access policies</CardTitle>
        <CardDescription>
          Declare custom access constraints, redirect bounds, and authentication token options.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          rows={10}
          className="font-mono text-xs"
        />
        {jsonError && <p className="text-red-500 text-xs">{jsonError}</p>}
      </CardContent>
      <CardFooter className="border-t border-border justify-end pt-4">
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </CardFooter>
    </Card>
  )
}

// ── 5. Settings Tab ───────────────────────────────────────────────────────
function SettingsTab({ app, configs }: { app: any; configs: Configuration[] }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [name, setName] = useState(app.name)
  const [description, setDescription] = useState(app.description || "")
  const [websiteUrl, setWebsiteUrl] = useState(app.website_url || "")
  const [supportEmail, setSupportEmail] = useState(app.support_email || "")
  const [companyName, setCompanyName] = useState(app.company_name || "")
  const [industry, setIndustry] = useState(app.industry || "")
  const [educationalPlatform, setEducationalPlatform] = useState(false)

  useEffect(() => {
    // Check if EDUCATIONAL_PLATFORM is true in any configuration
    const hasEd = configs.some((c) => c.config?.EDUCATIONAL_PLATFORM === "true")
    setEducationalPlatform(hasEd)
  }, [configs])

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateApplicationRequest) => ssoApi.updateApplication(app.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sso", "applications", app.id] })
      alert("Application details updated!")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => ssoApi.deleteApplication(app.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sso", "applications"] })
      navigate("/managed-apps/sso")
    },
  })

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    updateMutation.mutate({
      name,
      description,
      websiteUrl,
      supportEmail,
      companyName,
      industry,
      educationalPlatform,
    })
  }

  const handleDelete = () => {
    if (
      confirm(
        "Are you absolutely sure you want to delete this SSO Application? This action is permanent and will delete all environment configurations.",
      )
    ) {
      deleteMutation.mutate()
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>General settings</CardTitle>
          <CardDescription>
            Update application information, metadata attributes, and educational platform settings.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleUpdateSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="appName">Application Name *</Label>
              <Input id="appName" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div className="space-y-1">
              <Label htmlFor="appDesc">Description</Label>
              <Textarea
                id="appDesc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="appWebUrl">Website URL</Label>
                <Input
                  id="appWebUrl"
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="appEmail">Support Email</Label>
                <Input
                  id="appEmail"
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="appCompany">Company Name</Label>
                <Input
                  id="appCompany"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="appIndustry">Industry</Label>
                <Input
                  id="appIndustry"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3 shadow-sm">
              <div className="space-y-0.5">
                <Label htmlFor="appEd">Educational Platform</Label>
                <div className="text-[11px] text-muted-foreground">
                  Syncs EDUCATIONAL_PLATFORM true/false to all environments.
                </div>
              </div>
              <Switch
                id="appEd"
                checked={educationalPlatform}
                onCheckedChange={setEducationalPlatform}
              />
            </div>
          </CardContent>
          <CardFooter className="border-t border-border justify-end pt-4">
            <Button type="submit" disabled={updateMutation.isPending || !name.trim()}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card className="border-red-200 dark:border-red-950">
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-400">Danger Zone</CardTitle>
          <CardDescription>
            Deleting this application will invalidate all existing SSO client credentials and revoke
            access to environment variables.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            This action cannot be undone. Please make sure you have backed up any necessary
            configurations.
          </p>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? "Deleting..." : "Delete Application"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
