import { useMemo, useState } from "react"

import {
  Badge,
  Button,
  EmptyState,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  DataTable,
  Skeleton,
  TableCell,
  TableRow,
  textColumn,
  type DataTableColumnMeta,
} from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router-dom"

import { ConfirmDialog, DetailPage } from "@/components/console"
import { useScreen } from "@/services/api/screen"

import { sgProtocolUsesPorts } from "../api/shared"
import { SG_PROTOCOLS, SG_RULE_ACTIONS, VPC_ROUTES } from "../vpc.constants"
import {
  useAddSGRule,
  useDeleteSecurityGroup,
  useRemoveSGRule,
  useSecurityGroup,
  useSGRules,
  useUpdateSGRule,
  useVPCs,
} from "../vpc.hooks"
import type { SecurityGroup, SGDirection, SGProtocol, SGRule, SGRuleAction } from "../vpc.types"

function RuleActionBadge({ action }: Readonly<{ action: SGRuleAction }>) {
  const { t } = useTranslation()
  return (
    <Badge
      variant="outline"
      className={
        action === "allow"
          ? "font-mono text-[11px] text-status-success bg-status-success-bg border-status-success/25"
          : "font-mono text-[11px] text-status-danger bg-status-danger-bg border-status-danger/25"
      }
    >
      {t(`vpc.rules.${action}`)}
    </Badge>
  )
}

/* ── Editable rule row (shared by "add" and "edit") ────────────────────── */

interface RuleDraft {
  protocol: SGProtocol
  action: SGRuleAction
  port_range: string
  source: string
  description: string
}

const EMPTY_DRAFT: RuleDraft = {
  protocol: "tcp",
  action: "allow",
  port_range: "",
  source: "",
  description: "",
}

