import { useState } from "react"

import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from "@datadack/common-ui"
import { Plus, RefreshCw, Route, Router as RouterIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router-dom"

import { PageHeader } from "@/components/console"
import { useScreen } from "@/services/api/screen"

import { useRouteTables } from "../route-tables"
import { useRouters } from "../vpc.hooks"
import { CreateRouteTableDialog } from "./route-tables/CreateRouteTableDialog"
import { RoutersTab } from "./routing/RoutersTab"
import { RouteTablesTab } from "./routing/RouteTablesTab"

const TABS = ["tables", "routers"] as const
type Tab = (typeof TABS)[number]

/**
 * Route tables and routers are two views of one thing: how a VPC forwards
 * traffic. A router is created with its VPC and there is exactly one per VPC,
 * so it never warranted a nav entry of its own — the tables it serves are what
 * tenants actually edit.
 */
export function RoutingPage() {
  useScreen("vpc.routers")
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const raw = params.get("tab")
  const tab: Tab = TABS.includes(raw as Tab) ? (raw as Tab) : "tables"
  const [createOpen, setCreateOpen] = useState(false)

  // Both lists are react-query hooks keyed by resource, so reading them here to
  // drive one refresh control shares the cache with the tabs rather than
  // duplicating their requests.
  const tables = useRouteTables()
  const routers = useRouters()
  const isFetching = tables.isFetching || routers.isFetching

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Route}
        breadcrumbs={[
          { label: t("console.nav.groups.networking") },
          { label: t("console.nav.items.routing") },
        ]}
        title={t("console.nav.items.routing")}
        description="Manage VPC route tables, the subnets that use them, and the routers that carry their traffic."
        actions={
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                void tables.refetch()
                void routers.refetch()
              }}
              disabled={isFetching}
              aria-label={t("common.refresh")}
            >
              <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
            {tab === "tables" && (
              <Button
                variant="gold"
                onClick={() => {
                  setCreateOpen(true)
                }}
              >
                <Plus className="mr-2 size-4" />
                Create route table
              </Button>
            )}
          </>
        }
      />

      <Tabs
        value={tab}
        onValueChange={(value) => {
          setParams(
            (previous) => {
              const next = new URLSearchParams(previous)
              // The search box writes ?q= per tab; the two lists filter on
              // different fields, so a query carried across would silently
              // empty the tab being opened.
              next.delete("q")
              if (value === "tables") next.delete("tab")
              else next.set("tab", value)
              return next
            },
            { replace: true },
          )
        }}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="tables" className="gap-1.5">
            <Route className="size-3.5" />
            {t("console.nav.items.routeTables")}
            <span className="ml-1 text-[11px] text-muted-foreground">
              {tables.data?.length ?? 0}
            </span>
          </TabsTrigger>
          <TabsTrigger value="routers" className="gap-1.5">
            <RouterIcon className="size-3.5" />
            {t("routers.title")}
            <span className="ml-1 text-[11px] text-muted-foreground">
              {routers.data?.length ?? 0}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tables">
          <RouteTablesTab
            onCreate={() => {
              setCreateOpen(true)
            }}
          />
        </TabsContent>
        <TabsContent value="routers">
          <RoutersTab />
        </TabsContent>
      </Tabs>

      <CreateRouteTableDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
