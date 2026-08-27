import { useState, type SyntheticEvent } from "react"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ShieldCheck } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { PageHeader } from "@/components/console"
import { useScreen } from "@/services/api/screen"

import { Button, Input, Label, Switch, Textarea } from "@datadack/common-ui"

import { ssoApi } from "../sso.api"
import type { CreateApplicationRequest } from "../sso.types"

const SSO_ROOT = "/managed-apps/sso"
const EMPTY_FORM: CreateApplicationRequest = {
  name: "",
  description: "",
  websiteUrl: "",
  supportEmail: "",
  companyName: "",
  industry: "",
  educationalPlatform: false,
}

export function CreateApplicationPage() {
  useScreen("managed-apps-sso-create")
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [values, setValues] = useState<CreateApplicationRequest>(EMPTY_FORM)
  const createApplication = useMutation({
    mutationFn: ssoApi.createApplication,
    onSuccess: (application) => {
      void queryClient.invalidateQueries({ queryKey: ["sso", "applications"] })
      void navigate(`${SSO_ROOT}/${application.id}`)
    },
  })
  const patch = <K extends keyof CreateApplicationRequest>(
    key: K,
    value: CreateApplicationRequest[K],
  ) => {
    setValues((current) => ({ ...current, [key]: value }))
  }
  const submit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (values.name.trim()) createApplication.mutate({ ...values, name: values.name.trim() })
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        icon={ShieldCheck}
        breadcrumbs={[
          { label: "Managed applications", to: "/managed-apps" },
          { label: "SSO Applications", to: SSO_ROOT },
        ]}
        title="Create SSO application"
        description="Register an application now. You can configure environments, themes, metadata, and policies after it is created."
      />
      <form onSubmit={submit} className="overflow-hidden rounded-md border border-border bg-card">
        <div className="border-b border-border px-5 py-4 sm:px-6">
          <h2 className="text-sm font-semibold">Application details</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Use details your users will recognize on sign-in and support screens.
          </p>
        </div>
        <div className="grid gap-5 px-5 py-5 sm:grid-cols-2 sm:px-6 sm:py-6">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="application-name">Application name</Label>
            <Input
              id="application-name"
              required
              maxLength={120}
              placeholder="InceptOne Webapp"
              value={values.name}
              onChange={(event) => {
                patch("name", event.target.value)
              }}
            />
            <p className="text-[11px] text-muted-foreground">Shown to users when they sign in.</p>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="application-description">Description</Label>
            <Textarea
              id="application-description"
              placeholder="What does this application help users do?"
              rows={3}
              value={values.description}
              onChange={(event) => {
                patch("description", event.target.value)
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="website-url">Website URL</Label>
            <Input
              id="website-url"
              type="url"
              inputMode="url"
              placeholder="https://example.com"
              value={values.websiteUrl}
              onChange={(event) => {
                patch("websiteUrl", event.target.value)
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="support-email">Support email</Label>
            <Input
              id="support-email"
              type="email"
              inputMode="email"
              placeholder="support@example.com"
              value={values.supportEmail}
              onChange={(event) => {
                patch("supportEmail", event.target.value)
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="company-name">Company name</Label>
            <Input
              id="company-name"
              placeholder="Acme Corp"
              value={values.companyName}
              onChange={(event) => {
                patch("companyName", event.target.value)
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="industry">Industry</Label>
            <Input
              id="industry"
              placeholder="Education technology"
              value={values.industry}
              onChange={(event) => {
                patch("industry", event.target.value)
              }}
            />
          </div>
          <div className="flex items-center justify-between gap-5 rounded-md border border-border bg-muted/20 p-4 sm:col-span-2">
            <div>
              <Label htmlFor="educational-platform">Educational platform</Label>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Enable course, student, and learning-management templates for this application.
              </p>
            </div>
            <Switch
              id="educational-platform"
              checked={values.educationalPlatform}
              onCheckedChange={(checked) => {
                patch("educationalPlatform", checked)
              }}
            />
          </div>
          {createApplication.isError ? (
            <p role="alert" className="text-sm text-destructive sm:col-span-2">
              The application could not be created. Check the details and try again.
            </p>
          ) : null}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/15 px-5 py-4 sm:px-6">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              void navigate(SSO_ROOT)
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!values.name.trim() || createApplication.isPending}
            loading={createApplication.isPending}
          >
            {createApplication.isPending ? "Creating…" : "Create application"}
          </Button>
        </div>
      </form>
    </div>
  )
}
