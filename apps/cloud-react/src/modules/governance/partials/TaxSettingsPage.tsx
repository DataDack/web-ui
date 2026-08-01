import { useCallback, useMemo, useState } from "react"

import type { ColumnDef } from "@tanstack/react-table"
import { Download, Pencil, Plus, Receipt, RefreshCw, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import {
  actionsColumn,
  ConfirmDialog,
  EmptyState,
  PageHeader,
  ResourceTable,
  statusColumn,
  textColumn,
} from "@/components/console"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@datadack/common-ui"
import { useActiveScope } from "@/modules/accounts/accounts.hooks"
import { useAuth } from "@/modules/auth/auth.context"
import { useActiveOrganization } from "@/modules/organizations/organizations.hooks"
import { useScreen } from "@/services/api/screen"

import { TAX_SETTINGS_ROUTES } from "../governance.constants"
import {
  useDeleteTaxRegistration,
  useDownloadTaxCsv,
  useTaxRegistrations,
} from "../tax-settings.hooks"
import type { TaxRegistration } from "../tax-settings.types"

const TRN_STATUSES = ["pending", "verified", "rejected"] as const

export function TaxSettingsPage() {
  useScreen("governance.tax-settings")
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { activeOrg } = useActiveOrganization()
  const scope = useActiveScope()
  // Only the account owner (the "root user") may manage tax registrations —
  // not admin/billing/viewer members — with the platform super admin always
  // permitted. Authority lives in the account membership role, not the flat
  // user role. Mirrors the backend gate in the tax-settings service.
  const canManage = user?.is_super_admin === true || activeOrg?.member_role === "owner"

  const [status, setStatus] = useState<string>("")
  const [search, setSearch] = useState("")
  const [toDelete, setToDelete] = useState<TaxRegistration | null>(null)

  const {
    data: rows = [],
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useTaxRegistrations({ status: status || undefined, q: search || undefined })
  const { mutate: remove, isPending: isDeleting } = useDeleteTaxRegistration()
  const { mutate: downloadCsv, isPending: isExporting } = useDownloadTaxCsv()

  const goToCreate = () => void navigate(TAX_SETTINGS_ROUTES.CREATE)
  const goToEdit = useCallback(
    (id: string) => void navigate(TAX_SETTINGS_ROUTES.edit(id)),
    [navigate],
  )

  // The backend allows one registration per (account, country). The active
  // account's existing India registration (seeded at onboarding) turns the
  // primary action into "Edit" instead of "Add" so we never offer a create
  // that would just fail with "already exists".
  const activeRegistration = pickActiveRegistration(rows, scope.accountId)

  const columns = useMemo<ColumnDef<TaxRegistration>[]>(
    () => [
      textColumn<TaxRegistration>({
        id: "account_number",
        header: t("taxSettings.columns.accountId"),
        accessor: (r) => r.accountNumber,
        mono: true,
      }),
      textColumn<TaxRegistration>({
        id: "account_name",
        header: t("taxSettings.columns.accountName"),
        accessor: (r) => r.accountName,
        responsive: "md",
      }),
      textColumn<TaxRegistration>({
        id: "legal_name",
        header: t("taxSettings.columns.businessLegalName"),
        accessor: (r) => r.businessLegalName,
        responsive: "lg",
      }),
      textColumn<TaxRegistration>({
        id: "legal_address",
        header: t("taxSettings.columns.businessLegalAddress"),
        accessor: (r) => formatAddress(r),
        muted: true,
        responsive: "xl",
      }),
      textColumn<TaxRegistration>({
        id: "trn",
        header: t("taxSettings.columns.trn"),
        accessor: (r) => r.trn,
        mono: true,
      }),
      statusColumn<TaxRegistration>({
        header: t("taxSettings.columns.trnStatus"),
        accessor: (r) => r.trnStatus,
      }),
      textColumn<TaxRegistration>({
        id: "seller",
        header: t("taxSettings.columns.seller"),
        accessor: (r) => r.seller,
        muted: true,
        responsive: "lg",
      }),
      actionsColumn<TaxRegistration>({
        ariaLabel: t("console.table.actions"),
        actions: (reg) =>
          canManage
            ? [
                {
                  label: t("common.edit"),
                  icon: Pencil,
                  onAction: () => {
                    goToEdit(reg.id)
                  },
                },
                {
                  label: t("taxSettings.actions.remove"),
                  icon: Trash2,
                  destructive: true,
                  onAction: () => {
                    setToDelete(reg)
                  },
                },
              ]
            : [],
      }),
    ],
    [t, canManage, goToEdit],
  )

  return (
    <div>
      <PageHeader
        icon={Receipt}
        breadcrumbs={[
          { label: t("console.nav.groups.governance") },
          { label: t("taxSettings.title") },
        ]}
        title={t("taxSettings.title")}
        description={t("taxSettings.subtitle")}
        actions={
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void refetch()}
              disabled={isFetching}
              aria-label={t("common.refresh")}
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                downloadCsv()
              }}
              disabled={isExporting || rows.length === 0}
            >
              <Download className="w-4 h-4" />
              {t("taxSettings.actions.exportCsv")}
            </Button>
            {canManage &&
              (activeRegistration ? (
                <Button
                  className="gap-2"
                  onClick={() => {
                    goToEdit(activeRegistration.id)
                  }}
                >
                  <Pencil className="w-4 h-4" />
                  {t("taxSettings.editTitle")}
                </Button>
              ) : (
                <Button className="gap-2" onClick={goToCreate}>
                  <Plus className="w-4 h-4" />
                  {t("taxSettings.createTitle")}
                </Button>
              ))}
          </>
        }
      />

      <ResourceTable<TaxRegistration>
        data={rows}
        columns={columns}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        getRowId={(r) => r.id}
        onRowClick={
          canManage
            ? (r) => {
                goToEdit(r.id)
              }
            : undefined
        }
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
              }}
              placeholder={t("taxSettings.searchPlaceholder")}
              className="w-64"
            />
            <Select
              value={status || "any"}
              onValueChange={(v) => {
                setStatus(v === "any" ? "" : v)
              }}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">{t("taxSettings.filters.anyStatus")}</SelectItem>
                {TRN_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`taxSettings.status.${s}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
        emptyState={
          <EmptyState
            icon={Receipt}
            title={t("taxSettings.empty")}
            description={t("taxSettings.emptySubtitle")}
            action={
              canManage
                ? {
                    label: t("taxSettings.createTitle"),
                    onClick: goToCreate,
                  }
                : undefined
            }
          />
        }
      />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => {
          if (!open) setToDelete(null)
        }}
        title={t("taxSettings.deleteConfirm.title")}
        description={t("taxSettings.deleteConfirm.description", {
          trn: toDelete?.trn ?? "",
        })}
        confirmLabel={t("taxSettings.actions.remove")}
        loading={isDeleting}
        onConfirm={() => {
          if (!toDelete) return
          remove(toDelete.id, {
            onSuccess: () => {
              setToDelete(null)
            },
          })
        }}
      />
    </div>
  )
}

/** The registration for the active account — the one the primary action edits.
 * Falls back to the sole row when no account scope is set (single-account org). */
function pickActiveRegistration(
  rows: TaxRegistration[],
  activeAccountId: string | null,
): TaxRegistration | undefined {
  if (activeAccountId) {
    return rows.find((r) => r.accountId === activeAccountId)
  }
  return rows.length === 1 ? rows[0] : undefined
}

/** One-line legal address for the table cell. */
function formatAddress(r: TaxRegistration): string {
  const a = r.legalAddress
  if (!a) return ""
  return [a.line1, a.line2, a.city, a.stateProvince, a.postalCode, a.country]
    .filter(Boolean)
    .join(", ")
}
