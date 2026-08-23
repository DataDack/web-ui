import { useCallback, useState } from "react"

import { Building2, Loader2, Search } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router-dom"

import { PageHeader } from "@/components/console"
import { useDebounce } from "@/hooks/use-debounce"
import { useScreen } from "@/services/api/screen"

import { cn, Input, Tabs, TabsContent, TabsList, TabsTrigger } from "@datadack/common-ui"

import { useAdminPlatformOverview } from "../../superadmin.hooks"
import { AccountBalanceDialog } from "../AccountBalanceDialog"
import { AccountsTab } from "./AccountsTab"
import { OrganizationsTab } from "./OrganizationsTab"
import type { AccountRow } from "./types"
import { UsersTab } from "./UsersTab"

const TABS = ["accounts", "organizations", "users"] as const
type TabValue = (typeof TABS)[number]
const DEFAULT_TAB: TabValue = "accounts"
const PAGE_SIZE = 25

function parseTab(value: string | null): TabValue {
  // Preserve old links to the removed orphan-users tab by opening the Users
  // tab with its equivalent filter selected.
  if (value === "orphan_users") return "users"
  return TABS.includes(value as TabValue) ? (value as TabValue) : DEFAULT_TAB
}

// A hand-typed or stale ?page= falls back to the first page rather than showing
// an empty table.
function parsePage(value: string | null): number {
  const page = Number(value)
  return Number.isInteger(page) && page > 0 ? page : 1
}

/**
 * Platform organizations, accounts and users — one surface for the whole tenancy
 * graph.
 *
 * These were three separate destinations, two of which listed users from two
 * different endpoints, so the same person appeared twice with different
 * capabilities attached. They are views of one graph and now share one page, one
 * search box and one paging model.
 *
 * Both pieces of view state live in the URL — ?tab= for the active tab and ?q=
 * for the search — so a view is shareable, survives a reload, and is what the
 * back button restores. They are also the request: the active tab picks the
 * ?section= fetched, so each tab loads only the rows it renders instead of the
 * whole platform graph.
 */
export function TenancyPage() {
  useScreen("superadmin.tenancy")
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = parseTab(searchParams.get("tab"))
  const usersWithoutOrganization =
    searchParams.get("organization") === "none" || searchParams.get("tab") === "orphan_users"
  const page = parsePage(searchParams.get("page"))

  // The URL is the record of what's being searched; the request is debounced off
  // it. Without the debounce every keystroke would be a round trip. `search`
  // drives the box (seeded from the URL, so a deep link arrives filled in), the
  // debounced value drives the query.
  const [search, setSearch] = useState(searchParams.get("q") ?? "")
  const q = useDebounce(search.trim(), 300)
  // Same key as the active tab's own query, so this is the SAME request, not a
  // second one — it's read here only for the counts on the tab labels.
  const section = usersWithoutOrganization && tab === "users" ? "orphan_users" : tab
  const { data, isFetching } = useAdminPlatformOverview(section, q, page, PAGE_SIZE)
  const matched = data?.matched

  // The account whose wallet is being adjusted; null closes the dialog. The
  // refId is the movement's idempotency key, minted once per opening and used
  // to key the dialog so each opening remounts with a fresh form and key.
  const [balanceTarget, setBalanceTarget] = useState<{
    account: AccountRow
    refId: string
  } | null>(null)

  const openBalanceDialog = useCallback((account: AccountRow) => {
    setBalanceTarget({ account, refId: crypto.randomUUID() })
  }, [])

  // One write per interaction, always replacing: flipping a tab or typing a
  // search isn't a navigation, and stacking history entries (one per keystroke)
  // would make Back feel broken. Params at their default are deleted, not
  // written, so the plain URL stays clean.
  const updateParams = (mutate: (params: URLSearchParams) => void) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        mutate(next)
        return next
      },
      { replace: true },
    )
  }

  const setParam = (params: URLSearchParams, key: string, value: string, fallback: string) => {
    if (value === fallback) params.delete(key)
    else params.set(key, value)
  }

  // Changing the tab or the search term invalidates the page number — page 4 of
  // the users list means nothing once you're on accounts, or once the search
  // narrowed the result to one page — so both reset it in the same write.
  const changeTab = (value: TabValue) => {
    updateParams((params) => {
      setParam(params, "tab", value, DEFAULT_TAB)
      if (value !== "users") params.delete("organization")
      params.delete("page")
    })
  }

  const changeUserOrganizationFilter = (withoutOrganization: boolean) => {
    updateParams((params) => {
      // This also normalizes links that still use ?tab=orphan_users.
      params.set("tab", "users")
      setParam(params, "organization", withoutOrganization ? "none" : "", "")
      params.delete("page")
    })
  }

  const changeSearch = (value: string) => {
    setSearch(value)
    updateParams((params) => {
      setParam(params, "q", value.trim(), "")
      params.delete("page")
    })
  }

  const changePage = (value: number) => {
    updateParams((params) => {
      setParam(params, "page", String(value), "1")
    })
  }

  const tabProps = { q, page, pageSize: PAGE_SIZE, onPageChange: changePage }

  // The count is omitted until a response lands, so the tabs don't flash "(0)".
  const label = (value: TabValue, count: number | undefined) => {
    const name = t(`superAdmin.organizations.tabs.${value}`)
    return count === undefined ? name : `${name} (${String(count)})`
  }

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Building2}
        breadcrumbs={[{ label: t("superAdmin.title") }, { label: t("superAdmin.nav.tenancy") }]}
        title={t("superAdmin.nav.tenancy")}
        description={t("superAdmin.tenancy.subtitle")}
        actions={
          <div className="relative">
            {/* The query runs on the server, so it lands a beat after typing
						    stops — swap the icon for a spinner while it's in flight, or the
						    stale rows (kept on purpose, to avoid a blank table) read as
						    "no results". */}
            {isFetching ? (
              <Loader2 className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            ) : (
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            )}
            <Input
              value={search}
              onChange={(e) => {
                changeSearch(e.target.value)
              }}
              placeholder={t("superAdmin.organizations.searchPlaceholder")}
              className={cn("h-9 w-48 pl-8 sm:w-72")}
            />
          </div>
        }
      />

      <Tabs
        value={tab}
        onValueChange={(value) => {
          changeTab(value as TabValue)
        }}
        className="gap-4"
      >
        <TabsList>
          {TABS.map((value) => (
            <TabsTrigger key={value} value={value}>
              {label(value, matched?.[value])}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Only the active tab is mounted, so only its section+page is fetched. */}
        <TabsContent value="accounts">
          <AccountsTab {...tabProps} onAdjustBalance={openBalanceDialog} />
        </TabsContent>

        <TabsContent value="organizations">
          <OrganizationsTab {...tabProps} />
        </TabsContent>

        <TabsContent value="users">
          <UsersTab
            {...tabProps}
            withoutOrganization={usersWithoutOrganization}
            onWithoutOrganizationChange={changeUserOrganizationFilter}
          />
        </TabsContent>
      </Tabs>

      <AccountBalanceDialog
        key={balanceTarget?.refId ?? "closed"}
        account={balanceTarget?.account ?? null}
        refId={balanceTarget?.refId ?? ""}
        onOpenChange={(open) => {
          if (!open) setBalanceTarget(null)
        }}
      />
    </div>
  )
}
