import { useState } from "react"

import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from "@datadack/common-ui"
import { ExternalLink, Plus } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { useQueryParamState } from "@/hooks/use-query-param-state"

import { IPPoolsTab } from "../IPPoolsTab"
import { IPsInUseTab } from "../IPsInUseTab"

// A second key, so opening the addresses list does not fight the page's own
// ?tab= and both survive a link being pasted to a colleague.
const VIEWS = ["pools", "in-use"] as const
type View = (typeof VIEWS)[number]

/**
 * This cluster's public address stock.
 *
 * The same two tables as Static IPs in the sidebar, scoped to the blocks this
 * cluster's nodes carry — because an address is placed on a node, and answering
 * "can this cluster still hand out an address" meant leaving the cluster, opening
 * the platform-wide list and filtering it by eye.
 */
export function ClusterStaticIPsTab({ clusterId }: Readonly<{ clusterId: string }>) {
  const { t } = useTranslation()
  const [view, setView] = useQueryParamState<View>("ips", VIEWS, "pools")
  // The pools table owns the dialog; the button that opens it sits up here with
  // the view switch, matching where the sidebar page puts it.
  const [addOpen, setAddOpen] = useState(false)

  return (
    <Tabs
      value={view}
      onValueChange={(value) => {
        setView(value as View)
      }}
      className="gap-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TabsList>
          <TabsTrigger value="pools">{t("superAdmin.staticIps.tabs.pools")}</TabsTrigger>
          <TabsTrigger value="in-use">{t("superAdmin.staticIps.tabs.inUse")}</TabsTrigger>
        </TabsList>

        <div className="flex items-center gap-2">
          {/* Reachability probes and the price table live on the full page; this
              is a view onto one cluster, not a replacement for it. */}
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin/static-ips">
              {t("superAdmin.staticIps.title")}
              <ExternalLink className="size-4" />
            </Link>
          </Button>
          {view === "pools" ? (
            <Button
              size="sm"
              className="gap-2"
              onClick={() => {
                setAddOpen(true)
              }}
            >
              <Plus className="size-4" />
              {t("superAdmin.staticIps.pools.add")}
            </Button>
          ) : null}
        </div>
      </div>

      <TabsContent value="pools">
        <IPPoolsTab clusterId={clusterId} addOpen={addOpen} onAddOpenChange={setAddOpen} />
      </TabsContent>
      <TabsContent value="in-use">
        <IPsInUseTab clusterId={clusterId} />
      </TabsContent>
    </Tabs>
  )
}
