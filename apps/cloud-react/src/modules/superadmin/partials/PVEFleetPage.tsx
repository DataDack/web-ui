import { useState } from "react"

import { Plus, ServerCog } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLocation, useNavigate } from "react-router-dom"

import { PageHeader } from "@/components/console"
import { useQueryParamState } from "@/hooks/use-query-param-state"

import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from "@datadack/common-ui"

import { PVEClustersTab } from "./PVEClustersTab"
import { PVENodesTab } from "./PVENodesTab"

// Tab state lives in ?tab= so an operator can link straight to either view.
const TABS = ["clusters", "nodes"] as const
type FleetTab = (typeof TABS)[number]

/**
 * Proxmox fleet — the cluster hierarchy and the flat node list in one place.
 *
 * These were two sidebar entries describing the same hardware, which meant
 * every question started with picking the right page: clusters answered "what
 * is registered and what does it contain", nodes answered "what can I do to one
 * machine". Neither is a subset of the other, so they are tabs rather than a
 * merged table.
 *
 * Both legacy routes still resolve here and pick their own default tab, so
 * existing links and bookmarks keep landing on the view they named.
 */
export function PVEFleetPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  // The path decides the DEFAULT only; ?tab= still wins, so
  // /admin/pve-nodes?tab=clusters does what it says.
  const fallback: FleetTab = pathname.startsWith("/admin/pve-nodes") ? "nodes" : "clusters"
  const [tab, setTab] = useQueryParamState<FleetTab>("tab", TABS, fallback)

  // Owned here so the register button can sit in the page header while the
  // dialog itself stays with the clusters tab that uses it.
  const [registerOpen, setRegisterOpen] = useState(false)

  return (
    <div className="space-y-4">
      <PageHeader
        className="mb-0"
        icon={ServerCog}
        breadcrumbs={[{ label: t("superAdmin.title") }, { label: t("superAdmin.pveFleet.title") }]}
        title={t("superAdmin.pveFleet.title")}
        description={t("superAdmin.pveFleet.subtitle")}
        // Only the action that belongs to the visible tab — registering a
        // cluster and adding a single node are different operations, and
        // showing both at once invites the wrong one.
        actions={
          tab === "clusters" ? (
            <Button
              className="gap-2"
              onClick={() => {
                setRegisterOpen(true)
              }}
            >
              <Plus className="size-4" />
              {t("superAdmin.pveClusters.add")}
            </Button>
          ) : (
            <Button
              className="gap-2"
              onClick={() => {
                void navigate("/admin/pve-nodes/new")
              }}
            >
              <Plus className="size-4" />
              {t("superAdmin.pveNodes.add")}
            </Button>
          )
        }
      />

      <Tabs
        value={tab}
        onValueChange={(value) => {
          setTab(value as FleetTab)
        }}
        className="gap-3"
      >
        <TabsList>
          <TabsTrigger value="clusters">{t("superAdmin.pveFleet.tabs.clusters")}</TabsTrigger>
          <TabsTrigger value="nodes">{t("superAdmin.pveFleet.tabs.nodes")}</TabsTrigger>
        </TabsList>
        <TabsContent value="clusters">
          <PVEClustersTab registerOpen={registerOpen} onRegisterOpenChange={setRegisterOpen} />
        </TabsContent>
        <TabsContent value="nodes">
          <PVENodesTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
