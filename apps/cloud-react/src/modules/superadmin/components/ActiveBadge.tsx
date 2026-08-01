import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"

/** Compact active/inactive pill used across the admin catalog tables. */
export function ActiveBadge({ active }: Readonly<{ active: boolean }>) {
  const { t } = useTranslation()
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        active
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "border-border-glass bg-muted/50 text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          active ? "bg-emerald-500" : "bg-muted-foreground/50",
        )}
      />
      {active ? t("superAdmin.fields.active") : t("superAdmin.fields.inactive")}
    </span>
  )
}
