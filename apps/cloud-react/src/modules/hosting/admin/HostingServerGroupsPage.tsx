import { useMemo, useState } from "react"

import {
  actionsColumn,
  Button,
  DataTable,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import { Layers, Pencil, Plus, Trash2 } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { ConfirmDialog, PageHeader } from "@/components/console"

import { FILL_MODE_OPTIONS, HOSTING_ADMIN_ROUTES } from "../hosting.constants"
import { useDeleteServerGroup, useHostingServerGroups, useSaveServerGroup } from "../hosting.hooks"
import type { FillMode, ServerGroup } from "../hosting.types"

/**
 * Server groups: the pool a plan allocates from.
 *
 * The fill mode is the only real decision here, and the three options express
 * genuinely different operational preferences — packing keeps backups and IP
 * blocks contiguous, spreading limits blast radius, rotation stops a new box
 * sitting idle behind an older one that is not yet full.
 */
export function HostingServerGroupsPage() {
  const navigate = useNavigate()
  const { data: groups = [], isLoading, isError, refetch } = useHostingServerGroups()
  const save = useSaveServerGroup()
  const remove = useDeleteServerGroup()

  const [editing, setEditing] = useState<ServerGroup | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<ServerGroup | null>(null)

  const columns = useMemo<ColumnDef<ServerGroup>[]>(
    () => [
      {
        id: "name",
        header: () => <span className="text-xs font-semibold uppercase tracking-wider">Group</span>,
        accessorFn: (g) => g.name,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-[14px] font-semibold">{row.original.name}</span>
            {row.original.description && (
              <span className="text-[11px] text-muted-foreground">{row.original.description}</span>
            )}
          </div>
        ),
      },
      {
        id: "fill",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">Allocation</span>
        ),
        accessorFn: (g) => g.fill_mode,
        cell: ({ row }) => (
          <span className="text-[13px]">
            {FILL_MODE_OPTIONS.find((o) => o.value === row.original.fill_mode)?.label ??
              row.original.fill_mode}
          </span>
        ),
      },
      {
        id: "capacity",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">Capacity</span>
        ),
        accessorFn: (g) => g.live_accounts,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-[13px] font-medium">
              {row.original.live_accounts}
              {row.original.capacity >= 0 ? ` / ${row.original.capacity}` : ""}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {row.original.servers} server{row.original.servers === 1 ? "" : "s"}
              {row.original.capacity < 0 ? " · no ceiling" : ""}
            </span>
          </div>
        ),
      },
      actionsColumn<ServerGroup>({
        ariaLabel: "Group actions",
        actions: () => [
          { label: "Edit", icon: Pencil, onAction: setEditing },
          { label: "Remove", icon: Trash2, destructive: true, onAction: setDeleting },
        ],
      }),
    ],
    [],
  )

  const dialogOpen = creating || Boolean(editing)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Server groups"
        description="Pools of interchangeable servers. Plans target a group, so capacity can be added without touching the catalogue."
        icon={Layers}
        breadcrumbs={[{ label: "Hosting servers", to: HOSTING_ADMIN_ROUTES.servers }]}
        renderLink={(crumb, children) => (
          <button type="button" onClick={() => void navigate(crumb.to ?? "")}>
            {children}
          </button>
        )}
        actions={
          <Button
            onClick={() => {
              setCreating(true)
            }}
          >
            <Plus className="size-4" /> Add group
          </Button>
        }
      />

      <DataTable
        data={groups}
        columns={columns}
        loading={isLoading}
        error={isError ? "Server groups could not be loaded." : undefined}
        onRetry={() => void refetch()}
        pagination={false}
        empty={
          <EmptyState
            icon={Layers}
            title="No server groups"
            description="Group your servers so plans can allocate across them."
            action={{
              label: "Add group",
              onClick: () => {
                setCreating(true)
              },
            }}
          />
        }
      />

      <GroupDialog
        open={dialogOpen}
        group={editing}
        saving={save.isPending}
        onClose={() => {
          setCreating(false)
          setEditing(null)
        }}
        onSave={(body) => {
          save.mutate(
            { id: editing?.id, body },
            {
              onSuccess: () => {
                setCreating(false)
                setEditing(null)
              },
            },
          )
        }}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title="Remove this group?"
        description="Refused while any server still belongs to it — an orphaned group would take those servers out of every plan's reach."
        confirmLabel="Remove group"
        loading={remove.isPending}
        onConfirm={() => {
          if (!deleting) return
          remove.mutate(deleting.id, {
            onSuccess: () => {
              setDeleting(null)
            },
          })
        }}
      />
    </div>
  )
}

function GroupDialog({
  open,
  group,
  saving,
  onClose,
  onSave,
}: Readonly<{
  open: boolean
  group: ServerGroup | null
  saving: boolean
  onClose: () => void
  onSave: (body: { name: string; description: string; fill_mode: FillMode }) => void
}>) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [fillMode, setFillMode] = useState<FillMode>("fill")

  // Re-seed from the row each time the dialog opens, so editing one group and
  // then another does not show the first one's values.
  const seedKey = `${open}-${group?.id ?? "new"}`
  const [seeded, setSeeded] = useState("")
  if (open && seeded !== seedKey) {
    setSeeded(seedKey)
    setName(group?.name ?? "")
    setDescription(group?.description ?? "")
    setFillMode(group?.fill_mode ?? "fill")
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{group ? "Edit server group" : "Add server group"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value)
              }}
              placeholder="in-shared-01"
            />
            <p className="text-[11px] text-muted-foreground">
              Plans reference this name, so keep it stable once plans point at it.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Allocation</Label>
            <Select
              value={fillMode}
              onValueChange={(v) => {
                setFillMode(v as FillMode)
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FILL_MODE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onSave({ name, description, fill_mode: fillMode })
            }}
            disabled={saving || !name.trim()}
          >
            {saving ? "Saving…" : "Save group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
