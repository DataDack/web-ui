import { useMemo, useState } from "react"

import type { ColumnDef } from "@tanstack/react-table"
import { Check, Plus, Share2, Trash2, X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ConfirmDialog, PageHeader } from "@/components/console"

import {
  actionsColumn,
  Button,
  DataTable,
  dateColumn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Label,
  nameColumn,
  type RowAction,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  statusColumn,
} from "@datadack/common-ui"

import {
  useAcceptPeering,
  useCreatePeering,
  useDeletePeering,
  usePeerings,
  useRejectPeering,
  useVPCs,
} from "../vpc.hooks"
import type { VpcPeering } from "../vpc.types"

const FIELD_LABEL_CLASS = "text-xs font-semibold tracking-wide uppercase text-muted-foreground"

/* ── Request dialog ────────────────────────────────────────────────────── */

function RequestPeeringDialog({
  open,
  onOpenChange,
}: Readonly<{ open: boolean; onOpenChange: (open: boolean) => void }>) {
  const { t } = useTranslation()
  const { data: vpcs = [] } = useVPCs()
  const { mutate: create, isPending } = useCreatePeering()

  const [name, setName] = useState("")
  const [requesterVpcId, setRequester] = useState("")
  const [accepterVpcId, setAccepter] = useState("")

  // A VPC cannot be peered with itself, so the second list never offers the
  // first choice. The backend refuses it too — this just avoids offering a
  // selection that can only fail.
  const accepterOptions = useMemo(
    () => vpcs.filter((v) => v.id !== requesterVpcId),
    [vpcs, requesterVpcId],
  )

  const reset = () => {
    setName("")
    setRequester("")
    setAccepter("")
  }

  const submit = () => {
    create(
      { name, requesterVpcId, accepterVpcId },
      {
        onSuccess: () => {
          reset()
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("peerings.create.title")}</DialogTitle>
          <DialogDescription>
            {t("peerings.create.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className={FIELD_LABEL_CLASS}>{t("peerings.name")}</Label>
            <Input value={name} onChange={(e) => { setName(e.target.value); }} />
          </div>

          <div className="space-y-1.5">
            <Label className={FIELD_LABEL_CLASS}>
              {t("peerings.fields.requester")}
            </Label>
            <Select value={requesterVpcId} onValueChange={setRequester}>
              <SelectTrigger>
                <SelectValue placeholder={t("peerings.selectPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {vpcs.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name} ({v.cidr})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className={FIELD_LABEL_CLASS}>
              {t("peerings.fields.accepter")}
            </Label>
            <Select value={accepterVpcId} onValueChange={setAccepter} disabled={!requesterVpcId}>
              <SelectTrigger>
                <SelectValue placeholder={t("peerings.selectPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {accepterOptions.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name} ({v.cidr})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); }}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={submit}
            disabled={isPending || !name || !requesterVpcId || !accepterVpcId}
          >
            {t("peerings.create.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ── Page ──────────────────────────────────────────────────────────────── */

export function VpcPeeringsPage() {
  const { t } = useTranslation()
  const { data: peerings = [], isLoading } = usePeerings()
  const { data: vpcs = [] } = useVPCs()

  const [createOpen, setCreateOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<VpcPeering | null>(null)

  const { mutate: accept } = useAcceptPeering()
  const { mutate: reject } = useRejectPeering()
  const { mutate: remove } = useDeletePeering()

  const vpcName = useMemo(() => {
    const byId = new Map(vpcs.map((v) => [v.id, `${v.name} (${v.cidr})`]))
    return (id: string) => byId.get(id) ?? id
  }, [vpcs])

  const columns = useMemo<ColumnDef<VpcPeering>[]>(
    () => [
      nameColumn<VpcPeering>({
        header: t("peerings.name"),
        accessor: (p) => p.name,
      }),
      {
        id: "requester",
        header: t("peerings.fields.requester"),
        cell: ({ row }) => vpcName(row.original.requester_vpc_id),
      },
      {
        id: "accepter",
        header: t("peerings.fields.accepter"),
        cell: ({ row }) => vpcName(row.original.accepter_vpc_id),
      },
      statusColumn<VpcPeering>({
        header: t("peerings.columns.status"),
        accessor: (p) => p.status,
        // An accepted peering reconciles both VPCs before it is really live.
        pulse: (p) => p.status === "deleting",
      }),
      dateColumn<VpcPeering>({
        header: t("common.created"),
        accessor: (p) => p.created_at,
        responsive: "lg",
      }),
      actionsColumn<VpcPeering>({
        ariaLabel: t("console.table.actions"),
        actions: (p) => {
          // Accept and reject exist only while the request is open. Offering
          // them on an active peering would offer an action the API refuses.
          const handshake: RowAction<VpcPeering>[] =
            p.status === "pending_acceptance"
              ? [
                  {
                    label: t("peerings.actions.accept"),
                    icon: Check,
                    onAction: (row) => {
                      accept(row.id)
                    },
                  },
                  {
                    label: t("peerings.actions.reject"),
                    icon: X,
                    onAction: (row) => {
                      reject(row.id)
                    },
                  },
                ]
              : []
          return [
            ...handshake,
            {
              label: t("peerings.delete.action"),
              icon: Trash2,
              destructive: true,
              onAction: (row: VpcPeering) => {
                setPendingDelete(row)
              },
            },
          ]
        },
      }),
    ],
    [t, vpcName, accept, reject],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("peerings.title")}
        description={t("peerings.description")}
        actions={
          <Button onClick={() => { setCreateOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            {t("peerings.create.action")}
          </Button>
        }
      />

      {!isLoading && peerings.length === 0 ? (
        <EmptyState
          icon={Share2}
          title={t("peerings.empty.title")}
          description={t("peerings.empty.description")}
          action={{
            label: t("peerings.create.action"),
            onClick: () => {
              setCreateOpen(true)
            },
          }}
        />
      ) : (
        <DataTable columns={columns} data={peerings} loading={isLoading} />
      )}

      <RequestPeeringDialog open={createOpen} onOpenChange={setCreateOpen} />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
        title={t("peerings.delete.title")}
        description={t("peerings.delete.description")}
        confirmLabel={t("peerings.delete.action")}
        destructive
        onConfirm={() => {
          if (pendingDelete) remove(pendingDelete.id)
          setPendingDelete(null)
        }}
      />
    </div>
  )
}
