import {
  cn,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Skeleton,
} from "@datadack/common-ui"
import { useTranslation } from "react-i18next"

import { useAdminIPPoolAddresses } from "../superadmin.hooks"
import type { IpPool, PoolAddress, PoolAddressStatus } from "../superadmin.types"

/**
 * `free` is stock; `available` is reserved by a tenant but attached to nothing;
 * `associated` is live on a resource. The three tones are the whole point of the
 * drill-in — it answers "what exactly is holding this block open?".
 */
const TONES: Record<PoolAddressStatus, string> = {
  free: "border-border-glass bg-background/60 text-muted-foreground",
  available: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  associated: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
}

const DOTS: Record<PoolAddressStatus, string> = {
  free: "bg-muted-foreground/40",
  available: "bg-amber-500",
  associated: "bg-emerald-500",
}

interface Props {
  pool: IpPool | null
  onOpenChange: (open: boolean) => void
}

export function PoolAddressesSheet({ pool, onOpenChange }: Readonly<Props>) {
  const { t } = useTranslation()
  const { data, isLoading } = useAdminIPPoolAddresses(pool?.id)
  const addresses = data?.addresses ?? []

  const counts = addresses.reduce<Record<PoolAddressStatus, number>>(
    (acc, a) => ({ ...acc, [a.status]: acc[a.status] + 1 }),
    { free: 0, available: 0, associated: 0 },
  )

  return (
    <Sheet open={!!pool} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full max-w-[520px] flex-col gap-0 p-0">
        <SheetHeader className="shrink-0 px-6 py-5">
          <SheetTitle className="font-mono">{pool?.name}</SheetTitle>
          <SheetDescription>
            {t("superAdmin.staticIps.pools.addressesSubtitle", { cidr: pool?.cidr ?? "" })}
          </SheetDescription>
        </SheetHeader>
        <Separator />

        <div className="flex shrink-0 items-center gap-4 px-6 py-3 text-[11px]">
          <Legend
            status="associated"
            label={t("superAdmin.staticIps.inUse.associated")}
            count={counts.associated}
          />
          <Legend
            status="available"
            label={t("superAdmin.staticIps.inUse.reserved")}
            count={counts.available}
          />
          <Legend status="free" label={t("superAdmin.staticIps.pools.free")} count={counts.free} />
        </div>
        <Separator />

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : (
            <ul className="space-y-1.5">
              {addresses.map((address) => (
                <AddressRow key={address.ip_address} address={address} />
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Legend({
  status,
  label,
  count,
}: Readonly<{ status: PoolAddressStatus; label: string; count: number }>) {
  return (
    <span className="flex items-center gap-1.5 text-muted-foreground">
      <span className={cn("size-1.5 rounded-full", DOTS[status])} />
      {label}
      <span className="font-mono tabular-nums text-foreground">{count}</span>
    </span>
  )
}

const STATUS_LABEL_KEYS: Record<PoolAddressStatus, string> = {
  free: "superAdmin.staticIps.pools.free",
  available: "superAdmin.staticIps.inUse.reserved",
  associated: "superAdmin.staticIps.inUse.associated",
}

function AddressRow({ address }: Readonly<{ address: PoolAddress }>) {
  const { t } = useTranslation()
  const label = t(STATUS_LABEL_KEYS[address.status])

  return (
    <li
      className={cn(
        "flex items-center justify-between gap-3 rounded-md border px-3 py-2 transition-colors duration-150",
        TONES[address.status],
      )}
    >
      <span className="font-mono text-[13px] tabular-nums text-foreground">
        {address.ip_address}
      </span>
      <span className="flex min-w-0 items-center gap-2">
        {address.name && (
          <span className="truncate text-[11px] text-muted-foreground">{address.name}</span>
        )}
        <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium">
          <span className={cn("size-1.5 rounded-full", DOTS[address.status])} />
          {label}
        </span>
      </span>
    </li>
  )
}
