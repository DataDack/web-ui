import { Tabs, TabsList, TabsTrigger } from "@datadack/common-ui"
import { useSearchParams } from "react-router-dom"

import { BandwidthPricesPage } from "./BandwidthPricesPage"
import { StaticIPPricesPage } from "./StaticIPPricesPage"
import { StoragePricesPage } from "./StoragePricesPage"
import { VMPricesPage } from "./VMPricesPage"

const PRICE_TABS = ["compute", "storage", "static-ips", "bandwidth"] as const
type PriceTab = (typeof PRICE_TABS)[number]

function isPriceTab(value: string | null): value is PriceTab {
  return PRICE_TABS.some((tab) => tab === value)
}

/** One operator workspace for every infrastructure rate table. */
export function PricingPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get("tab")
  const tab: PriceTab = isPriceTab(requestedTab) ? requestedTab : "compute"

  const setTab = (next: string) => {
    if (!isPriceTab(next)) return
    setSearchParams({ tab: next }, { replace: true })
  }

  return (
    <div className="space-y-5">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList aria-label="Pricing category" className="max-w-full overflow-x-auto">
          <TabsTrigger value="compute">Compute</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
          <TabsTrigger value="static-ips">Static IPs</TabsTrigger>
          <TabsTrigger value="bandwidth">Bandwidth</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "compute" && <VMPricesPage />}
      {tab === "storage" && <StoragePricesPage />}
      {tab === "static-ips" && <StaticIPPricesPage />}
      {tab === "bandwidth" && <BandwidthPricesPage />}
    </div>
  )
}
