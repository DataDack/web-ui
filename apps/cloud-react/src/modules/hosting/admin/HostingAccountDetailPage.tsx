import { useState } from "react"

import {
  Badge,
  Button,
  KeyValueGrid,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusBadge,
} from "@datadack/common-ui"
import { Ban, ExternalLink, Globe, KeyRound, Move, Play, RefreshCw, Trash2 } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"

import { PageHeader, Section } from "@/components/console"

import { HOSTING_ADMIN_ROUTES, JOB_STATUS_TONE } from "../hosting.constants"
import {
  useAdminChangeAccountPlan,
  useAdminHostingAccount,
  useAdminHostingLogin,
  useAdminHostingPlans,
  useAdminMoveAccount,
  useAdminResetPassword,
  useAdminSuspendAccount,
  useAdminSyncAccount,
  useAdminTerminateAccount,
  useAdminUnsuspendAccount,
  useHostingAudit,
  useHostingServers,
} from "../hosting.hooks"
import { formatLimitMB, usageBarClass, usagePct } from "../hosting.utils"
import { ReasonDialog } from "./ReasonDialog"

/**
 * The operator's full view of one service: what it is, what it is doing, and
 * every action the panel behind it supports.
 *
 * Action buttons come from the account's `capabilities` — the module's declared
 * action set — so a panel that cannot do SSO simply never shows the button
 * rather than showing one that fails on click.
 */
