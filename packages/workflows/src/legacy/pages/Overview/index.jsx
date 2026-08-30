import React, { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import {
  ArrowRight,
  Bot,
  Cable,
  CheckCircle2,
  Clock,
  GitBranch,
  KeyRound,
  LayoutTemplate,
  Sparkles,
  XCircle,
} from "lucide-react"

import { Button, Skeleton } from "@datadack/common-ui"

import { accountsApi } from "../../api/accounts"
import { agentsApi } from "../../api/agents"
import { integrationsApi } from "../../api/integrations"
import { workflowsApi } from "../../api/workflows"
import { automationPath, getTransport } from "../../../runtime"

// The section landing page.
//
// It answers one question — "what is running, and is any of it broken?" — and
// then gets out of the way. The version this replaced was four link tiles, which
// is a menu, not an overview: it repeated the sidebar and told nobody whether
// their workflows had fired today.
//
// Every count here is a real read. A tile that renders a plausible zero while
// its query is failing is worse than no tile, so failures show as "—" and the
// card says so rather than reporting success.

export default function Overview() {
  const integrationsEnabled = getTransport().capabilities?.integrations === true

  const workflows = useQuery({
    queryKey: ["workflows", "overview"],
    queryFn: () => workflowsApi.list({ page: 1, pageSize: 100 }),
  })
  const agents = useQuery({
    queryKey: ["agents", "overview"],
    queryFn: () => agentsApi.list({ page: 1, pageSize: 100 }),
  })
  const executions = useQuery({
    queryKey: ["executions", "overview"],
    queryFn: () => workflowsApi.listAllExecutions(),
  })
  const integrations = useQuery({
    queryKey: ["integrations", "overview"],
    queryFn: () => integrationsApi.list({ page: 1, pageSize: 100 }),
    enabled: integrationsEnabled,
  })
  const accounts = useQuery({
    queryKey: ["connected-accounts", "overview"],
    queryFn: () => accountsApi.list(),
    enabled: integrationsEnabled,
  })

  const workflowRows = listOf(workflows.data)
  const agentRows = listOf(agents.data)
  const integrationRows = listOf(integrations.data)
  const accountRows = Array.isArray(accounts.data) ? accounts.data : []
  const executionRows = useMemo(() => listOf(executions.data).slice(0, 8), [executions.data])

  const deployed = workflowRows.filter((w) => w.deploy_status === "deployed").length
  const liveTriggers = integrationRows.filter((row) => row.is_active).length

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
          <Sparkles size={18} className="text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold leading-tight">AI &amp; Workflows</h1>
          <p className="text-xs text-muted-foreground">
            Build agents and visual workflows, and wire them to the apps you already use
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Workflows"
          value={workflowRows.length}
          hint={deployed > 0 ? `${deployed} deployed` : "none deployed yet"}
          icon={GitBranch}
          to={automationPath("workflows")}
          query={workflows}
        />
        <StatCard
          label="Agents"
          value={agentRows.length}
          hint="reusable prompts and tools"
          icon={Bot}
          to={automationPath("agents")}
          query={agents}
        />
        {integrationsEnabled ? (
          <>
            <StatCard
              label="App triggers"
              value={integrationRows.length}
              hint={liveTriggers > 0 ? `${liveTriggers} live` : "none active"}
              icon={Cable}
              to={automationPath("integrations")}
              query={integrations}
            />
            <StatCard
              label="Connections"
              value={accountRows.length}
              hint="third-party accounts"
              icon={KeyRound}
              to={automationPath("integrations")}
              query={accounts}
            />
          </>
        ) : (
          <StatCard
            label="Credentials"
            value={null}
            hint="model and service keys"
            icon={KeyRound}
            to={automationPath("credentials")}
          />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <RecentExecutions rows={executionRows} query={executions} />
        <QuickStart integrationsEnabled={integrationsEnabled} />
      </div>
    </div>
  )
}

// listOf normalises the two list shapes these endpoints use: a bare array, or a
// paged {items,total}. Both are in play, and guessing wrong renders an empty
// section rather than an error.
function listOf(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.items)) return data.items
  return []
}

