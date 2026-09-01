/* eslint-disable sonarjs/no-nested-conditional -- query states are mutually exclusive render branches */
import { useState } from "react"

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  cn,
} from "@datadack/common-ui"
import { useQuery } from "@tanstack/react-query"
import { ArrowRight, ExternalLink, Globe, Plus, Search, ShieldCheck } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { useScreen } from "@/services/api/screen"


import { ssoApi } from "../sso.api"

const SSO_ROOT = "/managed-apps/sso"

export function ApplicationsListPage() {
  useScreen("managed-apps-sso-applications")
  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const {
    data: apps = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({ queryKey: ["sso", "applications"], queryFn: ssoApi.listApplications })
  const query = search.trim().toLowerCase()
  const filteredApps = apps.filter(
    (app) => app.name.toLowerCase().includes(query) || app.slug.toLowerCase().includes(query),
  )

  return (
    <div className="managed-apps-console -mx-4 -my-6 min-h-[calc(100vh-96px-0.5rem)] px-4 py-5 md:-mx-6 md:min-h-[calc(100vh-52px-0.5rem)] md:px-6 lg:-mx-8 lg:px-8 lg:py-6">
      <header className="mb-5 flex flex-col gap-3 border-b border-border pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <span className="managed-kicker font-mono text-[10px] uppercase text-primary">
            Managed applications
          </span>
          <h1 className="mt-1.5 text-2xl font-bold tracking-[-0.03em] sm:text-3xl">
            SSO Applications
          </h1>
          <p className="mt-1.5 max-w-2xl font-mono text-[12px] leading-relaxed text-muted-foreground">
            Register applications and manage their environments, themes, metadata, and access
            policies.
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => {
            void navigate(`${SSO_ROOT}/create`)
          }}
        >
          <Plus className="size-3.5" />
          Create application
        </Button>
      </header>

      {isLoading ? (
        <div
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
          aria-busy="true"
          aria-label="Loading applications"
        >
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-48 animate-pulse rounded-md border border-border bg-muted/35"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-md border border-dashed border-border px-6 text-center">
          <ShieldCheck className="mb-3 size-7 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Applications could not be loaded</h2>
          <p className="mt-1 text-sm text-muted-foreground">Refresh the list to try again.</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => {
              void refetch()
            }}
          >
            Try again
          </Button>
        </div>
      ) : apps.length === 0 ? (
        <div className="flex min-h-[360px] flex-col items-center justify-center rounded-md border border-dashed border-border px-6 text-center">
          <div className="mb-4 flex size-11 items-center justify-center rounded-md border border-border bg-muted/30">
            <ShieldCheck className="size-5 text-muted-foreground" />
          </div>
          <h2 className="text-base font-semibold">No SSO applications yet</h2>
          <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
            Register your first application, then configure its environments and sign-in experience.
          </p>
          <Button
            size="sm"
            className="mt-5 gap-1.5"
            onClick={() => {
              void navigate(`${SSO_ROOT}/create`)
            }}
          >
            <Plus className="size-3.5" />
            Create application
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center rounded-md border border-border bg-card p-2">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                aria-label="Search SSO applications"
                placeholder="Search by name or slug…"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                }}
                className="h-8 pl-9 text-sm"
              />
            </div>
          </div>
          {filteredApps.length === 0 ? (
            <div className="py-16 text-center">
              <h2 className="text-sm font-semibold">No matching applications</h2>
              <p className="mt-1 text-sm text-muted-foreground">Try a different name or slug.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredApps.map((app) => (
                <Card
                  key={app.id}
                  className="group flex h-full cursor-pointer flex-col rounded-md shadow-none transition-colors hover:border-primary/55"
                  onClick={() => {
                    void navigate(`${SSO_ROOT}/${app.id}`)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault()
                      void navigate(`${SSO_ROOT}/${app.id}`)
                    }
                  }}
                  role="link"
                  tabIndex={0}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 space-y-1">
                        <CardTitle className="truncate text-base font-semibold">
                          {app.name}
                        </CardTitle>
                        <CardDescription className="truncate font-mono text-[11px]">
                          {app.slug}
                        </CardDescription>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                          app.is_active
                            ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "border-border bg-muted text-muted-foreground",
                        )}
                      >
                        {app.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 pb-4">
                    <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                      {app.description || "No description provided."}
                    </p>
                    {app.website_url ? (
                      <a
                        href={app.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 flex max-w-full items-center gap-1.5 text-xs text-primary hover:underline"
                        onClick={(event) => {
                          event.stopPropagation()
                        }}
                      >
                        <Globe className="size-3 shrink-0" />
                        <span className="truncate">{app.website_url}</span>
                        <ExternalLink className="size-3 shrink-0" />
                      </a>
                    ) : null}
                  </CardContent>
                  <CardFooter className="justify-between border-t border-border pt-3">
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {app.id.slice(0, 8)}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-foreground">
                      Configure <ArrowRight className="size-3.5" />
                    </span>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