export function HostingAccountDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: account, isLoading } = useAdminHostingAccount(id)
  const { data: servers = [] } = useHostingServers()
  const { data: catalogue } = useAdminHostingPlans()
  const { data: audit = [] } = useHostingAudit(id ? { account_id: id } : undefined)

  const suspend = useAdminSuspendAccount()
  const unsuspend = useAdminUnsuspendAccount()
  const terminate = useAdminTerminateAccount()
  const sync = useAdminSyncAccount()
  const move = useAdminMoveAccount()
  const changePlan = useAdminChangeAccountPlan()
  const resetPassword = useAdminResetPassword()
  const login = useAdminHostingLogin()

  const [suspending, setSuspending] = useState(false)
  const [terminating, setTerminating] = useState(false)

  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">Loading account…</p>
  if (!account) return <p className="p-6 text-sm text-muted-foreground">Account not found.</p>

  const can = (capability: string) => account.capabilities.includes(capability)
  const disk = usagePct(account.disk_used_mb, account.disk_limit_mb)
  const bw = usagePct(account.bw_used_mb, account.bw_limit_mb)

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title={account.domain}
        description={`${account.username} on ${account.server_hostname || "—"}`}
        icon={Globe}
        breadcrumbs={[{ label: "Hosting accounts", to: HOSTING_ADMIN_ROUTES.accounts }]}
        renderLink={(crumb, children) => (
          <button type="button" onClick={() => void navigate(crumb.to ?? "")}>
            {children}
          </button>
        )}
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={account.status} pulse={account.status === "PENDING"} />
            {account.provisioning && <Badge variant="outline">work in flight</Badge>}
            {account.suspended_by && (
              <Badge variant="outline">suspended by {account.suspended_by}</Badge>
            )}
          </div>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            {can("sso") && account.status === "ACTIVE" && (
              <Button
                variant="outline"
                onClick={() => {
                  login.mutate(account.id)
                }}
              >
                <ExternalLink className="size-4" /> Control panel
              </Button>
            )}
            {can("usage") && (
              <Button
                variant="outline"
                onClick={() => {
                  sync.mutate({ id: account.id })
                }}
              >
                <RefreshCw className="size-4" /> Sync usage
              </Button>
            )}
            {can("changepassword") && (
              <Button
                variant="outline"
                onClick={() => {
                  resetPassword.mutate(
                    { id: account.id },
                    {
                      onSuccess: (password) =>
                        // Shown once, and only here: the backend never stores a
                        // live password, so there is no second chance to read it.
                        toast.success(`New password queued: ${password}`, { duration: 30_000 }),
                    },
                  )
                }}
              >
                <KeyRound className="size-4" /> Reset password
              </Button>
            )}
            {account.status === "SUSPENDED"
              ? can("unsuspend") && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      unsuspend.mutate({ id: account.id })
                    }}
                  >
                    <Play className="size-4" /> Unsuspend
                  </Button>
                )
              : can("suspend") &&
                account.status !== "TERMINATED" && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSuspending(true)
                    }}
                  >
                    <Ban className="size-4" /> Suspend
                  </Button>
                )}
            {can("terminate") && account.status !== "TERMINATED" && (
              <Button
                variant="destructive"
                onClick={() => {
                  setTerminating(true)
                }}
              >
                <Trash2 className="size-4" /> Terminate
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Section title="Service" variant="panel" className="lg:col-span-2">
          <KeyValueGrid
            items={[
              { label: "Domain", value: account.domain },
              { label: "Username", value: account.username },
              { label: "Provider", value: account.server_hostname || "—" },
              { label: "Plan", value: account.plan?.name ?? account.plan_sku },
              { label: "Panel package", value: account.package_name || "—" },
              { label: "Dedicated IP", value: account.dedicated_ip || "shared" },
              {
                label: "Nameservers",
                value: account.nameservers.length > 0 ? account.nameservers.join(", ") : "—",
              },
              {
                label: "Billing",
                value: account.subscription_id
                  ? `subscription ${account.subscription_id.slice(0, 8)}…`
                  : "not billed",
              },
              {
                label: "Suspension reason",
                value: account.suspension_reason || "—",
              },
              {
                label: "Last usage sync",
                value: account.last_sync_at
                  ? new Date(account.last_sync_at).toLocaleString()
                  : "never",
              },
            ]}
          />
        </Section>

        <Section title="Usage" variant="panel">
          <div className="space-y-4">
            <UsageBar
              label="Disk"
              used={account.disk_used_mb}
              limit={account.disk_limit_mb}
              pct={disk}
            />
            <UsageBar
              label="Bandwidth"
              used={account.bw_used_mb}
              limit={account.bw_limit_mb}
              pct={bw}
            />
          </div>
        </Section>
      </div>

      {account.status !== "TERMINATED" && (
        <Section
          title="Move & change plan"
          description="Both queue panel work; the row updates once the panel confirms."
          variant="panel"
        >
          <div className="grid gap-4 md:grid-cols-2">
            {can("changepackage") && (
              <div className="space-y-1.5">
                <p className="text-[13px] font-medium">Change plan</p>
                <Select
                  value={account.plan_sku}
                  onValueChange={(sku) => {
                    if (sku !== account.plan_sku) {
                      changePlan.mutate({ id: account.id, planSku: sku })
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(catalogue?.items ?? [])
                      .filter((r) => !r.plan.retired)
                      .map((r) => (
                        <SelectItem key={r.plan.sku} value={r.plan.sku}>
                          {r.plan.name} — {r.plan.whm_package}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <p className="text-[13px] font-medium">Move to another provider</p>
              <Select
                value=""
                onValueChange={(serverId) => {
                  move.mutate({ id: account.id, serverId })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pick a destination provider" />
                </SelectTrigger>
                <SelectContent>
                  {servers
                    .filter((s) => s.id !== account.server_id)
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.hostname} {s.allocatable ? "" : "(not allocatable)"}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                <Move className="mt-0.5 size-3 shrink-0" />
                Re-provisions the account on the destination and retires the old record. Site data
                is NOT copied — do that first.
              </p>
            </div>
          </div>
        </Section>
      )}

      <Section
        title="Provisioning history"
        description="Every panel command this account has been through."
        variant="panel"
      >
        {account.jobs?.length ? (
          <div className="space-y-2">
            {account.jobs.map((job) => (
              <div
                key={job.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
              >
                <div className="flex flex-col">
                  <span className="text-[13px] font-medium">{job.action}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(job.created_at).toLocaleString()} · attempt {job.attempts}/
                    {job.max_attempts}
                    {job.locked_by ? ` · ${job.locked_by}` : ""}
                  </span>
                  {job.last_error && (
                    <span className="mt-1 text-[11px] text-destructive">{job.last_error}</span>
                  )}
                </div>
                <Badge variant="outline" data-tone={JOB_STATUS_TONE[job.status]}>
                  {job.status}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-muted-foreground">No jobs recorded.</p>
        )}
      </Section>

      <Section title="Audit trail" variant="panel">
        {audit.length ? (
          <div className="space-y-2">
            {audit.map((entry) => (
              <div key={entry.id} className="flex flex-col rounded-lg border border-border p-3">
                <span className="text-[13px] font-medium">{entry.action}</span>
                <span className="text-[11px] text-muted-foreground">
                  {new Date(entry.created_at).toLocaleString()} · {entry.actor}
                  {entry.ip_address ? ` · ${entry.ip_address}` : ""}
                </span>
                {Object.keys(entry.detail).length > 0 && (
                  <pre className="mt-2 overflow-x-auto rounded bg-muted p-2 text-[11px]">
                    {JSON.stringify(entry.detail, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-muted-foreground">Nothing recorded yet.</p>
        )}
      </Section>

      <ReasonDialog
        open={suspending}
        title="Suspend this account?"
        description={`${account.domain} will be suspended on ${account.server_hostname}.`}
        confirmLabel="Suspend"
        loading={suspend.isPending}
        onClose={() => {
          setSuspending(false)
        }}
        onConfirm={(reason) => {
          suspend.mutate(
            { id: account.id, reason },
            {
              onSuccess: () => {
                setSuspending(false)
              },
            },
          )
        }}
      />
      <ReasonDialog
        open={terminating}
        title="Terminate this account?"
        description={`${account.domain} will be removed from ${account.server_hostname} and its billing cancelled. This cannot be undone.`}
        confirmLabel="Terminate"
        destructive
        loading={terminate.isPending}
        onClose={() => {
          setTerminating(false)
        }}
        onConfirm={(reason) => {
          terminate.mutate(
            { id: account.id, reason },
            {
              onSuccess: () => {
                setTerminating(false)
              },
            },
          )
        }}
      />
    </div>
  )
}

function UsageBar({
  label,
  used,
  limit,
  pct,
}: Readonly<{ label: string; used: number; limit: number; pct: number | null }>) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] font-medium">{label}</span>
        <span className="text-[12px] text-muted-foreground">
          {formatLimitMB(used)}
          {pct === null ? " · unlimited" : ` / ${formatLimitMB(limit)}`}
        </span>
      </div>
      {pct !== null && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className={`h-full ${usageBarClass(pct)}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  )
}
