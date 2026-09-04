import { useMemo, useState } from "react"

import {
  actionsColumn,
  Button,
  DataTable,
  EmptyState,
  nameColumn,
  type RowAction,
} from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import { Link2, Pencil, Plus, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ConfirmDialog, Section } from "@/components/console"

import { useVPCs } from "../../vpc.hooks"
import { useDeleteVPCLink, useVPCLinks } from "../apigw.hooks"
import type { VPCLink } from "../apigw.types"
import { VpcLinkDialog } from "./VpcLinkDialog"
export function VpcLinksPanel() {
  const { t } = useTranslation()
  const { data: links = [], isLoading } = useVPCLinks()
  const { data: vpcs = [] } = useVPCs()
  const names = useMemo(() => new Map(vpcs.map((v) => [v.id, v.name])), [vpcs])
  const { mutate: remove, isPending } = useDeleteVPCLink()
  const [editing, setEditing] = useState<VPCLink | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [del, setDel] = useState<VPCLink | null>(null)
  const cols = useMemo<ColumnDef<VPCLink>[]>(
    () => [
      nameColumn({
        header: t("apiGateway.vpcLinks.columns.name"),
        accessor: (v: VPCLink) => v.name,
      }),
      {
        id: "vpc",
        header: () => t("apiGateway.vpcLinks.columns.vpc"),
        cell: ({ row }) => names.get(row.original.vpc_id) ?? row.original.vpc_id,
      },
      {
        id: "subnets",
        header: () => t("apiGateway.vpcLinks.columns.subnets"),
        cell: ({ row }) => row.original.subnet_ids.length,
      },
      {
        id: "groups",
        header: () => t("apiGateway.vpcLinks.columns.securityGroups"),
        cell: ({ row }) => row.original.security_group_ids.length,
      },
      {
        id: "status",
        header: () => t("apiGateway.vpcLinks.columns.status"),
        cell: ({ row }) => row.original.status,
      },
      actionsColumn({
        ariaLabel: t("console.table.actions"),
        actions: (): RowAction<VPCLink>[] => [
          {
            label: t("apiGateway.common.edit"),
            icon: Pencil,
            onAction: (link) => {
              setEditing(link)
              setEditorOpen(true)
            },
          },
          {
            label: t("apiGateway.actions.delete"),
            icon: Trash2,
            destructive: true,
            onAction: setDel,
          },
        ],
      }),
    ],
    [names, t],
  )
  return (
    <Section
      title={t("apiGateway.vpcLinks.title")}
      description={t("apiGateway.vpcLinks.description")}
      actions={
        <Button
          className="gap-2"
          onClick={() => {
            setEditing(null)
            setEditorOpen(true)
          }}
        >
          <Plus className="size-4" />
          {t("apiGateway.vpcLinks.create")}
        </Button>
      }
    >
      <DataTable
        data={links}
        columns={cols}
        loading={isLoading}
        getRowId={(v) => v.id}
        empty={
          <EmptyState
            icon={Link2}
            title={t("apiGateway.vpcLinks.empty.title")}
            description={t("apiGateway.vpcLinks.empty.description")}
            action={{
              label: t("apiGateway.vpcLinks.create"),
              onClick: () => {
                setEditing(null)
                setEditorOpen(true)
              },
            }}
          />
        }
      />
      <VpcLinkDialog
        link={editing}
        open={editorOpen}
        onClose={() => {
          setEditorOpen(false)
        }}
      />
      <ConfirmDialog
        open={del !== null}
        onOpenChange={(o) => {
          if (!o) setDel(null)
        }}
        title={t("apiGateway.vpcLinks.delete.title")}
        description={t("apiGateway.vpcLinks.delete.description", { name: del?.name ?? "" })}
        confirmLabel={t("apiGateway.actions.delete")}
        loading={isPending}
        onConfirm={() => {
          if (del)
            remove(del.id, {
              onSuccess: () => {
                setDel(null)
              },
            })
        }}
      />
    </Section>
  )
}
