import React, { useCallback, useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { AlertCircle, Cable, Loader2, Plug, Trash2, Unplug } from "lucide-react"
import { toast } from "react-toastify"

// Primitives, control-plane clients, transport and link builder all come from
// the workflows package. This surface is a separate package, not a separate
// application: it must render the same components as the studio and read the
// same module-level transport the host configured there.
import {
  accountsApi,
  automationPath,
  Badge,
  Button,
  getTransport,
  integrationsApi,
  Skeleton,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@datadack/workflows/internal"

import { getPlatformMeta } from "./platform-meta"

// The Integrations surface.
//
// Two things live here because they are two halves of one idea, and separating
// them made both harder to reason about:
//
//   Connections — the third-party accounts this tenant has authorised. Owned by
//   the account, not by any workflow: connecting Google once serves every
//   Google-backed trigger.
//   Triggers — the bindings from one of those accounts' event streams to one
//   workflow. This is what actually fires.
//
// A trigger without a live connection is the failure people hit, and it is
// invisible unless the two are shown together — which is why the trigger rows
// name their connection and say when it is missing.

export default function Integrations() {
  const available = getTransport().capabilities?.integrations === true
  if (!available) return <IntegrationsUnavailable />
  return <IntegrationsSurface />
}

function IntegrationsUnavailable() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeading />
      <div className="rounded-lg border border-dashed border-amber-500/30 bg-amber-500/5 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-500" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-amber-600">
              App integrations are not available on this platform
            </p>
            <p className="text-xs text-muted-foreground">
              Workflows still run from their webhook, schedule and manual triggers. Ask an
              operator to enable the integrations service to connect GitHub, Google, Slack and
              the rest.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function IntegrationsSurface() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState("triggers")

  const providers = useQuery({
    queryKey: ["integration-providers"],
    queryFn: () => integrationsApi.providers(),
    staleTime: 10 * 60 * 1000,
    retry: false,
  })

  const integrations = useQuery({
    queryKey: ["integrations", "list"],
    queryFn: () => integrationsApi.list({ page: 1, pageSize: 100 }),
  })

  const accounts = useQuery({
    queryKey: ["connected-accounts"],
    queryFn: () => accountsApi.list(),
  })

  const items = integrations.data?.items ?? []
  const accountRows = Array.isArray(accounts.data) ? accounts.data : []

  // Index the connections so a trigger row can name the one it depends on, and
  // say so when that connection no longer exists.
  const accountsById = useMemo(() => {
    const map = new Map()
    for (const row of accountRows) map.set(row.id, row)
    return map
  }, [accountRows])

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["integrations"] })
    queryClient.invalidateQueries({ queryKey: ["connected-accounts"] })
  }, [queryClient])

  return (
    <div className="flex flex-col gap-6">
      <PageHeading />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="triggers">
            Triggers
            <CountBadge value={items.length} />
          </TabsTrigger>
          <TabsTrigger value="connections">
            Connections
            <CountBadge value={accountRows.length} />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="triggers" className="mt-4">
          <TriggersTable
            rows={items}
            accountsById={accountsById}
            isLoading={integrations.isLoading}
            error={integrations.error}
            onChanged={invalidate}
          />
        </TabsContent>

        <TabsContent value="connections" className="mt-4">
          <ConnectionsPanel
            rows={accountRows}
            providers={providers.data}
            isLoading={accounts.isLoading}
            error={accounts.error}
            onChanged={invalidate}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function PageHeading() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
        <Cable size={18} className="text-primary" />
      </div>
      <div>
        <h1 className="text-lg font-semibold leading-tight">Integrations</h1>
        <p className="text-xs text-muted-foreground">
          Connect the apps your workflows react to, and see what has arrived from them
        </p>
      </div>
    </div>
  )
}

