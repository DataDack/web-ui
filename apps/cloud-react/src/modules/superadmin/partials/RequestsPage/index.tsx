import { useMemo } from "react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@datadack/common-ui"
import { Inbox } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router-dom"

import { PageHeader } from "@/components/console"
import { useAllSupportTickets } from "@/modules/support-tickets/support-tickets.hooks"
import { useScreen } from "@/services/api/screen"

import { SupportTicketsTab } from "./SupportTicketsTab"
import { ContactSubmissionsTab } from "../ContactSubmissionsPage"
import { OptOutRequestsTab } from "../OptOutRequestsPage"
import { useAdminContactSubmissionCount, useAdminOptOutRequestCount } from "../../superadmin.hooks"

// Three queues, one page. All of them are "somebody is waiting on an operator to
// decide", and splitting them across sidebar entries meant an operator had to
// remember to check three places to know whether anything was outstanding.
//
// Quota increases used to be a fourth tab. They are support tickets now (in the
// `quota` category, reviewed on the ticket itself), so they arrive in the
// support queue and a tab of their own would have listed the same rows twice.
//
// The two website forms are here rather than under a marketing heading of their
// own for the same reason: an unanswered lead is outstanding work, and both were
// invisible entirely while they lived in the website's Supabase project.
//
// Privacy is LAST in the list but is the one with a statutory clock, which is
// why its count is the one that keeps showing even when the tab is not open.
const TABS = ["support", "contact", "privacy"] as const
type TabValue = (typeof TABS)[number]
const DEFAULT_TAB: TabValue = "support"

function parseTab(value: string | null): TabValue {
  return TABS.includes(value as TabValue) ? (value as TabValue) : DEFAULT_TAB
}

/**
 * The operator's inbox: support tickets (quota increases among them), website
 * contact enquiries and privacy-rights requests.
 *
 * The active tab lives in ?tab= so a view is shareable and survives a reload,
 * and the counts on the labels are the outstanding ones — open tickets, pending
 * requests, unanswered enquiries, unworked rights requests — not the totals. A
 * queue's label is only useful if it says how much work is in it.
 */
export function RequestsPage() {
  useScreen("superadmin.requests")
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = parseTab(searchParams.get("tab"))

  const tickets = useAllSupportTickets()
  const newContacts = useAdminContactSubmissionCount("new")
  const newPrivacy = useAdminOptOutRequestCount("new")

  const openTickets = useMemo(
    () => (tickets.data ?? []).filter((ticket) => ticket.status === "open").length,
    [tickets.data],
  )

  // Replacing rather than pushing: flipping a tab is not a navigation, and
  // stacking history entries would make Back feel broken.
  const changeTab = (value: TabValue) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value === DEFAULT_TAB) next.delete("tab")
        else next.set("tab", value)
        return next
      },
      { replace: true },
    )
  }

  // The count is omitted until a response lands, so a label never flashes "(0)"
  // and reads as an empty queue before anything has been fetched.
  const outstanding: Record<TabValue, number | undefined> = {
    support: tickets.data ? openTickets : undefined,
    contact: newContacts.data,
    privacy: newPrivacy.data,
  }

  const label = (value: TabValue) => {
    const name = t(`superAdmin.requests.tabs.${value}`)
    const count = outstanding[value]
    return count === undefined ? name : `${name} (${String(count)})`
  }

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Inbox}
        breadcrumbs={[{ label: t("superAdmin.title") }, { label: t("superAdmin.requests.title") }]}
        title={t("superAdmin.requests.title")}
        description={t("superAdmin.requests.subtitle")}
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
              {label(value)}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Only the active tab mounts, so only its queue is fetched. */}
        <TabsContent value="support">
          <SupportTicketsTab />
        </TabsContent>

        <TabsContent value="contact">
          <ContactSubmissionsTab />
        </TabsContent>

        <TabsContent value="privacy">
          <OptOutRequestsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
