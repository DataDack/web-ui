import { useEffect, useMemo, useState } from "react"

import {
  actionsColumn,
  Badge,
  Button,
  DataTable,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type RowAction,
} from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import { Globe2, ListTree, Pencil, Plus, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ConfirmDialog, Section } from "@/components/console"

import {
  useAPIs,
  useCreateDomainMapping,
  useDeleteDomain,
  useDeleteDomainMapping,
  useDomainMappings,
  useDomains,
  useUpdateDomainMapping,
} from "../apigw.hooks"
import type { APIMapping, DomainName } from "../apigw.types"
import { DomainDialog } from "./DomainDialog"
export function CustomDomainsPanel() {
  const { t } = useTranslation()
  const { data: domains = [], isLoading } = useDomains()
  const { mutate: remove, isPending } = useDeleteDomain()
  const [editing, setEditing] = useState<DomainName | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [manage, setManage] = useState<DomainName | null>(null)
  const [del, setDel] = useState<DomainName | null>(null)
  const cols = useMemo<ColumnDef<DomainName>[]>(
    () => [
      {
        id: "domain",
        header: () => t("apiGateway.domains.columns.domain"),
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.domain_name}</span>,
      },
      {
        id: "endpoint",
        header: () => t("apiGateway.domains.columns.endpoint"),
        cell: ({ row }) => row.original.endpoint_type,
      },
      {
        id: "tls",
        header: () => t("apiGateway.domains.columns.tls"),
        cell: ({ row }) => row.original.security_policy.replaceAll("_", "."),
      },
      {
        id: "status",
        header: () => t("apiGateway.domains.columns.status"),
        cell: ({ row }) => <Badge variant="outline">{row.original.status}</Badge>,
      },
      {
        id: "mappings",
        header: () => t("apiGateway.domains.columns.mappings"),
        cell: ({ row }) => row.original.mappings?.length ?? 0,
      },
      actionsColumn({
        ariaLabel: t("console.table.actions"),
        actions: (): RowAction<DomainName>[] => [
          { label: t("apiGateway.domains.manageMappings"), icon: ListTree, onAction: setManage },
          {
            label: t("apiGateway.common.edit"),
            icon: Pencil,
            onAction: (domain) => {
              setEditing(domain)
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
    [t],
  )
  return (
    <Section
      title={t("apiGateway.domains.title")}
      description={t("apiGateway.domains.description")}
      actions={
        <Button
          className="gap-2"
          onClick={() => {
            setEditing(null)
            setEditorOpen(true)
          }}
        >
          <Plus className="size-4" />
          {t("apiGateway.domains.create")}
        </Button>
      }
    >
      <DataTable
        data={domains}
        columns={cols}
        loading={isLoading}
        getRowId={(d) => d.id}
        empty={
          <EmptyState
            icon={Globe2}
            title={t("apiGateway.domains.empty.title")}
            description={t("apiGateway.domains.empty.description")}
            action={{
              label: t("apiGateway.domains.create"),
              onClick: () => {
                setEditing(null)
                setEditorOpen(true)
              },
            }}
          />
        }
      />
      <DomainDialog
        domain={editing}
        open={editorOpen}
        onClose={() => {
          setEditorOpen(false)
        }}
      />
      <Mappings
        domain={manage}
        onClose={() => {
          setManage(null)
        }}
      />
      <ConfirmDialog
        open={del !== null}
        onOpenChange={(o) => {
          if (!o) setDel(null)
        }}
        title={t("apiGateway.domains.delete.title")}
        description={t("apiGateway.domains.delete.description", { name: del?.domain_name ?? "" })}
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
function Mappings({
  domain,
  onClose,
}: Readonly<{ domain: DomainName | null; onClose: () => void }>) {
  const { t } = useTranslation()
  const { data: mappings = [] } = useDomainMappings(domain?.id ?? "")
  const { data: apis = [] } = useAPIs()
  const { mutate: create, isPending } = useCreateDomainMapping()
  const { mutate: remove } = useDeleteDomainMapping()
  const update = useUpdateDomainMapping()
  const [editing, setEditing] = useState<APIMapping | null>(null)
  const [apiId, setApi] = useState("")
  const [stage, setStage] = useState("")
  const [path, setPath] = useState("")
  const api = apis.find((a) => a.id === apiId)
  useEffect(() => {
    if (!editing) return
    setApi(editing.api_id)
    setStage(editing.stage_id)
    setPath(editing.mapping_key)
  }, [editing])
  return (
    <Dialog
      open={domain !== null}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <DialogContent className="glass-3 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {t("apiGateway.domains.mappingsTitle", { name: domain?.domain_name ?? "" })}
          </DialogTitle>
          <DialogDescription>{t("apiGateway.domains.mappingsDescription")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {mappings.map((m) => (
            <div className="flex items-center gap-3 rounded-md border p-3" key={m.id}>
              <span className="font-mono text-xs">{m.mapping_key || "/"}</span>
              {!m.mapping_key && (
                <span className="text-xs text-muted-foreground">
                  {t("apiGateway.domains.root")}
                </span>
              )}
              <span className="ml-auto text-sm">
                {apis.find((a) => a.id === m.api_id)?.name ?? m.api_id}
              </span>
              <Button
                size="icon"
                variant="ghost"
                aria-label={t("apiGateway.domains.editMapping")}
                onClick={() => {
                  setEditing(m)
                }}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label={t("apiGateway.domains.deleteMapping")}
                onClick={() => {
                  if (domain) remove({ domainId: domain.id, mappingId: m.id })
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <div className="grid gap-3 sm:grid-cols-3">
            <Select
              value={apiId}
              onValueChange={(v) => {
                setApi(v)
                setStage("")
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("apiGateway.domains.apiPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {apis.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger>
                <SelectValue placeholder={t("apiGateway.domains.stagePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {api?.stages?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name === "$default" ? t("apiGateway.defaultStage") : s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={path}
              onChange={(e) => {
                setPath(e.target.value)
              }}
              placeholder={t("apiGateway.domains.pathPlaceholder")}
            />
          </div>
          <Button
            disabled={!domain || !apiId || !stage}
            loading={isPending || update.isPending}
            onClick={() => {
              if (!domain) return
              const variables = {
                domainId: domain.id,
                payload: { api_id: apiId, stage_id: stage, mapping_key: path },
              }
              const onSuccess = () => {
                setApi("")
                setStage("")
                setPath("")
                setEditing(null)
              }
              if (editing) update.mutate({ ...variables, mappingId: editing.id }, { onSuccess })
              else create(variables, { onSuccess })
            }}
          >
            {editing ? t("apiGateway.domains.saveMapping") : t("apiGateway.domains.addMapping")}
          </Button>
          {editing && (
            <Button
              variant="ghost"
              onClick={() => {
                setEditing(null)
                setApi("")
                setStage("")
                setPath("")
              }}
            >
              {t("apiGateway.common.cancel")}
            </Button>
          )}
        </div>
        <DialogFooter>
          <Button onClick={onClose}>{t("apiGateway.domains.done")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
