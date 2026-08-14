import { useMemo } from "react"

import { Globe } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Section } from "@/components/console"

import { DataTable, EmptyState } from "@datadack/common-ui"

import { useDomains } from "../domains.hooks"
import type { Domain } from "../domains.types"
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
 */
export function ResourceDomainsTab({
  resourceType,
  resourceId,
}: Readonly<{ resourceType: string; resourceId: string }>) {
  // Hooks first, always — early returns (none here) come after every hook.
  const { t } = useTranslation()
  const { data, isLoading, isError, refetch } = useDomains({
    resource_type: resourceType,
    resource_id: resourceId,
    // One resource holds a handful of names at most; a single page is the
    // honest UI and spares the tab a pager it would never need.
    limit: 50,
  })
  const rows = data?.rows ?? []
  const columns = useMemo(() => buildDomainColumns(t, { forResource: true }), [t])

  return (
    <Section
      variant="panel"
      title={t("domains.resourceTab.title")}
      description={t("domains.resourceTab.description")}
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
    </Section>
  )
}
