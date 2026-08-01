import { useMemo, useState } from "react"

import { Label } from "@DataDack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import { KeySquare, Loader2, Plus, RefreshCw, Trash2, TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import {
  actionsColumn,
  ConfirmDialog,
  CopyButton,
  dateColumn,
  EmptyState,
  nameColumn,
  PageHeader,
  ResourceTable,
  statusColumn,
} from "@/components/console"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@datadack/common-ui"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useScreen } from "@/services/api/screen"

import { useAPIKeys, useCreateAPIKey, useDeleteAPIKey } from "../iam.hooks"
import type { APIKey, CreatedAPIKey } from "../iam.types"

const EXPIRY_OPTIONS = [
  { value: "never", days: null },
  { value: "30d", days: 30 },
  { value: "90d", days: 90 },
  { value: "1y", days: 365 },
] as const

export function ApiKeysListPage() {
  useScreen("iam.api-keys-list")
  const { t } = useTranslation()
  const { data: keys = [], isLoading, isError, refetch, isFetching } = useAPIKeys()
  const { mutate: deleteKey, isPending: isDeleting } = useDeleteAPIKey()

  const [createOpen, setCreateOpen] = useState(false)
  const [createdKey, setCreatedKey] = useState<CreatedAPIKey | null>(null)
  const [toDelete, setToDelete] = useState<APIKey | null>(null)

  const columns = useMemo<ColumnDef<APIKey>[]>(
    () => [
      nameColumn<APIKey>({ header: t("iam.columns.name"), accessor: (k) => k.name }),
      statusColumn<APIKey>({
        header: t("iam.columns.status"),
        accessor: (k) => (k.is_active ? "active" : "disabled"),
        pulse: (k) => k.is_active,
      }),
      {
        id: "prefix",
        header: () => t("iam.apiKeys.columns.prefix"),
        enableSorting: false,
        meta: { responsive: "md" },
        cell: ({ row }) => (
          <span className="font-mono text-[13px] text-muted-foreground">
            {row.original.key_prefix}…
          </span>
        ),
      },
      {
        id: "expires",
        header: () => t("iam.apiKeys.columns.expires"),
        enableSorting: false,
        meta: { responsive: "lg" },
        cell: ({ row }) => (
          <span className="font-mono text-[12px] text-muted-foreground">
            {row.original.expires_at
              ? new Date(row.original.expires_at).toLocaleDateString()
              : t("iam.apiKeys.never")}
          </span>
        ),
      },
      dateColumn<APIKey>({
        header: t("common.created"),
        accessor: (k) => k.created_at,
        responsive: "lg",
      }),
      actionsColumn<APIKey>({
        ariaLabel: t("console.table.actions"),
        actions: () => [
          {
            label: t("iam.actions.deleteKey"),
            icon: Trash2,
            destructive: true,
            onAction: (k: APIKey) => {
              setToDelete(k)
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
        icon={KeySquare}
        breadcrumbs={[{ label: t("console.nav.groups.iam") }, { label: t("iam.apiKeys.title") }]}
        title={t("iam.apiKeys.title")}
        description={t("iam.apiKeys.subtitle")}
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
              {t("iam.apiKeys.create")}
            </Button>
          </>
        }
      />

      <ResourceTable<APIKey>
        data={keys}
        columns={columns}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        getRowId={(key) => key.id}
        emptyState={
          <EmptyState
            icon={KeySquare}
            title={t("iam.apiKeys.empty")}
            description={t("iam.apiKeys.emptySubtitle")}
            action={{
              label: t("iam.apiKeys.create"),
              onClick: () => {
                setCreateOpen(true)
              },
            }}
          />
        }
      />

      <CreateApiKeyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={setCreatedKey}
      />

      {/* One-time secret reveal */}
      <Dialog
        open={!!createdKey}
        onOpenChange={(open) => {
          if (!open) setCreatedKey(null)
        }}
      >
        <DialogContent className="sm:max-w-lg glass-3">
          <DialogHeader>
            <DialogTitle>{t("iam.apiKeys.secretDialog.title")}</DialogTitle>
            <DialogDescription className="flex items-start gap-2">
              <TriangleAlert className="size-4 text-status-warning shrink-0 mt-0.5" />
              {t("iam.apiKeys.secretDialog.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="glass-1 px-3.5 py-3">
            <CopyButton
              value={createdKey?.secret ?? ""}
              className="text-foreground text-[13px] w-full"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                setCreatedKey(null)
              }}
            >
              {t("iam.apiKeys.secretDialog.done")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => {
          if (!open) setToDelete(null)
        }}
        title={t("iam.apiKeys.deleteConfirm.title")}
        description={t("iam.apiKeys.deleteConfirm.description", {
          name: toDelete?.name ?? "",
        })}
        confirmLabel={t("iam.actions.deleteKey")}
        loading={isDeleting}
        onConfirm={() => {
          if (!toDelete) return
          deleteKey(toDelete.id, {
            onSuccess: () => {
              setToDelete(null)
            },
          })
        }}
      />
    </div>
  )
}

function CreateApiKeyDialog({
  open,
  onOpenChange,
  onCreated,
}: Readonly<{
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (key: CreatedAPIKey) => void
}>) {
  const { t } = useTranslation()
  const { mutate: create, isPending } = useCreateAPIKey()
  const [name, setName] = useState("")
  const [expiry, setExpiry] = useState<string>("never")

  const close = (next: boolean) => {
    if (!next) {
      setName("")
      setExpiry("never")
    }
    onOpenChange(next)
  }

  const submit = () => {
    const option = EXPIRY_OPTIONS.find((o) => o.value === expiry)
    const expiresAt = option?.days ? Math.floor(Date.now() / 1000) + option.days * 86400 : null
    create(
      { name: name.trim(), expires_at: expiresAt },
      {
        onSuccess: (key) => {
          close(false)
          onCreated(key)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md glass-3">
        <DialogHeader>
          <DialogTitle>{t("iam.apiKeys.createForm.title")}</DialogTitle>
          <DialogDescription>{t("iam.apiKeys.createForm.subtitle")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              {t("iam.columns.name")}
            </Label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value)
              }}
              placeholder="ci-pipeline"
              className="font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              {t("iam.apiKeys.columns.expires")}
            </Label>
            <Select value={expiry} onValueChange={setExpiry}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPIRY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {t(`iam.apiKeys.expiry.${option.value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              close(false)
            }}
            disabled={isPending}
          >
            {t("console.confirm.cancel")}
          </Button>
          <Button
            type="button"
            disabled={name.trim().length < 2 || isPending}
            className="gap-2"
            onClick={submit}
          >
            {isPending && <Loader2 className="size-3.5 animate-spin" />}
            {t("iam.apiKeys.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