function StatCard({ label, value, hint, icon: Icon, to, query }) {
  const failed = Boolean(query?.error)
  const loading = Boolean(query?.isLoading)
  return (
    <Link
      to={to}
      className="group rounded-lg border bg-card p-4 transition-colors hover:border-primary/40"
    >
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
        <Icon size={14} className="text-muted-foreground group-hover:text-primary" />
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">
        {loading ? (
          <Skeleton className="h-7 w-10" />
        ) : failed ? (
          // Never a zero we cannot stand behind.
          <span className="text-muted-foreground">—</span>
        ) : value === null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          value
        )}
      </div>
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        {failed ? "could not load" : hint}
      </p>
    </Link>
  )
}

function RecentExecutions({ rows, query }) {
  return (
    <section className="rounded-lg border bg-card">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 className="text-sm font-medium">Recent runs</h2>
          <p className="text-[11px] text-muted-foreground">
            The last few workflow executions across this account
          </p>
        </div>
        <Button asChild size="sm" variant="ghost" className="h-7 gap-1 text-[11px]">
          <Link to={automationPath("workflows")}>
            All workflows
            <ArrowRight size={11} />
          </Link>
        </Button>
      </header>

      {query.isLoading ? (
        <div className="space-y-2 p-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : query.error ? (
        <p className="px-4 py-8 text-center text-xs text-muted-foreground">
          Could not load runs: {query.error.message}
        </p>
      ) : rows.length === 0 ? (
        <p className="px-4 py-10 text-center text-xs text-muted-foreground">
          Nothing has run yet. Deploy a workflow and invoke it, or wire an app trigger.
        </p>
      ) : (
        <ul className="divide-y">
          {rows.map((run, index) => (
            <ExecutionRow key={run.id ?? run.request_id ?? index} run={run} />
          ))}
        </ul>
      )}
    </section>
  )
}

function ExecutionRow({ run }) {
  const status = Number(run.status_code ?? 0)
  const ok = status >= 200 && status < 400
  const workflowId = run.workflow_id
  return (
    <li className="flex items-center gap-3 px-4 py-2.5 text-xs">
      {ok ? (
        <CheckCircle2 size={13} className="shrink-0 text-emerald-500" />
      ) : (
        <XCircle size={13} className="shrink-0 text-destructive" />
      )}
      <div className="min-w-0 flex-1">
        {workflowId ? (
          <Link
            to={automationPath(`workflows/${workflowId}`)}
            className="font-mono text-[11px] text-primary hover:underline"
          >
            {String(workflowId).slice(0, 8)}…
          </Link>
        ) : (
          <span className="text-muted-foreground">unknown workflow</span>
        )}
      </div>
      {typeof run.duration_ms === "number" && (
        <span className="flex items-center gap-1 text-[11px] tabular-nums text-muted-foreground">
          <Clock size={10} />
          {Math.round(run.duration_ms)} ms
        </span>
      )}
      <span className="w-10 text-right text-[11px] tabular-nums text-muted-foreground">
        {status || "—"}
      </span>
    </li>
  )
}

function QuickStart({ integrationsEnabled }) {
  const steps = [
    {
      to: automationPath("templates"),
      icon: LayoutTemplate,
      title: "Start from a template",
      body: "A working workflow you can edit, rather than an empty canvas.",
    },
    {
      to: automationPath("workflows"),
      icon: GitBranch,
      title: "Build a workflow",
      body: "Drag nodes onto the canvas, then deploy it to a serverless function.",
    },
    integrationsEnabled
      ? {
          to: automationPath("integrations"),
          icon: Cable,
          title: "Connect an app",
          body: "Let GitHub, Slack, Gmail or WhatsApp events start your workflow.",
        }
      : {
          to: automationPath("credentials"),
          icon: KeyRound,
          title: "Add a credential",
          body: "Model API keys and service credentials your nodes can use.",
        },
  ]
  return (
    <section className="rounded-lg border bg-card">
      <header className="border-b px-4 py-3">
        <h2 className="text-sm font-medium">Get started</h2>
      </header>
      <ul className="divide-y">
        {steps.map(({ to, icon: Icon, title, body }) => (
          <li key={title}>
            <Link to={to} className="group flex gap-3 px-4 py-3 hover:bg-muted/40">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted group-hover:bg-primary/10">
                <Icon size={13} className="text-muted-foreground group-hover:text-primary" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium">{title}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{body}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
