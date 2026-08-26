import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Label,
  PageHeader,
  Switch,
  Textarea,
  cn,
  css,
} from "@datadack/common-ui"
import { ArrowRight, ExternalLink, Globe, Plus, Search, ShieldCheck } from "lucide-react"

import { ssoApi } from "../sso.api"
import type { CreateApplicationRequest } from "../sso.types"

const searchContainerClass = css`
  position: relative;
  max-width: 400px;
  width: 100%;
  margin-bottom: 24px;
`

const gridClass = css`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
`

const cardClass = css`
  display: flex;
  flex-direction: column;
  height: 100%;
  transition: all 0.2s ease-in-out;
  cursor: pointer;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.05);
    border-color: var(--primary);
  }
`

export function ApplicationsListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [createOpen, setCreateOpen] = useState(false)

  // Form states
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [supportEmail, setSupportEmail] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [industry, setIndustry] = useState("")
  const [educationalPlatform, setEducationalPlatform] = useState(false)

  const { data: apps = [], isLoading } = useQuery({
    queryKey: ["sso", "applications"],
    queryFn: ssoApi.listApplications,
  })

  const createMutation = useMutation({
    mutationFn: (payload: CreateApplicationRequest) => ssoApi.createApplication(payload),
    onSuccess: (newApp) => {
      queryClient.invalidateQueries({ queryKey: ["sso", "applications"] })
      setCreateOpen(false)
      // Reset form
      setName("")
      setDescription("")
      setWebsiteUrl("")
      setSupportEmail("")
      setCompanyName("")
      setIndustry("")
      setEducationalPlatform(false)
      // Go to details
      navigate(`/managed-apps/sso/${newApp.id}`)
    },
  })

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    createMutation.mutate({
      name,
      description,
      websiteUrl,
      supportEmail,
      companyName,
      industry,
      educationalPlatform,
    })
  }

  const filteredApps = apps.filter(
    (app) =>
      app.name.toLowerCase().includes(search.toLowerCase()) ||
      app.slug.toLowerCase().includes(search.toLowerCase()),
  )

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )
    }

    if (apps.length === 0) {
      return (
        <EmptyState
          title="No SSO Applications"
          description="Create an SSO application to configure environment variables, design theme templates, metadata profiles, and access policies."
          icon={ShieldCheck}
          action={{
            label: "Create Application",
            onClick: () => setCreateOpen(true),
          }}
        />
      )
    }

    return (
      <div>
        <div className={searchContainerClass}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search applications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className={gridClass}>
          {filteredApps.map((app) => (
            <Card key={app.id} className={cardClass} onClick={() => navigate(`/managed-apps/sso/${app.id}`)}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      {app.name}
                    </CardTitle>
                    <CardDescription className="font-mono text-xs text-muted-foreground">
                      slug: {app.slug}
                    </CardDescription>
                  </div>
                  <div
                    className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-semibold",
                      app.is_active
                        ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
                    )}
                  >
                    {app.is_active ? "Active" : "Inactive"}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 pb-4">
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                  {app.description || "No description provided."}
                </p>
                {app.website_url && (
                  <div className="flex items-center gap-2 text-xs text-primary font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
                    <Globe className="h-3 w-3" />
                    <a href={app.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                      {app.website_url} <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-3 border-t border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  ID: {app.id.substring(0, 8)}...
                </span>
                <Button variant="ghost" size="sm" className="gap-1.5 pr-2">
                  Configure <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="SSO Applications"
        description="Register applications, manage environment-specific variables, design styling themes, and define metadata constraints."
        actions={
          apps.length > 0 && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Create Application
            </Button>
          )
        }
      />

      {renderContent()}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader>
              <DialogTitle>Create SSO Application</DialogTitle>
              <DialogDescription>
                Provide the details below to register a new application.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1">
                <Label htmlFor="name">Application Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g. InceptOne Webapp"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="What is this application about?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="websiteUrl">Website URL</Label>
                  <Input
                    id="websiteUrl"
                    type="url"
                    placeholder="https://example.com"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="supportEmail">Support Email</Label>
                  <Input
                    id="supportEmail"
                    type="email"
                    placeholder="support@example.com"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    placeholder="e.g. Acme Corp"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    placeholder="e.g. EdTech"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-3 shadow-sm">
                <div className="space-y-0.5">
                  <Label htmlFor="educationalPlatform">Educational Platform</Label>
                  <div className="text-[11px] text-muted-foreground">
                    Enables special courses and student LMS templates.
                  </div>
                </div>
                <Switch
                  id="educationalPlatform"
                  checked={educationalPlatform}
                  onCheckedChange={setEducationalPlatform}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || !name.trim()}>
                {createMutation.isPending ? "Creating..." : "Create Application"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
