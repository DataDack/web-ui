import { useMemo, useState } from "react"

import { Badge, Button, cn, EmptyState, Input, Skeleton, StatusBadge } from "@datadack/common-ui"
import { ExternalLink, Globe, Loader2, Search } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { staggerDelay } from "@/components/console"
import { TONE_CLASSES, TONE_DOT_CLASSES } from "@/components/console/status-config"
import { useQueryParamState } from "@/hooks/use-query-param-state"

import { HostingPlanPicker } from "./HostingPlanPicker"
import { ACCOUNT_STATUS_TONE, HOSTING_ROUTES } from "../hosting.constants"
import { useHostingAccounts, useHostingLogin } from "../hosting.hooks"
import type { AccountStatus, HostingAccount } from "../hosting.types"
import {
  accountSummary,
  formatLimitMB,
  hasCapability,
  usageBarClass,
  usagePct,
} from "../hosting.utils"

const SKELETON_KEYS = ["h1", "h2", "h3", "h4"] as const

/**
 * The status filter's values. "hstatus" rather than "status" because this list
 * shares a path (and therefore a query namespace) with the Apps view, which
 * already owns "state" — two lists at one URL must never be able to read each
 * other's filter.
 */
const STATUS_FILTERS = ["all", "PENDING", "ACTIVE", "SUSPENDED", "TERMINATED", "FAILED"] as const
type StatusFilter = (typeof STATUS_FILTERS)[number]

const STATUS_LABEL: Record<AccountStatus, string> = {
  PENDING: "Setting up",
  ACTIVE: "Live",
  SUSPENDED: "Suspended",
  TERMINATED: "Terminated",
  FAILED: "Failed",
}

/** Everything a row can be matched on, lowercased once per account. */
function searchIndex(account: HostingAccount): string {
  return [account.domain, account.username, account.plan?.name ?? account.plan_sku]
    .join(" ")
    .toLowerCase()
}

/**
 * The customer's cPanel accounts, as a list they can search and filter.
 *
 * A panel rather than a page: this renders as the cPanel Hosting view of the
 * Managed Apps section, next to the repo-built projects. It carries no header
 * of its own — the section owns the title and the "New hosting" button, so
 * moving between the two lists reads as one page rather than two.
 *
 * The list polls itself while anything is provisioning and stops the moment
 * everything has settled — see useHostingAccounts.
 */
