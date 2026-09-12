import type { RowAction } from "@datadack/common-ui"
import { Ban, CheckCircle2, Clock, Pencil, Play, Trash2, Wrench } from "lucide-react"


import type {
  CatalogModuleAdmin,
  CatalogServiceAdmin,
  ServiceHealthStatus,
  ServiceState,
} from "../../superadmin.types"

const STATE_STEPS = [
  {
    state: "enabled" as ServiceState,
    labelKey: "superAdmin.services.actions.enable",
    icon: CheckCircle2,
  },
  {
    state: "coming_soon" as ServiceState,
    labelKey: "superAdmin.services.actions.comingSoon",
    icon: Clock,
  },
  { state: "disabled" as ServiceState, labelKey: "superAdmin.services.actions.disable", icon: Ban },
]

export interface ServiceActionHandlers {
  t: (key: string) => string
  onEdit: (svc: CatalogServiceAdmin) => void
  onSetState: (id: string, state: ServiceState) => void
  onSetStatus: (svc: CatalogServiceAdmin, status: ServiceHealthStatus) => void
  onDelete: (svc: CatalogServiceAdmin) => void
}

/**
 * Edit, the maintenance toggle, the two state transitions not already active,
 * then delete. Kept at module scope so the row component stays shallow.
 */
export function buildServiceActions(
  svc: CatalogServiceAdmin,
  h: ServiceActionHandlers,
): RowAction<CatalogServiceAdmin>[] {
  const actions: RowAction<CatalogServiceAdmin>[] = [
    { label: h.t("superAdmin.actions.edit"), icon: Pencil, onAction: h.onEdit },
  ]
  // The maintenance toggle sits directly under Edit: it is the one field that
  // opens or closes this service's pages for every tenant.
  if (svc.status === "maintenance") {
    actions.push({
      label: h.t("superAdmin.services.actions.bringOnline"),
      icon: Play,
      onAction: (s) => {
        h.onSetStatus(s, "operational")
      },
    })
  } else {
    actions.push({
      label: h.t("superAdmin.services.actions.maintenance"),
      icon: Wrench,
      onAction: (s) => {
        h.onSetStatus(s, "maintenance")
      },
    })
  }
  for (const step of STATE_STEPS) {
    if (svc.state === step.state) continue
    actions.push({
      label: h.t(step.labelKey),
      icon: step.icon,
      onAction: (s) => {
        h.onSetState(s.id, step.state)
      },
    })
  }
  actions.push({
    label: h.t("superAdmin.actions.delete"),
    icon: Trash2,
    destructive: true,
    onAction: h.onDelete,
  })
  return actions
}


/** The two transitions that are not already this module's state. */
export function buildModuleActions(
  mod: CatalogModuleAdmin,
  t: (key: string) => string,
  setState: (id: string, state: ServiceState) => void,
): RowAction<CatalogModuleAdmin>[] {
  return STATE_STEPS.filter((step) => step.state !== mod.state).map((step) => ({
    label: t(step.labelKey),
    icon: step.icon,
    destructive: step.state === "disabled",
    onAction: (row: CatalogModuleAdmin) => {
      setState(row.id, step.state)
    },
  }))
}