function CountBadge({ value }) {
  if (!value) return null
  return (
    <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums">
      {value}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Triggers
// ---------------------------------------------------------------------------

function TriggersTable({ rows, accountsById, isLoading, error, onChanged }) {
  if (isLoading) return <TableSkeleton />
  if (error) return <LoadError message={error.message} />
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Plug}
        title="No app triggers yet"
        body="Open a workflow, drop an app trigger node onto the canvas, and connect it there. Triggers you create appear here."
        action={
          <Button asChild size="sm" variant="outline">
            <Link to={automationPath("workflows")}>Go to workflows</Link>
          </Button>
        }
      />
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-left text-xs">
        <thead className="border-b bg-muted/40 text-[11px] text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">App</th>
            <th className="px-3 py-2 font-medium">Workflow</th>
            <th className="px-3 py-2 font-medium">Connection</th>
            <th className="px-3 py-2 font-medium">Active</th>
            <th className="px-3 py-2 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <TriggerRow
              key={row.id}
              row={row}
              account={row.account_id ? accountsById.get(row.account_id) : null}
              onChanged={onChanged}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TriggerRow({ row, account, onChanged }) {
  const [busy, setBusy] = useState(false)
  const meta = getPlatformMeta(row.integration_name)

  // A trigger bound to a connection that is gone will fail on its next event
  // with a credential error. Saying so here is the only place it is visible
  // before that happens.
  const connectionMissing = Boolean(row.account_id) && !account

  const toggle = useCallback(
    async (next) => {
      setBusy(true)
      try {
        await integrationsApi.activate(row.id, next)
        toast.success(next ? `${meta.label} trigger enabled` : `${meta.label} trigger paused`)
        onChanged()
      } catch (err) {
        // Activation is what registers the webhook at the provider, so a failure
        // here means the trigger would not have fired. The row deliberately does
        // not move.
        toast.error(`Could not ${next ? "enable" : "pause"} the trigger: ${err.message}`)
      } finally {
        setBusy(false)
      }
    },
    [row.id, meta.label, onChanged],
  )

  const remove = useCallback(async () => {
    if (!globalThis.confirm(`Delete this ${meta.label} trigger? Its webhook is removed too.`)) {
      return
    }
    setBusy(true)
    try {
      await integrationsApi.delete(row.id)
      toast.success(`${meta.label} trigger deleted`)
      onChanged()
    } catch (err) {
      toast.error(`Could not delete the trigger: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }, [row.id, meta.label, onChanged])

  return (
    <tr className="border-b last:border-0">
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <span
            className="flex h-6 w-6 items-center justify-center rounded"
            style={{ background: `${meta.color}1a`, color: meta.color }}
          >
            <meta.icon size={12} />
          </span>
          <span className="font-medium">{meta.label}</span>
        </div>
      </td>
      <td className="px-3 py-2">
        <Link
          className="font-mono text-[11px] text-primary hover:underline"
          to={automationPath(`workflows/${row.workflow_id}`)}
        >
          {row.workflow_id.slice(0, 8)}…
        </Link>
        {row.workflow_version > 0 && (
          <span className="ml-1.5 text-[10px] text-muted-foreground">v{row.workflow_version}</span>
        )}
      </td>
      <td className="px-3 py-2">
        {connectionMissing ? (
          <Badge variant="destructive" className="text-[10px]">
            Connection removed
          </Badge>
        ) : account ? (
          <span className="text-[11px] text-muted-foreground">
            {account.account_label || account.account_email}
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <Switch checked={row.is_active} disabled={busy} onCheckedChange={toggle} />
          {busy && <Loader2 size={11} className="animate-spin text-muted-foreground" />}
        </div>
      </td>
      <td className="px-3 py-2 text-right">
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={remove}
          className="h-7 text-[11px] text-destructive hover:text-destructive"
        >
          <Trash2 size={11} />
        </Button>
      </td>
    </tr>
  )
}

// ---------------------------------------------------------------------------
// Connections
// ---------------------------------------------------------------------------

function ConnectionsPanel({ rows, providers, isLoading, error, onChanged }) {
  const oauth = providers?.oauth ?? {}
  // Only offer what this deployment registered an application for. A button
  // that opens a popup which dead-ends on Google's error page is worse than no
  // button.
  const connectable = Object.entries(oauth).filter(([, enabled]) => enabled)
  const unavailable = Object.entries(oauth).filter(([, enabled]) => !enabled)

  return (
    <div className="flex flex-col gap-4">
      {connectable.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {connectable.map(([provider]) => (
            <ConnectButton key={provider} provider={provider} onChanged={onChanged} />
          ))}
        </div>
      )}

      {isLoading ? (
        <TableSkeleton />
      ) : error ? (
        <LoadError message={error.message} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Unplug}
          title="No accounts connected"
          body={
            connectable.length > 0
              ? "Connect an account above. One connection covers every trigger that provider backs."
              : "This platform has no provider applications configured, so there is nothing to connect yet."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-left text-xs">
            <thead className="border-b bg-muted/40 text-[11px] text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Provider</th>
                <th className="px-3 py-2 font-medium">Account</th>
                <th className="px-3 py-2 font-medium">Scopes</th>
                <th className="px-3 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <ConnectionRow key={row.id} row={row} onChanged={onChanged} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {unavailable.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          Not configured on this platform: {unavailable.map(([p]) => p).join(", ")}.
        </p>
      )}
    </div>
  )
}

function ConnectButton({ provider, onChanged }) {
  const [connecting, setConnecting] = useState(false)
  const meta = getPlatformMeta(provider)

  // The popup posts back when the callback page closes it; that is the only
  // signal the flow finished, because the popup is on its own navigation.
  React.useEffect(() => {
    const handler = (event) => {
      if (event.data?.type === "account-connected" && event.data?.provider === provider) {
        setConnecting(false)
        toast.success(`${meta.label} account connected`)
        onChanged()
      } else if (event.data?.type === "account-connect-error") {
        setConnecting(false)
        toast.error(`Connect failed: ${event.data.error || "unknown error"}`)
      }
    }
    globalThis.addEventListener("message", handler)
    return () => globalThis.removeEventListener("message", handler)
  }, [provider, meta.label, onChanged])

  return (
    <Button
      size="sm"
      variant="outline"
      className="h-8 gap-1.5 text-[11px]"
      disabled={connecting}
      onClick={() => {
        setConnecting(true)
        accountsApi.connect(provider).catch((err) => {
          setConnecting(false)
          toast.error(`Could not start the ${meta.label} connection: ${err.message}`)
        })
      }}
    >
      {connecting ? <Loader2 size={11} className="animate-spin" /> : <meta.icon size={11} />}
      Connect {meta.label}
    </Button>
  )
}

function ConnectionRow({ row, onChanged }) {
  const [busy, setBusy] = useState(false)
  const meta = getPlatformMeta(row.provider)
  const scopeCount = row.scopes ? row.scopes.trim().split(/\s+/).filter(Boolean).length : 0

  const disconnect = useCallback(async () => {
    if (
      !globalThis.confirm(
        `Disconnect ${row.account_label || row.account_email}? Any trigger using it is paused.`,
      )
    ) {
      return
    }
    setBusy(true)
    try {
      await accountsApi.disconnect(row.id)
      toast.success("Account disconnected")
      onChanged()
    } catch (err) {
      toast.error(`Could not disconnect: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }, [row.id, row.account_label, row.account_email, onChanged])

  return (
    <tr className="border-b last:border-0">
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <span
            className="flex h-6 w-6 items-center justify-center rounded"
            style={{ background: `${meta.color}1a`, color: meta.color }}
          >
            <meta.icon size={12} />
          </span>
          <span className="font-medium">{meta.label}</span>
        </div>
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          {row.avatar_url && (
            <img src={row.avatar_url} alt="" className="h-5 w-5 rounded-full object-cover" />
          )}
          <div className="min-w-0">
            <div className="truncate font-medium">{row.account_label || row.account_email}</div>
            {row.account_label && row.account_email && row.account_label !== row.account_email && (
              <div className="truncate text-[10px] text-muted-foreground">{row.account_email}</div>
            )}
          </div>
        </div>
      </td>
      <td className="px-3 py-2 text-[11px] text-muted-foreground">
        {scopeCount > 0 ? `${scopeCount} granted` : "—"}
      </td>
      <td className="px-3 py-2 text-right">
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={disconnect}
          className="h-7 gap-1 text-[11px] text-destructive hover:text-destructive"
        >
          {busy ? <Loader2 size={11} className="animate-spin" /> : <Unplug size={11} />}
          Disconnect
        </Button>
      </td>
    </tr>
  )
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}

function LoadError({ message }) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
      <div className="flex items-start gap-2">
        <AlertCircle size={14} className="mt-0.5 shrink-0 text-destructive" />
        <div className="space-y-1">
          <p className="text-xs font-medium text-destructive">Could not load</p>
          <p className="text-[11px] text-muted-foreground">{message}</p>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
        <Icon size={18} className="text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="mx-auto max-w-md text-xs text-muted-foreground">{body}</p>
      </div>
      {action}
    </div>
  )
}