export function HostingAccountsPanel() {
  const navigate = useNavigate()
  const { data: accounts = [], isLoading } = useHostingAccounts()
  const login = useHostingLogin()

  // Component state, not the URL: writing every keystroke to the query string
  // floods history and re-renders every other reader of it.
  const [search, setSearch] = useState("")
  const [status, setStatus] = useQueryParamState<StatusFilter>("hstatus", STATUS_FILTERS, "all")

  // Only statuses actually present get a chip. A chip reading "0" is not a
  // filter, it is a dead end.
  const chips = useMemo(() => {
    const counts = new Map<AccountStatus, number>()
    for (const account of accounts) {
      counts.set(account.status, (counts.get(account.status) ?? 0) + 1)
    }
    return [...counts.entries()].map(([value, count]) => ({ value, count }))
  }, [accounts])

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    return accounts.filter((account) => {
      if (status !== "all" && account.status !== status) return false
      return term === "" || searchIndex(account).includes(term)
    })
  }, [accounts, search, status])

  if (isLoading) {
    return (
      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {SKELETON_KEYS.map((key) => (
          <Skeleton key={key} className="h-[172px] rounded-xl" />
        ))}
      </div>
    )
  }

  // Never provisioned anything: this is onboarding, not an empty filter. The
  // plans ARE the view — this is the only place they are offered, so a card
  // whose one action was "See plans" would be a click in front of the content
  // it was standing in for.
  if (accounts.length === 0) {
    return (
      <div>
        <div className="mb-4 rounded-xl border border-border/60 glass-1-bg px-4 py-3">
          <h2 className="text-[13px] font-semibold">Pick a plan to get started</h2>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">
            cPanel hosting with free SSL, daily backups and one-click installs. Your site can be
            live in about a minute.
          </p>
        </div>
        <HostingPlanPicker />
      </div>
    )
  }

  const filtersActive = status !== "all" || search.trim() !== ""

  return (
    <div>
      {/* Chrome, not data — `glass-1` keeps it from reading as a card
			    alongside the accounts below it. Matches the Apps tab's toolbar. */}
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-border/60 glass-1-bg px-2.5 py-2">
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
            }}
            placeholder="Search by domain, user or plan…"
            className="h-7 pl-8 text-[12px]"
            aria-label="Search hosting accounts"
          />
        </div>

        {chips.length > 1 && (
          <div
            role="group"
            aria-label="Filter by status"
            className="-mx-0.5 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-0.5 py-0.5"
          >
            <Chip
              label="All"
              count={accounts.length}
              selected={status === "all"}
              onClick={() => {
                setStatus("all")
              }}
            />
            {chips.map((chip) => (
              <Chip
                key={chip.value}
                label={STATUS_LABEL[chip.value]}
                count={chip.count}
                selected={status === chip.value}
                toneClass={TONE_CLASSES[ACCOUNT_STATUS_TONE[chip.value]]}
                dotClass={TONE_DOT_CLASSES[ACCOUNT_STATUS_TONE[chip.value]]}
                onClick={() => {
                  // Clicking the active chip clears it, so the control can
                  // never become a trap.
                  setStatus(status === chip.value ? "all" : chip.value)
                }}
              />
            ))}
          </div>
        )}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No hosting accounts match these filters"
          description="Nothing matches what you are filtering by. Clear the filters to see every account."
          action={
            filtersActive
              ? {
                  label: "Clear filters",
                  onClick: () => {
                    setSearch("")
                    setStatus("all")
                  },
                }
              : undefined
          }
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {visible.map((account, index) => (
            <li key={account.id} className="animate-content-enter" style={staggerDelay(index)}>
              <HostingAccountCard
                account={account}
                onOpen={() => void navigate(HOSTING_ROUTES.account(account.id))}
                onLogin={() => {
                  login.mutate(account.id)
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

interface ChipProps {
  label: string
  count: number
  selected: boolean
  onClick: () => void
  toneClass?: string
  dotClass?: string
}

function Chip({ label, count, selected, onClick, toneClass, dotClass }: Readonly<ChipProps>) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "shrink-0 gap-1.5 border border-transparent text-[11px] font-medium",
        selected
          ? (toneClass ?? "border-border glass-1-bg-raised text-foreground")
          : "text-muted-foreground",
      )}
    >
      {dotClass && <span className={cn("size-1.5 rounded-full", dotClass)} />}
      {label}
      <span className="font-mono tabular-nums opacity-70">{String(count)}</span>
    </Button>
  )
}

interface HostingAccountCardProps {
  account: HostingAccount
  onOpen: () => void
  onLogin: () => void
}

export function HostingAccountCard({
  account,
  onOpen,
  onLogin,
}: Readonly<HostingAccountCardProps>) {
  const disk = usagePct(account.disk_used_mb, account.disk_limit_mb)
  const bandwidth = usagePct(account.bw_used_mb, account.bw_limit_mb)

  return (
    <div className="flex h-full flex-col rounded-xl border border-border/60 glass-1-bg p-3.5 transition-colors hover:border-border">
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onOpen} className="flex min-w-0 flex-col text-left">
          <span className="flex items-center gap-2 truncate text-[14px] font-semibold hover:underline">
            <Globe className="size-4 shrink-0 text-muted-foreground" />
            {account.domain}
          </span>
          <span className="mt-0.5 truncate text-[12px] text-muted-foreground">
            {account.plan?.name ?? account.plan_sku}
          </span>
        </button>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <StatusBadge status={account.status} pulse={account.status === "PENDING"} />
          {account.provisioning && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Loader2 className="size-3 animate-spin" /> setting up
            </span>
          )}
        </div>
      </div>

      <p className="mt-2 text-[11.5px] leading-snug text-muted-foreground">
        {accountSummary(account)}
      </p>

      {/* Bandwidth as well as disk: the two ways a shared account runs out,
			    and only showing one meant a site could go off for a reason the card
			    never mentioned. Either bar is omitted when its plan has no ceiling —
			    a full green bar for "unlimited" would be a lie. */}
      <div className="mt-3 space-y-2">
        <UsageBar
          label="Disk"
          pct={disk}
          used={account.disk_used_mb}
          limit={account.disk_limit_mb}
        />
        <UsageBar
          label="Bandwidth"
          pct={bandwidth}
          used={account.bw_used_mb}
          limit={account.bw_limit_mb}
        />
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-3.5">
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

interface UsageBarProps {
  label: string
  /** null when the plan has no ceiling — the bar is skipped entirely. */
  pct: number | null
  used: number
  limit: number
}

function UsageBar({ label, pct, used, limit }: Readonly<UsageBarProps>) {
  if (pct === null) return null

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>{label}</span>
        <span className="font-mono tabular-nums">
          {formatLimitMB(used)} / {formatLimitMB(limit)}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full glass-1-bg-raised ring-1 ring-border/50 ring-inset">
        <div className={`h-full ${usageBarClass(pct)}`} style={{ width: `${String(pct)}%` }} />
      </div>
    </div>
  )
}
