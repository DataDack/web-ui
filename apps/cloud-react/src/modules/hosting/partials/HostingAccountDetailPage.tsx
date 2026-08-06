import { useState } from "react"

import {
  Badge,
  Button,
  CopyButton,
  KeyValueGrid,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusBadge,
} from "@datadack/common-ui"
import { ExternalLink, Globe, KeyRound, Loader2 } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"

import { ConfirmDialog, PageHeader, Section } from "@/components/console"

import { HOSTING_ROUTES } from "../hosting.constants"
import {
  useCancelHosting,
  useChangeHostingPlan,
  useHostingAccount,
  useHostingLogin,
  useHostingPlans,
  useResetHostingPassword,
} from "../hosting.hooks"
import {
  accountSummary,
  formatLimitMB,
  hasCapability,
  usageBarClass,
  usagePct,
} from "../hosting.utils"

/**
 * One hosting account, as its owner sees it.
 *
 * The setup password is shown ONCE — the backend hands it over on the first
 * detail read after provisioning and then destroys it, so the banner has to be
 * unmissable rather than a quiet field.
 */
export function HostingAccountDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: account, isLoading } = useHostingAccount(id)
  const { data: catalogue } = useHostingPlans()
  const login = useHostingLogin()
  const changePlan = useChangeHostingPlan()
  const resetPassword = useResetHostingPassword()
  const cancel = useCancelHosting()

  const [cancelling, setCancelling] = useState(false)

  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>
  if (!account) return <p className="p-6 text-sm text-muted-foreground">Not found.</p>

  const disk = usagePct(account.disk_used_mb, account.disk_limit_mb)
  const bw = usagePct(account.bw_used_mb, account.bw_limit_mb)

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title={account.domain}
        description={accountSummary(account)}
        icon={Globe}
        breadcrumbs={[{ label: "cPanel Hosting", to: HOSTING_ROUTES.accounts }]}
        renderLink={(crumb, children) => (
          <button type="button" onClick={() => void navigate(crumb.to ?? "")}>
            {children}
          </button>
        )}
        meta={
          <div className="flex items-center gap-2">
            <StatusBadge status={account.status} pulse={account.status === "PENDING"} />
            {account.provisioning && (
              <Badge variant="outline" className="gap-1">
                <Loader2 className="size-3 animate-spin" /> setting up
              </Badge>
            )}
          </div>
        }
        actions={
          account.status === "ACTIVE" && hasCapability(account, "sso") ? (
            <Button
              onClick={() => {
                login.mutate(account.id)
              }}
            >
              <ExternalLink className="size-4" /> Open cPanel
            </Button>
          ) : undefined
        }
      />

      {account.setup_password && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
          <p className="text-sm font-semibold">Your control panel password</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Shown once. Save it now — we do not keep a copy, and you would have to reset it.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <code className="rounded bg-muted px-3 py-1.5 font-mono text-[13px]">
              {account.setup_password}
            </code>
            <CopyButton value={account.setup_password} />
          </div>
        </div>
      )}

      {account.status === "FAILED" && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
          <p className="text-sm font-semibold">Setup did not complete</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Our team has been alerted and will finish the setup or get in touch. You have not been
            charged again.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Section title="Details" variant="panel" className="lg:col-span-2">
          <KeyValueGrid
            items={[
              { label: "Domain", value: account.domain },
              { label: "cPanel username", value: account.username },
              { label: "Plan", value: account.plan?.name ?? account.plan_sku },
              { label: "IP address", value: account.dedicated_ip || "shared" },
              {
                label: "Nameservers",
                value:
                  account.nameservers.length > 0
                    ? account.nameservers.join(", ")
                    : "available once setup finishes",
              },
              {
                label: "Since",
                value: new Date(account.created_at).toLocaleDateString(),
              },
            ]}
          />
          {account.nameservers.length > 0 && (
            <p className="mt-4 text-[12px] text-muted-foreground">
              Point your domain&apos;s nameservers at the values above with your registrar. Changes
              can take a few hours to propagate.
            </p>
          )}
        </Section>

        <Section title="Usage" variant="panel">
          <div className="space-y-4">
            <Bar
              label="Disk"
              used={account.disk_used_mb}
              limit={account.disk_limit_mb}
              pct={disk}
            />
            <Bar label="Bandwidth" used={account.bw_used_mb} limit={account.bw_limit_mb} pct={bw} />
            {account.last_sync_at && (
              <p className="text-[11px] text-muted-foreground">
                Updated {new Date(account.last_sync_at).toLocaleString()}
              </p>
            )}
          </div>
        </Section>
      </div>

      {account.status !== "TERMINATED" && (
        <Section title="Manage" variant="panel">
          <div className="grid gap-4 md:grid-cols-2">
            {hasCapability(account, "changepackage") && (
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
                    {(catalogue?.items ?? []).map((p) => (
                      <SelectItem key={p.sku} value={p.sku}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Takes effect once the control panel applies it, usually within a minute.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <p className="text-[13px] font-medium">Control panel password</p>
              {hasCapability(account, "changepassword") ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    resetPassword.mutate(
                      { id: account.id },
                      {
                        onSuccess: (password) =>
                          toast.success(`New password: ${password}`, { duration: 30_000 }),
                      },
                    )
                  }}
                  disabled={resetPassword.isPending}
                >
                  <KeyRound className="size-4" /> Generate a new password
                </Button>
              ) : (
                <p className="text-[12px] text-muted-foreground">Change it from inside cPanel.</p>
              )}
            </div>
          </div>

          <div className="mt-6 border-t border-border pt-4">
            <Button
              variant="destructive"
              onClick={() => {
                setCancelling(true)
              }}
            >
              Cancel hosting
            </Button>
          </div>
        </Section>
      )}

      <ConfirmDialog
        open={cancelling}
        onOpenChange={setCancelling}
        title="Cancel this hosting account?"
        description={
          <>
            <p>
              <strong>{account.domain}</strong> and everything on it will be deleted, and billing
              stops immediately.
            </p>
            <p className="mt-2 text-muted-foreground">
              Download a backup from cPanel first — this cannot be undone.
            </p>
          </>
        }
        confirmText={account.domain}
        confirmLabel="Cancel hosting"
        loading={cancel.isPending}
        onConfirm={() => {
          cancel.mutate(
            { id: account.id, reason: "cancelled by customer" },
            {
              onSuccess: () => {
                setCancelling(false)
                void navigate(HOSTING_ROUTES.accounts)
              },
            },
          )
        }}
      />
    </div>
  )
}

function Bar({
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
