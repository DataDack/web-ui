import { useMemo, useState } from "react"

import { Network, Pencil, Plus } from "lucide-react"
import { useTranslation } from "react-i18next"

import { PageHeader } from "@/components/console"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useQueryParamState } from "@/hooks/use-query-param-state"
import { cn } from "@/lib/utils"
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
    const { data: prices = [] } = useAdminStaticIPPrices()
    const [priceFormOpen, setPriceFormOpen] = useState(false)
    const [tab, setTab] = useQueryParamState<StaticIPsTab>("tab", TABS, "pools")

    // One price is the source of truth for static IP allocation billing: prefer
    // the active one, otherwise the first configured.
    const price = useMemo<StaticIPPrice | undefined>(
        () => prices.find((p) => p.is_active) ?? prices[0],
        [prices]
    )

    return (
        <div className="space-y-5">
            <PageHeader
                icon={Network}
                breadcrumbs={[
                    { label: t("superAdmin.title") },
                    { label: t("superAdmin.staticIps.title") },
                ]}
                title={t("superAdmin.staticIps.title")}
                description={t("superAdmin.staticIps.subtitle")}
            />

            <PricingBar
                price={price}
                onEdit={() => {
                    setPriceFormOpen(true)
                }}
            />

            <Tabs
                value={tab}
                onValueChange={(value) => {
                    setTab(value as StaticIPsTab)
                }}
                className="gap-4"
            >
                <TabsList>
                    <TabsTrigger value="pools">{t("superAdmin.staticIps.tabs.pools")}</TabsTrigger>
                    <TabsTrigger value="in-use">{t("superAdmin.staticIps.tabs.inUse")}</TabsTrigger>
                </TabsList>
                <TabsContent value="pools">
                    <IPPoolsTab />
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

function PricingBar({ price, onEdit }: Readonly<{ price?: StaticIPPrice; onEdit: () => void }>) {
    const { t } = useTranslation()
    const ccy = price?.currency ?? ""

    return (
        <div className="glass-1 flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                    {t("superAdmin.staticIps.pricing.label")}
                </span>
                {price ? (
                    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
                        <PriceMetric
                            label={t("superAdmin.staticIps.pricing.hourly")}
                            value={`${ccy} ${String(price.price_hourly)}`}
                            strong
                        />
                        <PriceMetric
                            label={t("superAdmin.staticIps.pricing.idleHourly")}
                            value={`${ccy} ${String(price.price_idle_hourly)}`}
                        />
                        <PriceMetric
                            label={t("superAdmin.staticIps.pricing.monthly")}
                            value={`${ccy} ${String(price.price_monthly)}`}
                        />
                        <span className="text-[11px] text-muted-foreground">
                            {t("superAdmin.staticIps.pricing.sourceOfTruth")}
                        </span>
                    </div>
                ) : (
                    <span className="text-sm text-muted-foreground">
                        {t("superAdmin.staticIps.pricing.notSetHint")}
                    </span>
                )}
            </div>

            <Button variant={price ? "outline" : "default"} className="gap-2" onClick={onEdit}>
                {price ? <Pencil className="size-4" /> : <Plus className="size-4" />}
                {price
                    ? t("superAdmin.staticIps.pricing.edit")
                    : t("superAdmin.staticIps.pricing.set")}
            </Button>
        </div>
    )
}

function PriceMetric({
    label,
    value,
    strong,
}: Readonly<{ label: string; value: string; strong?: boolean }>) {
    return (
        <span className="flex items-baseline gap-1.5">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {label}
            </span>
            <span
                className={cn(
                    "font-mono tabular-nums text-foreground",
                    strong ? "text-base font-semibold" : "text-sm"
                )}
            >
                {value}
            </span>
        </span>
    )
}
