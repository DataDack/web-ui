import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Skeleton,
} from "@datadack/common-ui"
import { AlertTriangle, ShieldAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { StatusBadge } from "@/components/console"

import { useHardDeletePreview } from "../superadmin.hooks"
import type { PVENode } from "../superadmin.types"

/**
 * Confirmation for a records-only node purge.
 *
 * A plain "are you sure" is not enough here: the action is unrecoverable, it
 * reaches far beyond the node itself, and the operator has no other way to see
 * what points at a node — the instances API is account-scoped, so a node's
 * guests are invisible from any single account. So the dialog names the
 * resources first and only then offers the button.
 */
export function HardDeleteNodeDialog({
  node,
  onOpenChange,
  onConfirm,
  loading,
}: Readonly<{
  node: PVENode | null
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  loading: boolean
}>) {
  const { t } = useTranslation()
  const { data: preview, isLoading, isError } = useHardDeletePreview(node?.id)

  // Refused server-side while the node is a live cluster member, so the button
  // is disabled rather than letting the operator click into a 409.
  const blocked = preview?.still_member === true

  return (
    <Dialog open={!!node} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="size-5 text-destructive" />
            {t("superAdmin.pveNodes.hardDeleteTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("superAdmin.pveNodes.hardDeleteConfirm", { name: node?.name ?? "" })}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : null}

        {isError ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
            {t("superAdmin.pveNodes.hardDeletePreviewFailed")}
          </p>
        ) : null}

        {preview ? (
          <div className="space-y-3">
            {blocked ? (
              <p className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                {t("superAdmin.pveNodes.hardDeleteBlocked", { cluster: preview.cluster ?? "" })}
              </p>
            ) : null}

            {preview.membership_unknown ? (
              <p className="rounded-md bg-amber-500/10 px-3 py-2 text-[12px] text-amber-700 dark:text-amber-400">
                {t("superAdmin.pveNodes.hardDeleteMembershipUnknown")}
              </p>
            ) : null}

            {preview.total === 0 ? (
              <p className="rounded-md border border-border px-3 py-2 text-[13px] text-muted-foreground">
                {t("superAdmin.pveNodes.hardDeleteNothing")}
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-[13px] font-semibold text-foreground">
                  {t("superAdmin.pveNodes.hardDeleteWillRemove", { count: preview.total })}
                </p>
                <div className="max-h-64 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                  {preview.groups.map((g) => (
                    <div key={g.table} className="p-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[13px] font-semibold capitalize text-foreground">
                          {g.kind}
                        </span>
                        <Badge variant="outline" className="font-mono text-[11px]">
                          {g.count}
                        </Badge>
                      </div>
                      <ul className="space-y-1">
                        {g.items.map((item) => (
                          <li key={item.id} className="flex items-center gap-2 text-[12px]">
                            <span className="font-mono text-muted-foreground truncate max-w-[18rem]">
                              {item.name || item.id}
                            </span>
                            {item.status ? <StatusBadge status={item.status} /> : null}
                          </li>
                        ))}
                        {/* The count is exact even when the listing is capped. */}
                        {g.count > g.items.length ? (
                          <li className="text-[11px] text-muted-foreground">
                            {t("superAdmin.pveNodes.hardDeleteMore", {
                              count: g.count - g.items.length,
                            })}
                          </li>
                        ) : null}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={blocked || isLoading}
            loading={loading}
          >
            {preview && preview.total > 0
              ? t("superAdmin.pveNodes.hardDeleteConfirmCount", { count: preview.total })
              : t("superAdmin.pveNodes.hardDelete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
