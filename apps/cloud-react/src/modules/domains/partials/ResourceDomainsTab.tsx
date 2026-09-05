import { useMemo, useState } from "react"

import { actionsColumn, Button, DataTable, EmptyState, type RowAction } from "@datadack/common-ui"
import { Eye, GitFork, Globe, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ConfirmDialog, Section } from "@/components/console"

import { useDomains, useRemoveDomain, useVerifyDomain } from "../domains.hooks"
import type { Domain } from "../domains.types"
import { AddDomainDialog } from "./AddDomainDialog"
import { buildDomainColumns } from "./domain-columns"
import { DomainRedirectDialog } from "./DomainRedirectDialog"

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
  // The row whose redirect is being edited. Held as the row, like toRemove: the
  // dialog reads its current redirect, and an id would go stale the moment a
  // refetch replaced the array.
  const [redirecting, setRedirecting] = useState<Domain | null>(null)

  const rows = data?.rows ?? []
  // The platform zone this resource's names live in, read off its own primary
  // row rather than from configuration: the row IS the answer, and a second
  // copy of the zone in the console is a second thing to get wrong when a
  // resource sits in a zone the current setting no longer names. Empty until
  // the resource has an address at all, which is what makes the dialog offer
  // the internal option as unavailable instead of as a claim the server would
  // refuse with a 422.
  const zone = rows.find((domain) => domain.managed && domain.is_primary)?.zone ?? ""
  const columns = useMemo(
    () => [
      ...buildDomainColumns(t, { forResource: true }),
      actionsColumn<Domain>({
        ariaLabel: t("console.table.actions"),
        actions: (domain) => {
          // A product that owns an editable primary address also owns its edit
          // experience. Managed apps combine address and traffic behavior in
          // one dialog, so a second Configure action would create two competing
          // settings screens for the same hostname.
          if (domain.managed && domain.is_primary) {
            const primaryActions: RowAction<Domain>[] = []
            if (onEditManaged) {
              primaryActions.push({
                label: t("domains.actions.editAddress"),
                icon: Pencil,
                onAction: onEditManaged,
              })
            } else if (domain.status === "active") {
              primaryActions.push({
                label: t("domains.actions.configure"),
                icon: GitFork,
                onAction: (row) => {
                  setRedirecting(row)
                },
              })
            }
            return primaryActions
          }
          // An ADDITIONAL internal name is managed too, and it is the tenant's
          // to remove: they claimed it by hand beside the address, and the
          // registry's DELETE accepts it for exactly that reason. It never has
          // records to view and never needs verifying — the platform owns its
          // zone — so those two actions are not offered.
          if (domain.managed) {
            const managedActions: RowAction<Domain>[] = []
            if (domain.status === "active") {
              managedActions.push({
                label: t("domains.actions.configure"),
                icon: GitFork,
                onAction: (row) => {
                  setRedirecting(row)
                },
              })
            }
            managedActions.push({
              label: t("domains.actions.remove"),
              icon: Trash2,
              destructive: true,
              onAction: (row) => {
                setToRemove(row)
              },
            })
            return managedActions
          }
          const actions: RowAction<Domain>[] = []
          // Offered on a verified row only, which is the same gate the server
          // applies: an unverified hostname has not proven it is the tenant's to
          // answer for, and letting it redirect would publish one on any name
          // whose DNS happened to point here.
          if (domain.status === "active") {
            actions.push({
              label: t("domains.actions.configure"),
              icon: GitFork,
              onAction: (row) => {
                setRedirecting(row)
              },
            })
          }
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
        zone={zone}
      />

      <DomainRedirectDialog
        open={redirecting !== null}
        onOpenChange={(open) => {
          if (!open) setRedirecting(null)
        }}
        domain={redirecting}
      />

      <ConfirmDialog
        open={toRemove !== null}
        onOpenChange={(open) => {
          if (!open) setToRemove(null)
        }}
        title={t("domains.actions.removeConfirmTitle", { hostname: toRemove?.hostname ?? "" })}
        // Two different consequences, so two sentences. Telling somebody
        // removing an internal name to go and clean up DNS records at their
        // registrar sends them looking for records that were never theirs.
        description={t(
          toRemove?.managed
            ? "domains.actions.removeInternalConfirmBody"
            : "domains.actions.removeConfirmBody",
        )}
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
