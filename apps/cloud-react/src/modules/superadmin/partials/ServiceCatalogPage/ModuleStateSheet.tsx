import { useEffect, useState } from "react"

import {
  Button,
  cn,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@datadack/common-ui"
import { Ban, CheckCircle2, Clock, ExternalLink } from "lucide-react"
import { useTranslation } from "react-i18next"

import { useUpdateServiceModuleState } from "../../superadmin.hooks"
import type { CatalogModuleAdmin, ServiceState } from "../../superadmin.types"

const OPTIONS: { state: ServiceState; icon: typeof Ban }[] = [
  { state: "enabled", icon: CheckCircle2 },
  { state: "coming_soon", icon: Clock },
  { state: "disabled", icon: Ban },
]

/** One read-only reference row: what this module is, for orientation. */
function Detail({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="truncate font-mono text-[11px] text-foreground">{value || "—"}</span>
    </div>
  )
}

/**
 * Editor for a single sidebar module.
 *
 * Visibility is the only editable field, because it is the only one the console
 * reads: a module is matched by `service_key` + `key`, and its label, icon,
 * route and position all come from the frontend's own `sidebar-nav.ts`. Name and
 * path are stored purely so this admin can show a recognisable row, so they are
 * shown here as reference rather than offered as edits that would change
 * nothing a tenant sees.
 */
export function ModuleStateSheet({
  open,
  onOpenChange,
  module: mod,
}: Readonly<{
  open: boolean
  onOpenChange: (open: boolean) => void
  module: CatalogModuleAdmin | null
}>) {
  const { t } = useTranslation()
  const { mutate: setModuleState, isPending } = useUpdateServiceModuleState()
  const [state, setState] = useState<ServiceState>("enabled")

  useEffect(() => {
    if (open && mod) setState(mod.state)
  }, [open, mod])

  const submit = () => {
    if (!mod || state === mod.state) {
      onOpenChange(false)
      return
    }
    setModuleState(
      { id: mod.id, payload: { state } },
      {
        onSuccess: () => {
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full max-w-[420px] flex-col gap-0 p-0">
        <SheetHeader className="shrink-0 px-6 py-5">
          <SheetTitle>{mod?.name ?? t("superAdmin.serviceCatalog.moduleSheet.title")}</SheetTitle>
          <SheetDescription>{t("superAdmin.serviceCatalog.moduleSheet.subtitle")}</SheetDescription>
        </SheetHeader>
        <Separator />

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <fieldset className="space-y-1.5">
            <legend className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t("superAdmin.serviceCatalog.moduleSheet.stateLegend")}
            </legend>
            {OPTIONS.map(({ state: value, icon: Icon }) => {
              const selected = state === value
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    setState(value)
                  }}
                  className={cn(
                    "flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selected
                      ? "border-primary/50 bg-primary/5"
                      : "border-border hover:bg-muted/50",
                  )}
                >
                  <Icon
                    className={cn(
                      "mt-0.5 size-4 shrink-0",
                      selected ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                  <span className="min-w-0">
                    <span className="block text-[12px] font-medium text-foreground">
                      {t(`superAdmin.services.states.${value}`)}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      {t(`superAdmin.serviceCatalog.moduleSheet.options.${value}`)}
                    </span>
                  </span>
                </button>
              )
            })}
          </fieldset>

          <div className="rounded-lg border border-border-glass px-3 py-1.5">
            <Detail label={t("superAdmin.serviceCatalog.fields.service")} value={mod?.service_key ?? ""} />
            <Detail label={t("superAdmin.services.fields.key")} value={mod?.key ?? ""} />
            <Detail label={t("superAdmin.serviceCatalog.fields.path")} value={mod?.path ?? ""} />
            <Detail
              label={t("superAdmin.services.fields.sortOrder")}
              value={mod ? String(mod.sort_order) : ""}
            />
          </div>

          <p className="text-[11px] text-muted-foreground">
            {t("superAdmin.serviceCatalog.moduleSheet.referenceHint")}
          </p>

          {mod?.path ? (
            <a
              href={mod.path}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-primary hover:underline"
            >
              <ExternalLink className="size-3.5" />
              {t("superAdmin.serviceCatalog.openPage")}
            </a>
          ) : null}
        </div>

        <Separator />
        <div className="flex shrink-0 items-center justify-end gap-3 px-6 py-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            {t("console.wizard.cancel")}
          </Button>
          <Button type="button" variant="gold" disabled={isPending} onClick={submit}>
            {t("superAdmin.actions.save")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
