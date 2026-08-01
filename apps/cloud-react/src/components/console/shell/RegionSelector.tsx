import { useEffect, useMemo } from "react"

import { Check, ChevronDown, Globe, Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { staggerDelay } from "@/components/console"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@datadack/common-ui"
import { cn } from "@/lib/utils"
import { useActiveRegion } from "@/modules/region/region.context"
import { usePlatformRegions } from "@/modules/superadmin/superadmin.hooks"

interface Region {
  label: string
  code: string
}

// Flat, two-line context control: an uppercase caption over the value. Shared by
// every state (loading / empty / active) so the topbar chrome never reflows.
const trigger =
  "h-auto flex-col items-start gap-0 rounded-md border border-border-glass bg-surface-glass px-2.5 py-1 text-left hover:bg-accent/60"

export function RegionSelector() {
  const { t } = useTranslation()
  const { data: catalog, isLoading } = usePlatformRegions()

  // Regions come straight from the public region catalog (already region-grained).
  const regions = useMemo<Region[]>(
    () => (catalog ?? []).map((r) => ({ code: r.code, label: r.name })),
    [catalog],
  )

  const { activeRegionCode, setActiveRegionCode } = useActiveRegion()
  const active = regions.find((r) => r.code === activeRegionCode) ?? regions.at(0)

  // Seed the global selection from the first available zone so creation flows
  // that rely on it always have a concrete code.
  useEffect(() => {
    if (!activeRegionCode && active) setActiveRegionCode(active.code)
  }, [activeRegionCode, active, setActiveRegionCode])

  const Caption = (
    <span className="text-[10px] font-medium uppercase leading-none tracking-wider text-muted-foreground">
      {t("region.label")}
    </span>
  )

  if (isLoading) {
    return (
      <Button variant="ghost" disabled className={trigger}>
        {Caption}
        <span className="mt-1 flex items-center gap-1.5 leading-none">
          <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
          <span className="text-[13px] text-muted-foreground">{t("region.loading")}</span>
        </span>
      </Button>
    )
  }

  if (!active) {
    return (
      <Button variant="ghost" disabled className={trigger}>
        {Caption}
        <span className="mt-1 flex items-center gap-1.5 leading-none">
          <Globe className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="text-[13px] text-muted-foreground">{t("region.none")}</span>
        </span>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className={trigger}>
          {Caption}
          <span className="mt-1 flex items-center gap-1.5 leading-none">
            <Globe className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="max-w-37.5 truncate text-[13px] font-medium text-foreground">
              {active.label}
            </span>
            <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-1.5">
        <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {t("region.label")}
        </DropdownMenuLabel>
        {regions.map((region, index) => {
          const isActive = region.code === active.code
          return (
            <DropdownMenuItem
              key={region.code}
              onSelect={() => {
                setActiveRegionCode(region.code)
              }}
              style={staggerDelay(index)}
              className={cn(
                "flex animate-content-enter cursor-pointer items-center gap-2.5 rounded-md px-2 py-2",
                isActive && "bg-accent/60",
              )}
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <Globe className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium">{region.label}</div>
                <div className="truncate font-mono text-[10px] text-muted-foreground">
                  {region.code}
                </div>
              </div>
              <Check
                className={cn(
                  "size-4 shrink-0 text-brand-gold",
                  isActive ? "opacity-100" : "opacity-0",
                )}
              />
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
