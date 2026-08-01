import { useMemo, useState } from "react"

import { Badge } from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import { GitBranch, Plus, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import {
  actionsColumn,
  ConfirmDialog,
  copyColumn,
  dateColumn,
  EmptyState,
  nameColumn,
  ResourceTable,
  textColumn,
} from "@/components/console"
import { Button } from "@datadack/common-ui"
import { useAvailabilityZoneMap } from "@/modules/catalog/catalog.hooks"

import { AddSubnetSheet } from "./AddSubnetSheet"
import { useDeleteSubnet, useVPCSubnets } from "../../vpc.hooks"
import type { Subnet, VPCNetwork } from "../../vpc.types"

function VisibilityChip({ isPublic }: Readonly<{ isPublic: boolean }>) {
  const { t } = useTranslation()
  return (
    <Badge
      variant="outline"
      className={
        isPublic
          ? "font-mono text-[11px] text-status-info bg-status-info-bg border-status-info/25"
          : "font-mono text-[11px] text-status-neutral bg-status-neutral-bg border-status-neutral/25"
      }
    >
      {isPublic ? t("vpc.badges.public") : t("vpc.badges.private")}
    </Badge>
  )
}

export function SubnetsTab({ network }: Readonly<{ network: VPCNetwork }>) {
  const { t } = useTranslation()
  const { data: subnets = [], isLoading, isError, refetch } = useVPCSubnets(network.id)
  const { mutate: deleteSubnet, isPending: isDeleting } = useDeleteSubnet()
  const azMap = useAvailabilityZoneMap()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [toDelete, setToDelete] = useState<Subnet | null>(null)

  const columns = useMemo<ColumnDef<Subnet>[]>(
    () => [
      nameColumn<Subnet>({ header: t("vpc.columns.name"), accessor: (s) => s.name }),
      copyColumn<Subnet>({
        id: "cidr",
        header: t("vpc.columns.cidr"),
        accessor: (s) => s.cidr,
      }),
      textColumn<Subnet>({
        id: "zone",
        header: t("vpc.columns.zone"),
        accessor: (s) =>
          s.availability_zone_id ? azMap.get(s.availability_zone_id)?.name : undefined,
        muted: true,
        responsive: "md",
      }),
      {
        id: "visibility",
        accessorFn: (s: Subnet) => (s.is_public ? 1 : 0),
        header: () => t("vpc.columns.visibility"),
        cell: ({ row }) => <VisibilityChip isPublic={row.original.is_public} />,
      },
      dateColumn<Subnet>({
        header: t("common.created"),
        accessor: (s) => s.created_at,
        responsive: "xl",
      }),
      actionsColumn<Subnet>({
        ariaLabel: t("console.table.actions"),
        actions: () => [
          {
            label: t("vpc.actions.delete"),
            icon: Trash2,
            destructive: true,
            onAction: (s: Subnet) => {
              setToDelete(s)
            },
          },
        ],
      }),
    ],
    [t, azMap],
  )

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => {
            setSheetOpen(true)
          }}
        >
          <Plus className="size-3.5" />
          {t("vpc.subnetForm.add")}
        </Button>
      </div>

      <ResourceTable<Subnet>
        data={subnets}
        columns={columns}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        getRowId={(subnet) => subnet.id}
        emptyState={
          <EmptyState
            icon={GitBranch}
            title={t("vpc.detail.noSubnets")}
            description={t("vpc.detail.noSubnetsDescription")}
            action={{
              label: t("vpc.subnetForm.add"),
              onClick: () => {
                setSheetOpen(true)
              },
            }}
          />
        }
      />

      <AddSubnetSheet network={network} open={sheetOpen} onOpenChange={setSheetOpen} />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null)
        }}
        title={t("vpc.subnetDeleteConfirm.title")}
        description={t("vpc.subnetDeleteConfirm.description", {
          name: toDelete?.name ?? "",
        })}
        confirmLabel={t("vpc.actions.delete")}
        loading={isDeleting}
        onConfirm={() => {
          if (toDelete) {
            deleteSubnet(toDelete.id, {
              onSuccess: () => {
                setToDelete(null)
              },
            })
          }
        }}
      />
    </div>
  )
}
