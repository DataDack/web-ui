import { useMemo, useState } from "react"

import { Globe, Plus, RefreshCw, ScrollText, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { PageHeader } from "@/components/console"
import { useScreen } from "@/services/api/screen"

import { Button, DataTable, EmptyState, actionsColumn } from "@datadack/common-ui"

import {
  useRegisteredDomains,
  useRemoveRegisteredDomain,
  useVerifyRegisteredDomain,
} from "../registrar.hooks"
import type { RegisteredDomain } from "../registrar.types"
import { RegisterDomainDialog } from "./RegisterDomainDialog"
import { buildRegistrarColumns } from "./registrar-columns"

/**
 * The Domains tab: which domains this account owns.
 *
 * The sibling page (DomainsListPage) lists HOSTNAMES — every name the platform
 * answers for, most of them minted automatically. This one lists the domains the
 * tenant brought and proved, which is a much shorter list and a different
 * question: not "what is running" but "what am I allowed to attach".
 *
 * Registering here once covers a domain and every subdomain of it, so attaching
 * one afterwards needs no further proof. That is the sentence the empty state and
 * the dialog both exist to get across, because it is the part that is not obvious
 * from a table of domains.
 */
export function RegistrarPage() {
  useScreen("domains.registrar")
  const { t } = useTranslation()

  const [dialogOpen, setDialogOpen] = useState(false)
  // The row whose record the dialog should open on. null = a fresh registration.
  const [editing, setEditing] = useState<RegisteredDomain | null>(null)

  const { data, isLoading, isError, refetch, isFetching } = useRegisteredDomains()
  const verify = useVerifyRegisteredDomain()
  const remove = useRemoveRegisteredDomain()
  const rows = data ?? []

  const openFor = (row: RegisteredDomain | null) => {
    setEditing(row)
    setDialogOpen(true)
  }

  const columns = useMemo(
    () => [
      ...buildRegistrarColumns(t),
      actionsColumn<RegisteredDomain>({
        ariaLabel: t("domains.registrar.actions.menu"),
        actions: (row) => {
          const actions = []
          // Only offered while there is something to act on. A verified domain
          // has no record left to publish and nothing to re-check, and offering
          // either would be a menu item that does nothing.
          if (row.status !== "verified") {
            actions.push({
              label: t("domains.registrar.actions.viewRecord"),
              icon: ScrollText,
              onAction: () => { openFor(row); },
            })
            actions.push({
              label: t("domains.registrar.actions.checkNow"),
              icon: RefreshCw,
              onAction: () => { verify.mutate(row.domain); },
            })
          }
          actions.push({
            label: t("domains.registrar.actions.remove"),
            icon: Trash2,
            destructive: true,
            onAction: () => { remove.mutate(row.domain); },
          })
          return actions
        },
      }),
    ],
    [t, verify, remove],
  )

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Globe}
        breadcrumbs={[
          { label: t("console.nav.groups.domains") },
          { label: t("domains.registrar.title") },
        ]}
        title={t("domains.registrar.title")}
        description={t("domains.registrar.subtitle")}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void refetch()}
              disabled={isFetching}
              aria-label={t("common.refresh")}
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
            <Button onClick={() => { openFor(null); }}>
              <Plus className="mr-2 size-4" />
              {t("domains.registrar.add")}
            </Button>
          </div>
        }
      />

      <DataTable<RegisteredDomain>
        data={rows}
        columns={columns}
        loading={isLoading}
        error={isError ? t("console.table.error") : undefined}
        onRetry={() => void refetch()}
        retryLabel={t("console.table.retry")}
        getRowId={(row) => row.id}
        // A pending row opens on its record — the one thing its owner wants.
        // A verified row has nothing further to show here, so it stays inert
        // rather than opening a panel that says "verified" and nothing else.
        onRowClick={(row) => {
          if (row.status !== "verified") openFor(row)
        }}
        empty={
          <EmptyState
            icon={Globe}
            title={t("domains.registrar.empty")}
            description={t("domains.registrar.emptySubtitle")}
            action={{
              label: t("domains.registrar.add"),
              onClick: () => { openFor(null); },
            }}
          />
        }
        onRefresh={() => void refetch()}
        refreshLabel={t("console.table.refresh")}
        refreshing={isFetching}
      />

      <RegisterDomainDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        existing={editing}
      />
    </div>
  )
}