function RuleFormRow({
  initial,
  pending,
  onSubmit,
  onCancel,
}: Readonly<{
  initial?: RuleDraft
  pending: boolean
  onSubmit: (draft: RuleDraft, reset: () => void) => void
  onCancel?: () => void
}>) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState<RuleDraft>(initial ?? EMPTY_DRAFT)
  const patch = (p: Partial<RuleDraft>) => {
    setDraft((d) => ({ ...d, ...p }))
  }

  const usesPorts = sgProtocolUsesPorts(draft.protocol)
  const canSubmit = draft.source.trim() !== "" && (!usesPorts || draft.port_range.trim() !== "")
  const isEdit = initial !== undefined

  return (
    <TableRow className="hover:bg-transparent">
      <TableCell className="px-3 py-2">
        <Select
          value={draft.protocol}
          onValueChange={(value) => {
            const protocol = value as SGProtocol
            patch({
              protocol,
              port_range: sgProtocolUsesPorts(protocol) ? draft.port_range : "",
            })
          }}
        >
          <SelectTrigger
            size="sm"
            className="w-full font-mono text-[12px]"
            aria-label={t("vpc.rules.protocol")}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SG_PROTOCOLS.map((p) => (
              <SelectItem key={p} value={p} className="font-mono text-[12px]">
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="px-3 py-2">
        <Input
          value={usesPorts ? draft.port_range : ""}
          onChange={(e) => {
            patch({ port_range: e.target.value })
          }}
          placeholder={usesPorts ? t("vpc.rules.portPlaceholder") : ""}
          className="h-8 font-mono text-[12px]"
          disabled={!usesPorts}
          aria-label={t("vpc.rules.portRange")}
        />
      </TableCell>
      <TableCell className="px-3 py-2">
        <Input
          value={draft.source}
          onChange={(e) => {
            patch({ source: e.target.value })
          }}
          placeholder={t("vpc.rules.sourcePlaceholder")}
          className="h-8 font-mono text-[12px]"
          aria-label={t("vpc.rules.source")}
        />
      </TableCell>
      <TableCell className="px-3 py-2">
        <Select
          value={draft.action}
          onValueChange={(value) => {
            patch({ action: value as SGRuleAction })
          }}
        >
          <SelectTrigger
            size="sm"
            className="w-full font-mono text-[12px]"
            aria-label={t("vpc.rules.action")}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SG_RULE_ACTIONS.map((a) => (
              <SelectItem key={a} value={a} className="font-mono text-[12px]">
                {t(`vpc.rules.${a}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="px-3 py-2">
        <Input
          value={draft.description}
          onChange={(e) => {
            patch({ description: e.target.value })
          }}
          placeholder={t("vpc.rules.descriptionPlaceholder")}
          className="h-8 text-[12px]"
          aria-label={t("vpc.rules.description")}
        />
      </TableCell>
      <TableCell className="px-3 py-2 text-right whitespace-nowrap">
        {isEdit ? (
          <>
            <Button
              size="icon"
              variant="ghost"
              className="size-7 text-muted-foreground hover:text-foreground"
              disabled={!canSubmit || pending}
              aria-label={t("vpc.rules.save")}
              onClick={() => {
                onSubmit(
                  {
                    ...draft,
                    port_range: usesPorts ? draft.port_range.trim() : "",
                  },
                  () => {
                    setDraft(EMPTY_DRAFT)
                  },
                )
              }}
            >
              {pending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Check className="size-3.5" />
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-7 text-muted-foreground hover:text-destructive"
              disabled={pending}
              aria-label={t("vpc.rules.cancel")}
              onClick={onCancel}
            >
              <X className="size-3.5" />
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1"
            disabled={!canSubmit || pending}
            onClick={() => {
              onSubmit({ ...draft, port_range: usesPorts ? draft.port_range.trim() : "" }, () => {
                setDraft(EMPTY_DRAFT)
              })
            }}
          >
            {pending ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
            {t("vpc.rules.add")}
          </Button>
        )}
      </TableCell>
    </TableRow>
  )
}

/* ── Rules panel (one direction) ───────────────────────────────────────── */

function RulesPanel({
  group,
  direction,
}: Readonly<{ group: SecurityGroup; direction: SGDirection }>) {
  const { t } = useTranslation()
  const {
    data: rules = [],
    isLoading,
    isError: rulesError,
    refetch: refetchRules,
  } = useSGRules(group.id)
  const { mutate: addRule, isPending: isAdding } = useAddSGRule()
  const { mutate: updateRule, isPending: isUpdating } = useUpdateSGRule()
  const { mutate: removeRule, isPending: isRemoving } = useRemoveSGRule()
  const [editingId, setEditingId] = useState<string | null>(null)

  const directional = rules.filter((r) => r.direction === direction)

  if (isLoading) {
    return (
      <div className="glass-1 p-4 space-y-2">
        {["a", "b", "c"].map((k) => (
          <Skeleton key={k} className="h-8 rounded" />
        ))}
      </div>
    )
  }

  const submitAdd = (draft: RuleDraft, reset: () => void) => {
    addRule(
      {
        sgId: group.id,
        payload: {
          direction,
          protocol: draft.protocol,
          action: draft.action,
          port_range: draft.port_range.trim(),
          source: draft.source.trim(),
          description: draft.description.trim(),
        },
      },
      { onSuccess: reset },
    )
  }

  const submitEdit = (rule: SGRule) => (draft: RuleDraft) => {
    updateRule(
      {
        sgId: group.id,
        ruleId: rule.id,
        payload: {
          direction,
          protocol: draft.protocol,
          action: draft.action,
          port_range: draft.port_range.trim(),
          source: draft.source.trim(),
          description: draft.description.trim(),
        },
      },
      {
        onSuccess: () => {
          setEditingId(null)
        },
      },
    )
  }

  const columns = useMemo<ColumnDef<SGRule>[]>(
    () => [
      {
        id: "protocol",
        header: t("vpc.rules.protocol"),
        accessorFn: (rule) => rule.protocol,
        cell: ({ row }) => (
          <span className="font-mono text-[12px] uppercase">{row.original.protocol}</span>
        ),
      },
      textColumn({
        id: "portRange",
        header: t("vpc.rules.portRange"),
        accessor: (rule) => rule.port_range,
        mono: true,
      }),
      textColumn({
        id: "source",
        header: t("vpc.rules.source"),
        accessor: (rule) => rule.source,
        mono: true,
      }),
      {
        id: "action",
        header: t("vpc.rules.action"),
        cell: ({ row }) => <RuleActionBadge action={row.original.action} />,
      },
      textColumn({
        id: "description",
        header: t("vpc.rules.description"),
        accessor: (rule) => rule.description,
        muted: true,
      }),
      {
        id: "controls",
        header: "",
        meta: { interactive: true } satisfies DataTableColumnMeta,
        cell: ({ row }) => (
          <div className="text-right whitespace-nowrap">
            <Button
              size="icon"
              variant="ghost"
              className="size-7 text-muted-foreground hover:text-foreground"
              aria-label={t("vpc.rules.edit")}
              onClick={() => {
                setEditingId(row.original.id)
              }}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-7 text-muted-foreground hover:text-destructive"
              disabled={isRemoving}
              aria-label={t("vpc.rules.remove")}
              onClick={() => {
                removeRule({ ruleId: row.original.id, sgId: group.id })
              }}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [group.id, isRemoving, removeRule, t],
  )

  return (
    <div className="space-y-4">
      {group.status === "error" && group.provision_error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-[12px] text-destructive"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{group.provision_error}</span>
        </div>
      )}

      <div className="glass-1 overflow-hidden">
        <DataTable<SGRule>
          data={directional}
          columns={columns}
          getRowId={(rule) => rule.id}
          // Editing swaps the row for the same form used to add one.
          renderRow={(rule) =>
            editingId === rule.id ? (
              <RuleFormRow
                initial={{
                  protocol: rule.protocol,
                  action: rule.action,
                  port_range: rule.port_range,
                  source: rule.source,
                  description: rule.description,
                }}
                pending={isUpdating}
                onSubmit={submitEdit(rule)}
                onCancel={() => {
                  setEditingId(null)
                }}
              />
            ) : null
          }
          // The add form belongs in the grid, and has to outlive the empty state.
          footerRow={<RuleFormRow pending={isAdding} onSubmit={submitAdd} />}
          empty={<span className="text-[13px] text-muted-foreground">{t("vpc.rules.empty")}</span>}
          bordered={false}
          error={rulesError ? t("console.table.error") : undefined}
          onRetry={() => void refetchRules()}
          retryLabel={t("console.table.retry")}
        />
      </div>
    </div>
  )
}

/* ── Page ──────────────────────────────────────────────────────────────── */

export function SecurityGroupDetailPage() {
  useScreen("vpc.security-group-detail")
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id = "" } = useParams()
  const { data: group, isLoading } = useSecurityGroup(id)
  const { data: networks = [] } = useVPCs()
  const { mutate: deleteGroup, isPending: isDeleting } = useDeleteSecurityGroup()
  const [deleteOpen, setDeleteOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (!group) {
    return (
      <EmptyState
        icon={Lock}
        title={t("vpc.sgDetail.notFound")}
        action={{
          label: t("vpc.sgDetail.back"),
          onClick: () => void navigate(VPC_ROUTES.SECURITY_GROUPS),
        }}
      />
    )
  }

  const vpcName = group.network_id
    ? (networks.find((n) => n.id === group.network_id)?.name ?? group.network_id)
    : t("vpc.sgList.accountWide")

  return (
    <>
      <DetailPage
        backTo={VPC_ROUTES.SECURITY_GROUPS}
        backLabel={t("vpc.sgDetail.back")}
        icon={Lock}
        title={group.name}
        status={group.status}
        id={`SG-${group.tenant_serial}`}
        layoutId="sg-detail-tabs"
        actions={
          <>
            <Badge
              variant="outline"
              className="font-mono text-[11px] text-status-neutral bg-status-neutral-bg border-status-neutral/25"
            >
              {vpcName}
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 text-muted-foreground hover:text-destructive"
              onClick={() => {
                setDeleteOpen(true)
              }}
            >
              <Trash2 className="size-3.5" />
              {t("vpc.actions.delete")}
            </Button>
          </>
        }
        tabs={[
          {
            value: "inbound",
            label: t("vpc.sgDetail.inboundRules"),
            icon: ArrowDownToLine,
            content: <RulesPanel group={group} direction="ingress" />,
          },
          {
            value: "outbound",
            label: t("vpc.sgDetail.outboundRules"),
            icon: ArrowUpFromLine,
            content: <RulesPanel group={group} direction="egress" />,
          },
        ]}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("vpc.sgDeleteConfirm.title")}
        description={t("vpc.sgDeleteConfirm.description", { name: group.name })}
        confirmLabel={t("vpc.actions.delete")}
        loading={isDeleting}
        onConfirm={() => {
          deleteGroup(group.id, {
            onSuccess: () => {
              setDeleteOpen(false)
              void navigate(VPC_ROUTES.SECURITY_GROUPS)
            },
          })
        }}
      />
    </>
  )
}
