import { useMemo, useState } from "react"

import {
  actionsColumn,
  Badge,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import { List, Plus, RefreshCw, Search, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { ConfirmDialog, PageHeader } from "@/components/console"

import { useCreateIPSet, useDeleteIPSet, useIPSets } from "../vpc.hooks"
import type { IpSet, IpSetIpVersion } from "../vpc.types"

export function IPSetsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: sets = [], isLoading, isFetching, refetch } = useIPSets()
  const { mutate: createSet, isPending: isCreating } = useCreateIPSet()
  const { mutate: deleteSet, isPending: isDeleting } = useDeleteIPSet()

  const [query, setQuery] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [toDelete, setToDelete] = useState<IpSet | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [ipVersion, setIpVersion] = useState<IpSetIpVersion>("ipv4")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sets
    return sets.filter(
      (s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q),
    )
  }, [sets, query])

  const columns = useMemo<ColumnDef<IpSet>[]>(
    () => [
      nameColumn<IpSet>({ header: t("ipSets.columns.name"), accessor: (s) => s.name }),
      {
        id: "ipVersion",
        accessorFn: (s: IpSet) => s.ip_version,
        header: () => t("ipSets.columns.ipVersion"),
        meta: { responsive: "md" },
        cell: ({ row }) => (
          <Badge variant="outline" className="font-mono text-[11px]">
            {row.original.ip_version}
          </Badge>
        ),
      },
      {
        id: "entries",
        accessorFn: (s: IpSet) => s.entry_count ?? 0,
        header: () => t("ipSets.columns.entries"),
        // An empty set is not a neutral state — a rule pointing at it matches
        // nothing — so it reads as muted rather than as a plain zero.
        cell: ({ row }) => (
          <span
            className={
              (row.original.entry_count ?? 0) === 0
                ? "font-mono text-[13px] text-muted-foreground"
                : "font-mono text-[13px]"
            }
          >
            {row.original.entry_count ?? 0}
          </span>
        ),
      },
      {
        id: "description",
        accessorFn: (s: IpSet) => s.description,
        header: () => t("ipSets.columns.description"),
        meta: { responsive: "lg" },
        cell: ({ row }) => (
          <span className="text-[13px] text-muted-foreground">{row.original.description}</span>
        ),
      },
      dateColumn<IpSet>({
        header: t("common.created"),
        accessor: (s) => s.created_at,
        responsive: "lg",
      }),
      actionsColumn<IpSet>({
        ariaLabel: t("console.table.actions"),
        actions: () => [
          {
            label: t("ipSets.actions.delete", { defaultValue: t("natGateways.actions.delete") }),
            icon: Trash2,
            destructive: true,
            onAction: (row) => {
              setToDelete(row)
            },
          },
        ],
      }),
    ],
    [t],
  )

  return (
    <div className="space-y-5">
      <PageHeader
        icon={List}
        breadcrumbs={[{ label: t("console.nav.groups.networking") }, { label: t("ipSets.title") }]}
        title={t("ipSets.title")}
        description={t("ipSets.subtitle")}
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
              className="gap-2"
              onClick={() => {
                setCreateOpen(true)
              }}
            >
              <Plus className="w-4 h-4" />
              {t("ipSets.create")}
            </Button>
          </>
        }
      />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
          }}
          placeholder={t("ipSets.searchPlaceholder")}
          className="pl-9"
          aria-label={t("ipSets.searchPlaceholder")}
        />
      </div>

      {!isLoading && sets.length === 0 ? (
        <EmptyState
          icon={List}
          title={t("ipSets.empty")}
          description={t("ipSets.emptySubtitle")}
          action={{
            label: t("ipSets.create"),
            onClick: () => {
              setCreateOpen(true)
            },
          }}
        />
      ) : (
        <DataTable<IpSet>
          data={filtered}
          columns={columns}
          loading={isLoading}
          onRowClick={(row) => {
            void navigate(`/networking/ip-sets/${row.id}`)
          }}
        />
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("ipSets.create")}</DialogTitle>
            <DialogDescription>{t("ipSets.subtitle")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ipset-name">{t("ipSets.form.name")}</Label>
              <Input
                id="ipset-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ipset-description">{t("ipSets.form.description")}</Label>
              <Input
                id="ipset-description"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value)
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ipset-version">{t("ipSets.form.ipVersion")}</Label>
              <Select
                value={ipVersion}
                onValueChange={(v) => {
                  setIpVersion(v as IpSetIpVersion)
                }}
              >
                <SelectTrigger id="ipset-version">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ipv4">IPv4</SelectItem>
                  <SelectItem value="ipv6">IPv6</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[12px] text-muted-foreground">{t("ipSets.form.ipVersionHint")}</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateOpen(false)
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              disabled={isCreating || name.trim().length < 2}
              onClick={() => {
                createSet(
                  { name: name.trim(), description: description.trim(), ip_version: ipVersion },
                  {
                    onSuccess: () => {
                      setCreateOpen(false)
                      setName("")
                      setDescription("")
                      setIpVersion("ipv4")
                    },
                  },
                )
              }}
            >
              {t("ipSets.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => {
          if (!open) setToDelete(null)
        }}
        title={t("ipSets.deleteConfirm.title")}
        description={t("ipSets.deleteConfirm.body")}
        confirmLabel={t("common.delete")}
        destructive
        loading={isDeleting}
        onConfirm={() => {
          if (!toDelete) return
          deleteSet(toDelete.id, { onSuccess: () => { setToDelete(null) } })
        }}
      />
    </div>
  )
}
