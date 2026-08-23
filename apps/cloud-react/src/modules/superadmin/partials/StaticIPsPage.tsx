import { useState } from "react"

import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from "@datadack/common-ui"
import { Network, Plus } from "lucide-react"
import { useTranslation } from "react-i18next"

import { PageHeader } from "@/components/console"
import { useQueryParamState } from "@/hooks/use-query-param-state"
import { useScreen } from "@/services/api/screen"

import { IPPoolsTab } from "./IPPoolsTab"
import { IPsInUseTab } from "./IPsInUseTab"

// Tab state lives in ?tab= so an operator can link straight to the in-use list.
const TABS = ["pools", "in-use"] as const
type StaticIPsTab = (typeof TABS)[number]

/**
 * Inventory only. The rate charged for an allocation is a billing decision and
 * lives with the other price tables under Pricing → Static IP prices.
 */
export function StaticIPsPage() {
  useScreen("superadmin.static-i-ps")
  const { t } = useTranslation()
  // The add dialog is opened from the page header, but the dialog itself belongs
  // to the pools tab — so the open state is lifted here and handed down.
  const [addPoolOpen, setAddPoolOpen] = useState(false)
  const [tab, setTab] = useQueryParamState<StaticIPsTab>("tab", TABS, "pools")

  return (
    <div className="space-y-4">
      <PageHeader
        className="mb-0"
        icon={Network}
        breadcrumbs={[{ label: t("superAdmin.title") }, { label: t("superAdmin.staticIps.title") }]}
        title={t("superAdmin.staticIps.title")}
        description={t("superAdmin.staticIps.subtitle")}
        // The page's primary action sits with the title rather than floating
        // above the table — and only on the tab it applies to.
        actions={
          tab === "pools" ? (
            <Button
              className="gap-2"
              onClick={() => {
                setAddPoolOpen(true)
              }}
            >
              <Plus className="size-4" />
              {t("superAdmin.staticIps.pools.add")}
            </Button>
          ) : undefined
        }
      />

      <Tabs
        value={tab}
        onValueChange={(value) => {
          setTab(value as StaticIPsTab)
        }}
        className="gap-3"
      >
        <TabsList>
          <TabsTrigger value="pools">{t("superAdmin.staticIps.tabs.pools")}</TabsTrigger>
          <TabsTrigger value="in-use">{t("superAdmin.staticIps.tabs.inUse")}</TabsTrigger>
        </TabsList>
        <TabsContent value="pools">
          <IPPoolsTab addOpen={addPoolOpen} onAddOpenChange={setAddPoolOpen} />
        </TabsContent>
        <TabsContent value="in-use">
          <IPsInUseTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
