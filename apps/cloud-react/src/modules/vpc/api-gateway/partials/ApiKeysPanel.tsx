import { useMemo, useState } from "react"

import {
  actionsColumn,
  Button,
  CopyButton,
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
  Switch,
  type RowAction,
} from "@datadack/common-ui"
import { zodResolver } from "@hookform/resolvers/zod"
import type { ColumnDef } from "@tanstack/react-table"
import { Eye, KeyRound, Plus, Trash2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod/v4"

import { ConfirmDialog, Section } from "@/components/console"

import {
  useAPIKeys,
  useCreateAPIKey,
  useDeleteAPIKey,
  useRevealAPIKey,
  useUpdateAPIKey,
} from "../apigw.hooks"
import type { APIKey, CreatedAPIKey } from "../apigw.types"
const schema = z.object({
  name: z.string().min(1, "Required"),
  description: z.string(),
  value: z.string(),
  customer_id: z.string(),
  enabled: z.boolean(),
})
type Values = z.infer<typeof schema>
const LABEL = "text-xs font-semibold tracking-wide uppercase text-muted-foreground"
export function ApiKeysPanel() {
  const { t } = useTranslation()
  const { data: keys = [], isLoading, isError, refetch } = useAPIKeys()
  const { mutate: update } = useUpdateAPIKey()
  const { mutate: remove, isPending: deleting } = useDeleteAPIKey()
  const { mutate: reveal, isPending: revealing } = useRevealAPIKey()
  const [createOpen, setCreateOpen] = useState(false)
  const [secret, setSecret] = useState<{ name: string; value: string } | null>(null)
  const [toDelete, setToDelete] = useState<APIKey | null>(null)
  const columns = useMemo<ColumnDef<APIKey>[]>(
    () => [
      nameColumn({ header: t("apiGateway.apiKeys.columns.name"), accessor: (k: APIKey) => k.name }),
      {
        id: "value",
        header: () => t("apiGateway.apiKeys.columns.value"),
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.masked_value}</span>,
      },
      {
        id: "enabled",
        header: () => t("apiGateway.apiKeys.columns.enabled"),
        cell: ({ row }) => (
          <Switch
            aria-label={t("apiGateway.apiKeys.toggle", { name: row.original.name })}
            checked={row.original.enabled}
            onCheckedChange={(enabled) => {
              update({ id: row.original.id, payload: { enabled } })
            }}
          />
        ),
      },
      {
        id: "customer",
        header: () => t("apiGateway.apiKeys.columns.customer"),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.customer_id || "—"}</span>
        ),
      },
      dateColumn({
        header: t("common.created"),
        accessor: (k: APIKey) => k.created_at,
        responsive: "lg",
      }),
      actionsColumn({
        ariaLabel: t("console.table.actions"),
        actions: (k: APIKey): RowAction<APIKey>[] => [
          {
            label: t("apiGateway.apiKeys.reveal"),
            icon: Eye,
            onAction: () => {
              reveal(k.id, {
                onSuccess: (v) => {
                  setSecret({ name: k.name, value: v.value })
                },
              })
            },
          },
          {
            label: t("apiGateway.actions.delete"),
            icon: Trash2,
            destructive: true,
            onAction: setToDelete,
          },
        ],
      }),
    ],
    [t, update, reveal],
  )
  return (
    <Section
      title={t("apiGateway.apiKeys.title")}
      description={t("apiGateway.apiKeys.description")}
      actions={
        <Button
          className="gap-2"
          onClick={() => {
            setCreateOpen(true)
          }}
        >
          <Plus className="size-4" />
          {t("apiGateway.apiKeys.create")}
        </Button>
      }
    >
      <DataTable
        data={keys}
        columns={columns}
        loading={isLoading}
        error={isError ? t("console.table.error") : undefined}
        onRetry={() => void refetch()}
        retryLabel={t("console.table.retry")}
        empty={
          <EmptyState
            icon={KeyRound}
            title={t("apiGateway.apiKeys.empty.title")}
            description={t("apiGateway.apiKeys.empty.description")}
            action={{
              label: t("apiGateway.apiKeys.create"),
              onClick: () => {
                setCreateOpen(true)
              },
            }}
          />
        }
        getRowId={(k) => k.id}
      />
      <CreateKey
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(k) => {
          setSecret({ name: k.name, value: k.value })
        }}
      />
      <Secret
        open={secret !== null}
        secret={secret}
        pending={revealing}
        onClose={() => {
          setSecret(null)
        }}
      />
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(o) => {
          if (!o) setToDelete(null)
        }}
        title={t("apiGateway.apiKeys.delete.title")}
        description={t("apiGateway.apiKeys.delete.description", { name: toDelete?.name ?? "" })}
        confirmLabel={t("apiGateway.actions.delete")}
        loading={deleting}
        onConfirm={() => {
          if (toDelete)
            remove(toDelete.id, {
              onSuccess: () => {
                setToDelete(null)
              },
            })
        }}
      />
    </Section>
  )
}
function CreateKey({
  open,
  onOpenChange,
  onCreated,
}: Readonly<{
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated: (v: CreatedAPIKey) => void
}>) {
  const { t } = useTranslation()
  const { mutate: create, isPending } = useCreateAPIKey()
  const f = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "", value: "", customer_id: "", enabled: true },
  })
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-3">
        <DialogHeader>
          <DialogTitle>{t("apiGateway.apiKeys.createTitle")}</DialogTitle>
          <DialogDescription>{t("apiGateway.apiKeys.createDescription")}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) =>
            void f.handleSubmit((v) => {
              create(
                { ...v, value: v.value || undefined, customer_id: v.customer_id || undefined },
                {
                  onSuccess: (key) => {
                    onOpenChange(false)
                    f.reset()
                    onCreated(key)
                  },
                },
              )
            })(e)
          }
        >
          {(["name", "description", "customer_id", "value"] as const).map((name) => (
            <div className="space-y-1.5" key={name}>
              <Label className={LABEL}>{t(`apiGateway.apiKeys.fields.${name}`)}</Label>
              <Input
                type={name === "value" ? "password" : "text"}
                {...f.register(name)}
                placeholder={name === "value" ? t("apiGateway.apiKeys.generateHint") : undefined}
              />
              <FieldError message={f.formState.errors[name]?.message} />
            </div>
          ))}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                onOpenChange(false)
              }}
            >
              {t("console.wizard.cancel")}
            </Button>
            <Button variant="gold" loading={isPending}>
              {t("apiGateway.apiKeys.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
function Secret({
  open,
  secret,
  pending,
  onClose,
}: Readonly<{
  open: boolean
  secret: { name: string; value: string } | null
  pending: boolean
  onClose: () => void
}>) {
  const { t } = useTranslation()
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <DialogContent className="glass-3">
        <DialogHeader>
          <DialogTitle>
            {t("apiGateway.apiKeys.secretTitle", { name: secret?.name ?? "" })}
          </DialogTitle>
          <DialogDescription>{t("apiGateway.apiKeys.secretOnce")}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-between rounded-md bg-muted/40 p-3 font-mono text-sm">
          <span className="break-all">
            {pending ? t("apiGateway.apiKeys.revealing") : secret?.value}
          </span>
          {secret && <CopyButton value={secret.value} />}
        </div>
        <DialogFooter>
          <Button onClick={onClose}>{t("apiGateway.apiKeys.done")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
function FieldError({ message }: Readonly<{ message?: string }>) {
  return message ? <p className="text-[11px] text-destructive">{message}</p> : null
}
