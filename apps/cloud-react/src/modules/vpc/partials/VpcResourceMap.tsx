import { Globe, Lock, MapPin, Network } from "lucide-react"
import { useTranslation } from "react-i18next"

import type { AvailabilityZoneBrief } from "@/modules/catalog/catalog.types"

import { CIDR_REGEX } from "../vpc.constants"
import { autoSubnetName, cidrAddressCount, formatIpCount } from "../vpc.utils"

export interface ResourceMapSubnet {
  key: number
  name: string
  cidr: string
  zone: string
  is_public: boolean
}

interface VpcResourceMapProps {
  name: string
  cidr: string
  region: string
  subnets: ResourceMapSubnet[]
  /** Zones for the selected region — supplies column order and labels. */
  zones: AvailabilityZoneBrief[]
  /**
   * Whether the map shows its live data. Until the user reaches the CIDR &
   * subnets step there's nothing meaningful to preview, so the panel renders a
   * muted placeholder instead of the auto-carved defaults.
   */
  revealed?: boolean
}

/**
 * An AWS "Resource map"-style topology of what the wizard will create: the VPC
 * container, a column per availability zone, and the public/private subnets
 * carved into each — updating live as the form changes. Icons carry meaning
 * (globe = internet-facing, lock = private) and pair with text labels.
 */
export function VpcResourceMap({
  name,
  cidr,
  region,
  subnets,
  zones,
  revealed = true,
}: Readonly<VpcResourceMapProps>) {
  const { t } = useTranslation()

  if (!revealed) {
    return (
      <div className="glass-1 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">{t("vpc.wizard.resourceMap")}</h3>
        <div className="grid place-items-center gap-2 rounded-lg border border-dashed border-border-glass bg-background/30 px-4 py-10 text-center">
          <Network className="size-5 text-muted-foreground/60" aria-hidden />
          <p className="text-[12px] text-muted-foreground">{t("vpc.wizard.resourceMapHint")}</p>
        </div>
      </div>
    )
  }

  const valid = subnets.filter((s) => CIDR_REGEX.test(s.cidr))
  const totalIps = valid.reduce((sum, s) => sum + (cidrAddressCount(s.cidr) ?? 0), 0)

  // Columns follow the region's zone order, keeping only zones that hold subnets.
  const usedZoneCodes = new Set(valid.map((s) => s.zone))
  const columns = zones
    .filter((z) => usedZoneCodes.has(z.code) || usedZoneCodes.has(z.id))
    .map((z) => ({
      zone: z,
      subnets: valid.filter((s) => s.zone === z.code || s.zone === z.id),
    }))

  return (
    <div className="glass-1 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{t("vpc.wizard.resourceMap")}</h3>
        <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
          {t("vpc.wizard.subnetsTotal", {
            subnets: valid.length,
            ips: totalIps.toLocaleString("en-US"),
          })}
        </span>
      </div>

      {/* VPC container */}
      <div className="rounded-lg border border-border-glass bg-background/40 p-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="grid size-6 shrink-0 place-items-center rounded-md bg-status-info-bg text-status-info">
            <Network className="size-3.5" aria-hidden />
          </span>
          <div className="min-w-0">
            {name ? (
              <span className="block truncate font-mono text-[13px] text-foreground">{name}</span>
            ) : (
              <span className="block truncate font-mono text-[13px] italic text-muted-foreground">
                {t("vpc.wizard.previewAutoName")}
              </span>
            )}
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <MapPin className="size-3" aria-hidden />
              {region || "—"}
            </span>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2 font-mono text-[11px] text-muted-foreground tabular-nums">
          <span>{cidr}</span>
          <span aria-hidden>·</span>
          <span>{t("vpc.wizard.ipCount", { ips: formatIpCount(cidr) })}</span>
        </div>

        {/* AZ columns */}
        {columns.length === 0 ? (
          <p className="mt-3 text-[11px] text-muted-foreground">
            {t("vpc.wizard.previewNoSubnets")}
          </p>
        ) : (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {columns.map(({ zone, subnets: zoneSubnets }) => (
              <ZoneColumn key={zone.id} label={zone.name} subnets={zoneSubnets} />
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="grid size-4 place-items-center rounded bg-status-info-bg text-status-info">
            <Globe className="size-2.5" aria-hidden />
          </span>
          {t("vpc.wizard.legendPublic")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="grid size-4 place-items-center rounded bg-status-neutral-bg text-status-neutral">
            <Lock className="size-2.5" aria-hidden />
          </span>
          {t("vpc.wizard.legendPrivate")}
        </span>
      </div>
    </div>
  )
}

function ZoneColumn({ label, subnets }: Readonly<{ label: string; subnets: ResourceMapSubnet[] }>) {
  const publicSubnets = subnets.filter((s) => s.is_public)
  const privateSubnets = subnets.filter((s) => !s.is_public)

  return (
    <div className="min-w-[120px] flex-1 space-y-1.5">
      <div className="truncate text-center font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      {publicSubnets.map((s, i) => (
        <SubnetBox key={s.key} subnet={s} index={i} />
      ))}
      {privateSubnets.map((s, i) => (
        <SubnetBox key={s.key} subnet={s} index={i} />
      ))}
    </div>
  )
}

function SubnetBox({ subnet, index }: Readonly<{ subnet: ResourceMapSubnet; index: number }>) {
  const label = subnet.name.trim() || autoSubnetName("vpc", subnet.is_public, index)
  const Icon = subnet.is_public ? Globe : Lock
  const accent = subnet.is_public
    ? "border-status-info/30 bg-status-info-bg/40"
    : "border-status-neutral/30 bg-status-neutral-bg/40"
  const iconAccent = subnet.is_public
    ? "bg-status-info-bg text-status-info"
    : "bg-status-neutral-bg text-status-neutral"

  return (
    <div className={"flex items-center gap-1.5 rounded-md border px-2 py-1.5 " + accent}>
      <span className={"grid size-4 shrink-0 place-items-center rounded text-[10px] " + iconAccent}>
        <Icon className="size-2.5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <span
          className={
            "block truncate font-mono text-[11px] " +
            (subnet.name.trim() ? "text-foreground" : "italic text-muted-foreground")
          }
        >
          {label}
        </span>
        <span className="block truncate font-mono text-[10px] text-muted-foreground tabular-nums">
          {subnet.cidr} · {formatIpCount(subnet.cidr)} IP
        </span>
      </div>
    </div>
  )
}
