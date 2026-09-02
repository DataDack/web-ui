import { useMemo, useState } from "react"

import { Eye, Globe, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ConfirmDialog, Section } from "@/components/console"

import { actionsColumn, Button, DataTable, EmptyState, type RowAction } from "@datadack/common-ui"

import { useDomains, useRemoveDomain, useVerifyDomain } from "../domains.hooks"
import type { Domain } from "../domains.types"
import { AddDomainDialog } from "./AddDomainDialog"
import { buildDomainColumns } from "./domain-columns"

/**
 * The hostnames attached to ONE resource, for embedding in that resource's
 * detail page (managed-app project, load balancer, ...). Same rows and same
 * cells as the standalone /domains registry — buildDomainColumns is shared —
 * minus the columns that only restate the page the reader is already on.
 *
 * The registry keys attachments as (resource_type, resource_id): pass the
 * registry's identifier for the resource (e.g. "mgd_app_project" + project id),
 * not the console's route names.
 *
 * Row actions exist for CUSTOM rows only: a managed hostname lives and dies
 * with its resource, so there is nothing a tenant can do to it here — with one
 * exception the OWNING product has to supply. Some platform-minted names are
 * editable, because they are stored on the resource itself (a managed app's
 * subdomain) rather than being derived from something immovable. This table
 * cannot know which, so it renders the action only when a caller passes
 * onEditManaged, and leaves the editing UI to the product that owns the field.
 */
export function ResourceDomainsTab({
  resourceType,
  resourceId,
  onEditManaged,
}: Readonly<{
  resourceType: string
  resourceId: string
  /** Called with the resource's primary platform-minted row, when it can be
   *  renamed. Absent means managed rows carry no actions at all. */
  onEditManaged?: (domain: Domain) => void
}>) {
  // Hooks first, always — early returns (none here) come after every hook.
  const { t } = useTranslation()
  const { data, isLoading, isError, refetch } = useDomains({
    resource_type: resourceType,
    resource_id: resourceId,
    // One resource holds a handful of names at most; a single page is the
    // honest UI and spares the tab a pager it would never need.
    limit: 50,
  })
  const { mutate: verifyDomain } = useVerifyDomain()
  const { mutate: removeDomain, isPending: removing } = useRemoveDomain()

  const [dialogOpen, setDialogOpen] = useState(false)
  // Non-null when the dialog was opened from a row ("View records"): it skips
  // the hostname input and lands straight on that row's DNS records.
  const [dialogRow, setDialogRow] = useState<Domain | null>(null)
  const [toRemove, setToRemove] = useState<Domain | null>(null)

  const rows = data?.rows ?? []
  const columns = useMemo(
    () => [
      ...buildDomainColumns(t, { forResource: true }),
      actionsColumn<Domain>({
        ariaLabel: t("console.table.actions"),
        actions: (domain) => {
          // Managed rows: nothing but the address edit, and only when the owning
          // product handed one in and this is the row that IS the resource's
          // address. A secondary managed row is not the field being edited.
          if (domain.managed) {
            if (!onEditManaged || !domain.is_primary) return []
            return [
              {
                label: t("domains.actions.editAddress"),
                icon: Pencil,
                onAction: onEditManaged,
              },
            ]
          }
          const actions: RowAction<Domain>[] = []
          if (domain.status === "pending") {
            actions.push(
              {
                label: t("domains.actions.viewRecords"),
                icon: Eye,
                onAction: (row) => {
                  setDialogRow(row)
                  setDialogOpen(true)
                },
              },
              {
                label: t("domains.actions.verifyNow"),
                icon: RefreshCw,
                onAction: (row) => {
                  verifyDomain(row.hostname)
                },
              },
            )
          }
          actions.push({
            label: t("domains.actions.remove"),
            icon: Trash2,
            destructive: true,
            onAction: (row) => {
              setToRemove(row)
            },
          })
          return actions
        },
      }),
    ],
    [t, verifyDomain, onEditManaged],
  )

  return (
    <Section
      variant="panel"
      title={t("domains.resourceTab.title")}
      description={t("domains.resourceTab.description")}
      actions={
        <Button
          size="sm"
          variant="gold"
          className="gap-1.5"
          onClick={() => {
            setDialogRow(null)
            setDialogOpen(true)
          }}
        >
          <Plus className="size-3.5" />
          {t("domains.actions.add")}
        </Button>
      }
    >
      <DataTable<Domain>
        data={rows}
        columns={columns}
        loading={isLoading}
        getRowId={(domain) => domain.id}
        empty={
          <EmptyState
            icon={Globe}
            title={t("domains.resourceTab.empty")}
            description={t("domains.resourceTab.emptySubtitle")}
          />
        }
        error={isError ? t("console.table.error") : undefined}
        onRetry={() => void refetch()}
        retryLabel={t("console.table.retry")}
      />

      <AddDomainDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setDialogRow(null)
        }}
        resourceType={resourceType}
        resourceId={resourceId}
        existing={dialogRow}
      />

      <ConfirmDialog
        open={toRemove !== null}
        onOpenChange={(open) => {
          if (!open) setToRemove(null)
        }}
        title={t("domains.actions.removeConfirmTitle", { hostname: toRemove?.hostname ?? "" })}
        description={t("domains.actions.removeConfirmBody")}
        confirmLabel={t("domains.actions.removeConfirmLabel")}
        destructive
        loading={removing}
        onConfirm={() => {
          if (!toRemove) return
          removeDomain(toRemove.hostname, {
            onSuccess: () => {
              setToRemove(null)
            },
          })
        }}
      />
    </Section>
  )
}
