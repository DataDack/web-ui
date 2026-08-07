import { useMemo, useState } from "react"

import { Button, cn, Skeleton } from "@datadack/common-ui"
import { Coins, Network, Pencil, Plus } from "lucide-react"
import { useTranslation } from "react-i18next"

import { PageHeader } from "@/components/console"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useQueryParamState } from "@/hooks/use-query-param-state"
import { useScreen } from "@/services/api/screen"

import { useAdminStaticIPPrices } from "../superadmin.hooks"
import type { StaticIPPrice } from "../superadmin.types"
import { IPPoolsTab } from "./IPPoolsTab"
import { IPsInUseTab } from "./IPsInUseTab"
import { StaticIPPriceFormSheet } from "./StaticIPPriceFormSheet"

// Tab state lives in ?tab= so an operator can link straight to the in-use list.
const TABS = ["pools", "in-use"] as const
type StaticIPsTab = (typeof TABS)[number]

export function StaticIPsPage() {
  useScreen("superadmin.static-i-ps")
  const { t } = useTranslation()
  const { data: prices = [], isLoading: pricesLoading } = useAdminStaticIPPrices()
  const [priceFormOpen, setPriceFormOpen] = useState(false)
  // The add dialog is opened from the page header, but the dialog itself belongs
  // to the pools tab — so the open state is lifted here and handed down.
  const [addPoolOpen, setAddPoolOpen] = useState(false)
  const [tab, setTab] = useQueryParamState<StaticIPsTab>("tab", TABS, "pools")

  // One price is the source of truth for static IP allocation billing: prefer
  // the active one, otherwise the first configured.
  const price = useMemo<StaticIPPrice | undefined>(
    () => prices.find((p) => p.is_active) ?? prices[0],
    [prices],
  )

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

      <PricingBar
        price={price}
        loading={pricesLoading}
        onEdit={() => {
          setPriceFormOpen(true)
        }}
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

      <StaticIPPriceFormSheet
        open={priceFormOpen}
        onOpenChange={setPriceFormOpen}
        price={price ?? null}
      />
    </div>
  )
}

/**
 * Trailing zeros on a derived hourly rate are noise — 0.409589 is meaningful,
 * 200.000000 is not. Kept at full precision otherwise, because this is the
 * number the billing engine actually multiplies by.
 */
function formatPrice(value: number): string {
  return String(Number(value.toFixed(6)))
}

/**
 * The three prices that govern static IP billing, on one line.
 *
 * A summary rather than a panel: an operator reads it far more often than they
 * change it, so it costs a single row and hands the height back to the table.
 */
function PricingBar({
  price,
  loading,
  onEdit,
}: Readonly<{ price?: StaticIPPrice; loading: boolean; onEdit: () => void }>) {
  const { t } = useTranslation()
  const ccy = price?.currency ?? ""

  if (loading) {
    return (
      <div className="glass-1 flex items-center gap-6 px-4 py-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="ml-auto h-8 w-28" />
      </div>
    )
  }

  return (
    <div className="glass-1 flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border-glass bg-muted/40">
            <Coins className="size-3.5 text-muted-foreground" />
          </span>
          <span className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">
            {t("superAdmin.staticIps.pricing.label")}
          </span>
        </div>

        {price ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <PriceMetric
              label={t("superAdmin.staticIps.pricing.hourly")}
              value={`${ccy} ${formatPrice(price.price_hourly)}`}
              strong
            />
            <Divider />
            <PriceMetric
              label={t("superAdmin.staticIps.pricing.idleHourly")}
              value={`${ccy} ${formatPrice(price.price_idle_hourly)}`}
            />
            <Divider />
            <PriceMetric
              label={t("superAdmin.staticIps.pricing.monthly")}
              value={`${ccy} ${formatPrice(price.price_monthly)}`}
            />
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">
            {t("superAdmin.staticIps.pricing.notSetHint")}
          </span>
        )}
      </div>

      <Button variant={price ? "outline" : "default"} size="sm" className="gap-2" onClick={onEdit}>
        {price ? <Pencil className="size-3.5" /> : <Plus className="size-3.5" />}
        {price ? t("superAdmin.staticIps.pricing.edit") : t("superAdmin.staticIps.pricing.set")}
      </Button>
    </div>
  )
}

/** Hairline between metrics — hidden once they wrap, where it would dangle. */
function Divider() {
  return <span aria-hidden className="hidden h-6 w-px bg-border-glass sm:block" />
}

function PriceMetric({
  label,
  value,
  strong,
}: Readonly<{ label: string; value: string; strong?: boolean }>) {
  return (
    <div className="flex flex-col gap-0.5 leading-none">
      <span className="text-[10px] tracking-[0.12em] uppercase text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-mono tabular-nums text-foreground",
          strong ? "text-sm font-semibold" : "text-sm",
        )}
      >
        {value}
      </span>
    </div>
  )
}
