import { cn } from "@datadack/common-ui"
import { useTranslation } from "react-i18next"

import { ConfirmDialog } from "@/components/console"

import { useAdminIPPoolAddresses, useDeleteIPPool } from "../superadmin.hooks"
import type { IpPool } from "../superadmin.types"

interface Props {
  pool: IpPool | null
  onOpenChange: (open: boolean) => void
}

/**
 * Deleting a pool, in its two forms.
 *
 * An empty block is an ordinary confirm. A block with live allocations is not:
 * the server refuses it outright unless asked to force, and forcing releases
 * every address in the range — including the ones VMs are currently running on.
 * So that path spells out what it will take down, counts the addresses that are
 * actually attached, and makes the operator type the pool name.
 */
export function DeleteIPPoolDialog({ pool, onOpenChange }: Readonly<Props>) {
  const { t } = useTranslation()
  const { mutate: remove, isPending } = useDeleteIPPool()
  const inUse = (pool?.used ?? 0) > 0

  // Only worth expanding the block when the answer changes the decision — an
  // empty pool's confirm needs no breakdown.
  const { data: expansion } = useAdminIPPoolAddresses(inUse ? pool?.id : undefined)
  const attached = expansion?.addresses.filter((a) => a.status === "associated").length

  const close = () => {
    onOpenChange(false)
  }

  const confirm = () => {
    if (!pool) return
    remove({ id: pool.id, force: inUse }, { onSuccess: close })
  }

  return (
    <ConfirmDialog
      open={!!pool}
      onOpenChange={(open) => {
        if (!open) close()
      }}
      title={
        inUse
          ? t("superAdmin.staticIps.pools.forceDeleteTitle")
          : t("superAdmin.staticIps.pools.confirmDeleteTitle")
      }
      description={
        inUse ? (
          <ForceWarning pool={pool} attached={attached} />
        ) : (
          t("superAdmin.staticIps.pools.confirmDeleteBody", { cidr: pool?.cidr ?? "" })
        )
      }
      // Typing the name is the brake on the destructive path only; an empty
      // block does not need one.
      confirmText={inUse ? pool?.name : undefined}
      confirmLabel={
        inUse ? t("superAdmin.staticIps.pools.forceDelete") : t("superAdmin.staticIps.pools.delete")
      }
      loading={isPending}
      onConfirm={confirm}
    />
  )
}

function ForceWarning({
  pool,
  attached,
}: Readonly<{ pool: IpPool | null; attached: number | undefined }>) {
  const { t } = useTranslation()
  if (!pool) return null

  return (
    <div className="space-y-3">
      <p>
        {t("superAdmin.staticIps.pools.forceDeleteBody", {
          cidr: pool.cidr,
          allocated: pool.used,
        })}
      </p>

      <ul className="space-y-1.5 rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-[12px]">
        <Consequence
          label={t("superAdmin.staticIps.pools.forceDeleteAllocations")}
          value={String(pool.used)}
        />
        <Consequence
          label={t("superAdmin.staticIps.pools.forceDeleteAttached")}
          value={attached === undefined ? "…" : String(attached)}
          // An unresolved count is not a reassuring zero — keep it neutral.
          tone={attached !== undefined && attached > 0 ? "danger" : "muted"}
        />
      </ul>

      <p className="text-[12px] text-muted-foreground">
        {t("superAdmin.staticIps.pools.forceDeleteHint")}
      </p>
    </div>
  )
}

function Consequence({
  label,
  value,
  tone = "muted",
}: Readonly<{ label: string; value: string; tone?: "muted" | "danger" }>) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-mono tabular-nums",
          tone === "danger" ? "font-semibold text-destructive" : "text-foreground",
        )}
      >
        {value}
      </span>
    </li>
  )
}
