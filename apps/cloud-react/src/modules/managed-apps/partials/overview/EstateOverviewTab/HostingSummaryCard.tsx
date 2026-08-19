import { useMemo } from "react"

import { Button, cn, Skeleton } from "@datadack/common-ui"
import { ArrowRight, Globe, Plus } from "lucide-react"
import { Link } from "react-router-dom"

import { TONE_DOT_CLASSES } from "@/components/console/status-config"
import { ACCOUNT_STATUS_TONE, HOSTING_ROUTES, UNLIMITED } from "@/modules/hosting/hosting.constants"
import type { HostingAccount } from "@/modules/hosting/hosting.types"
import {
  accountNeedsAttention,
  formatLimitMB,
  usageBarClass,
  usagePct,
} from "@/modules/hosting/hosting.utils"

import { SurfaceCard } from "./SurfaceCard"
import { MANAGED_APPS_ROUTES } from "../../../managed-apps.constants"

/** How many accounts the card names before deferring to the tab. */
const PREVIEW = 3

/** Accounts a customer would call "gone" — they hold no disk worth totalling. */
const RETIRED: readonly HostingAccount["status"][] = ["TERMINATED"]

interface HostingSummaryCardProps {
  accounts: readonly HostingAccount[]
  isLoading: boolean
}

/**
 * Disk across every account that still exists.
 *
 * Accounts on an unlimited plan are left OUT of both sides of the ratio rather
 * than counted as zero: adding their usage to the numerator while their
 * (infinite) ceiling contributes nothing to the denominator would draw a bar
 * that creeps towards full for no reason anyone could act on.
 */
function diskTotals(accounts: readonly HostingAccount[]): { used: number; limit: number } | null {
  let used = 0
  let limit = 0
  let counted = 0
  for (const account of accounts) {
    if (RETIRED.includes(account.status)) continue
    if (account.disk_limit_mb === UNLIMITED || account.disk_limit_mb <= 0) continue
    used += account.disk_used_mb
    limit += account.disk_limit_mb
    counted += 1
  }
  return counted === 0 ? null : { used, limit }
}

/**
 * The cPanel half of the estate: how much disk the account has left in total,
 * and the accounts most likely to need something.
 *
 * Ordered by "needs attention first, then by fullest disk" — the same order of
 * concern the tab's status chips express, so the preview never disagrees with
 * the list it previews.
 */
export function HostingSummaryCard({ accounts, isLoading }: Readonly<HostingSummaryCardProps>) {
  const preview = useMemo(
    () =>
      [...accounts]
        .sort((a, b) => {
          const attention = Number(accountNeedsAttention(b)) - Number(accountNeedsAttention(a))
          if (attention !== 0) return attention
          return (
            (usagePct(b.disk_used_mb, b.disk_limit_mb) ?? -1) -
            (usagePct(a.disk_used_mb, a.disk_limit_mb) ?? -1)
          )
        })
        .slice(0, PREVIEW),
    [accounts],
  )

  const disk = useMemo(() => diskTotals(accounts), [accounts])
  const diskPct = disk ? usagePct(disk.used, disk.limit) : null

  let body
  if (isLoading) {
    body = (
      <div className="space-y-2">
        <Skeleton className="h-8 rounded-lg" />
        <Skeleton className="h-8 rounded-lg" />
        <Skeleton className="h-8 rounded-lg" />
      </div>
    )
  } else if (accounts.length === 0) {
    body = (
      <p className="text-[12px] leading-relaxed text-muted-foreground">
        cPanel hosting with free SSL, daily backups and one-click installs. Pick a plan and your
        site can be live in about a minute.
      </p>
    )
  } else {
    body = (
      <div className="space-y-4">
        {diskPct !== null && disk && (
          <div className="min-w-0">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[11px] tracking-wide text-muted-foreground uppercase">
                Disk across {String(accounts.length)} account{accounts.length === 1 ? "" : "s"}
              </span>
              <span className="font-mono text-[12px] font-medium">
                {formatLimitMB(disk.used)} of {formatLimitMB(disk.limit)}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full glass-1-bg-raised ring-1 ring-border/50 ring-inset">
              <div
                className={cn("h-full rounded-full transition-[width]", usageBarClass(diskPct))}
                style={{ width: `${String(diskPct)}%` }}
              />
            </div>
          </div>
        )}

        <ul className="-mx-2 space-y-0.5">
          {preview.map((account) => {
            const pct = usagePct(account.disk_used_mb, account.disk_limit_mb)
            return (
              <li key={account.id}>
                <Link
                  to={HOSTING_ROUTES.account(account.id)}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 outline-none transition-colors hover:glass-1-bg-raised focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <Globe className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-[13px]">{account.domain}</span>
                  <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        TONE_DOT_CLASSES[ACCOUNT_STATUS_TONE[account.status]],
                      )}
                    />
                    {/* The number the customer is actually watching. An
										    unlimited plan has none, so it says so rather
										    than showing a bar that can never move. */}
                    {pct === null ? "Unlimited" : `${String(pct)}% disk`}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>

        {accounts.length > preview.length && (
          <p className="text-[11px] text-muted-foreground">
            {String(accounts.length - preview.length)} more in the cPanel Hosting tab.
          </p>
        )}
      </div>
    )
  }

  return (
    <SurfaceCard
      icon={Globe}
      title="cPanel hosting"
      count={isLoading ? undefined : accounts.length}
      description="Shared hosting with the control panel your site already expects."
      footer={
        <>
          <Button
            asChild
            size="sm"
            variant={accounts.length === 0 ? "default" : "outline"}
            className="gap-1.5"
          >
            <Link to={HOSTING_ROUTES.pricing}>
              <Plus className="size-3.5" />
              {accounts.length === 0 ? "See plans" : "New hosting"}
            </Link>
          </Button>
          {accounts.length > 0 && (
            <Button asChild size="sm" variant="ghost" className="gap-1.5">
              <Link to={MANAGED_APPS_ROUTES.hosting}>
                View all
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          )}
        </>
      }
    >
      {body}
    </SurfaceCard>
  )
}
