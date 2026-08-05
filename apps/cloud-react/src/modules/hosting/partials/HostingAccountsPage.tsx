import { Badge, Button, EmptyState, StatusBadge } from "@datadack/common-ui"
import { ExternalLink, Globe, Loader2, Plus, Server } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { PageHeader } from "@/components/console"

import { HOSTING_ROUTES } from "../hosting.constants"
import { useHostingAccounts, useHostingLogin } from "../hosting.hooks"
import type { HostingAccount } from "../hosting.types"
import {
  accountSummary,
  formatLimitMB,
  hasCapability,
  usageBarClass,
  usagePct,
} from "../hosting.utils"

/**
 * The customer's hosting services.
 *
 * The list polls itself while anything is provisioning and stops the moment
 * everything has settled — see useHostingAccounts.
 */
export function HostingAccountsPage() {
  const navigate = useNavigate()
  const { data: accounts = [], isLoading } = useHostingAccounts()
  const login = useHostingLogin()

  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">Loading your hosting…</p>

  return (
    <div className="space-y-6">
      <PageHeader
        title="Web hosting"
        description="Your cPanel hosting accounts."
        icon={Server}
        actions={
          <Button onClick={() => void navigate(HOSTING_ROUTES.pricing)}>
            <Plus className="size-4" /> New hosting
          </Button>
        }
      />

      {accounts.length === 0 ? (
        <EmptyState
          icon={Server}
          title="No hosting yet"
          description="Pick a plan and your site can be live in about a minute."
          action={{ label: "See plans", onClick: () => void navigate(HOSTING_ROUTES.pricing) }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onOpen={() => void navigate(HOSTING_ROUTES.account(account.id))}
              onLogin={() => {
                login.mutate(account.id)
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function AccountCard({
  account,
  onOpen,
  onLogin,
}: Readonly<{ account: HostingAccount; onOpen: () => void; onLogin: () => void }>) {
  const disk = usagePct(account.disk_used_mb, account.disk_limit_mb)

  return (
    <div className="flex flex-col rounded-xl border border-border p-5">
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onOpen} className="flex flex-col text-left">
          <span className="flex items-center gap-2 text-[15px] font-semibold hover:underline">
            <Globe className="size-4 text-muted-foreground" />
            {account.domain}
          </span>
          <span className="mt-0.5 text-[12px] text-muted-foreground">
            {account.plan?.name ?? account.plan_sku}
          </span>
        </button>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge status={account.status} pulse={account.status === "PENDING"} />
          {account.provisioning && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Loader2 className="size-3 animate-spin" /> setting up
            </span>
          )}
        </div>
      </div>

      <p className="mt-3 text-[12px] text-muted-foreground">{accountSummary(account)}</p>

      {disk !== null && (
        <div className="mt-4 space-y-1.5">
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>Disk</span>
            <span>
              {formatLimitMB(account.disk_used_mb)} / {formatLimitMB(account.disk_limit_mb)}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className={`h-full ${usageBarClass(disk)}`} style={{ width: `${disk}%` }} />
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={onOpen}>
          Manage
        </Button>
        {account.status === "ACTIVE" && hasCapability(account, "sso") && (
          <Button size="sm" onClick={onLogin}>
            <ExternalLink className="size-4" /> Open cPanel
          </Button>
        )}
        {account.nameservers.length > 0 && account.status === "ACTIVE" && (
          <Badge variant="outline" className="self-center text-[10px]">
            {account.nameservers.join(" · ")}
          </Badge>
        )}
      </div>
    </div>
  )
}
