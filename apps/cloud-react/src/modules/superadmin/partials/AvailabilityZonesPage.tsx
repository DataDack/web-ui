import { useMemo, useState } from "react"

import type { ColumnDef } from "@tanstack/react-table"
import { MapPin, Pencil, Plus, RefreshCw } from "lucide-react"
import { useTranslation } from "react-i18next"

import {
  actionsColumn,
  EmptyState,
  nameColumn,
  PageHeader,
  ResourceTable,
  statusColumn,
  textColumn,
} from "@/components/console"
import { Button } from "@datadack/common-ui"
import { useScreen } from "@/services/api/screen"

import { ActiveBadge } from "../components/ActiveBadge"
import { useAdminAvailabilityZones } from "../superadmin.hooks"
import type { AvailabilityZone } from "../superadmin.types"
import { AvailabilityZoneFormSheet } from "./AvailabilityZoneFormSheet"

export function AvailabilityZonesPage() {
  useScreen("superadmin.availability-zones")
  const { t } = useTranslation()
  const { data: azs = [], isLoading, isError, refetch, isFetching } = useAdminAvailabilityZones()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AvailabilityZone | null>(null)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (az: AvailabilityZone) => {
    setEditing(az)
    setFormOpen(true)
  }

  const columns = useMemo<ColumnDef<AvailabilityZone>[]>(
    () => [
      nameColumn<AvailabilityZone>({
        header: t("superAdmin.availabilityZones.fields.code"),
        accessor: (a) => a.code,
      }),
      textColumn<AvailabilityZone>({
        id: "name",
        header: t("superAdmin.availabilityZones.fields.name"),
        accessor: (a) => a.name,
      }),
      textColumn<AvailabilityZone>({
        id: "region",
        header: t("superAdmin.availabilityZones.fields.region"),
        accessor: (a) => `${a.region_name} (${a.region_code})`,
        muted: true,
        responsive: "md",
      }),
      statusColumn<AvailabilityZone>({
        header: t("superAdmin.availabilityZones.fields.available"),
        accessor: (a) => (a.is_available ? "available" : "unavailable"),
        responsive: "md",
      }),
      {
        id: "is_active",
        header: () => t("superAdmin.fields.active"),
        enableSorting: false,
        cell: ({ row }) => <ActiveBadge active={row.original.is_active} />,
      },
      actionsColumn<AvailabilityZone>({
        ariaLabel: t("console.table.actions"),
        actions: () => [{ label: t("superAdmin.actions.edit"), icon: Pencil, onAction: openEdit }],
      }),
    ],
    [t],
  )

  return (
    <div className="space-y-5">
      <PageHeader
        icon={MapPin}
        breadcrumbs={[
          { label: t("superAdmin.title") },
          { label: t("superAdmin.availabilityZones.title") },
        ]}
        title={t("superAdmin.availabilityZones.title")}
        description={t("superAdmin.availabilityZones.formSubtitle")}
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
            <Button className="gap-2" onClick={openCreate}>
              <Plus className="w-4 h-4" />
              {t("superAdmin.availabilityZones.add")}
            </Button>
          </>
        }
      />

      <ResourceTable<AvailabilityZone>
        data={azs}
        columns={columns}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        getRowId={(a) => a.id}
        onRowClick={openEdit}
        emptyState={
          <EmptyState
            icon={MapPin}
            title={t("superAdmin.availabilityZones.empty")}
            description={t("superAdmin.availabilityZones.emptySubtitle")}
            action={{
              label: t("superAdmin.availabilityZones.add"),
              onClick: openCreate,
            }}
          />
        }
      />

      <AvailabilityZoneFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        availabilityZone={editing}
      />
    </div>
  )
}
