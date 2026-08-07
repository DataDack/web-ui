import { useMemo, useState } from "react"

import type { ColumnDef } from "@tanstack/react-table"
import { Lock, Plus, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ConfirmDialog, staggerDelay } from "@/components/console"

import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  TableCell,
  TableRow,
  textColumn,
  type DataTableColumnMeta,
} from "@datadack/common-ui"

import { CreateSecurityGroupSheet } from "./CreateSecurityGroupSheet"
import { sgProtocolUsesPorts } from "../../api/shared"
import { SG_DIRECTIONS, SG_PROTOCOLS, SG_RULE_ACTIONS } from "../../vpc.constants"
import {
  useAddSGRule,
  useDeleteSecurityGroup,
  useRemoveSGRule,
  useSecurityGroups,
  useSGRules,
} from "../../vpc.hooks"
import type {
  SecurityGroup,
  SGDirection,
  SGProtocol,
  SGRule,
  SGRuleAction,
  VPCNetwork,
} from "../../vpc.types"

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

/* ── Add-rule row ──────────────────────────────────────────────────────── */

function AddRuleRow({ sgId }: Readonly<{ sgId: string }>) {
  const { t } = useTranslation()
  const { mutate: addRule, isPending } = useAddSGRule()
  const [direction, setDirection] = useState<SGDirection>("ingress")
  const [protocol, setProtocol] = useState<SGProtocol>("tcp")
  const [action, setAction] = useState<SGRuleAction>("allow")
  const [portRange, setPortRange] = useState("")
  const [source, setSource] = useState("")

  const usesPorts = sgProtocolUsesPorts(protocol)
  const canSubmit = source.trim() !== "" && (!usesPorts || portRange.trim() !== "")

  const submit = () => {
    addRule(
      {
        sgId,
        payload: {
          direction,
          protocol,
          action,
          port_range: usesPorts ? portRange.trim() : "",
          source: source.trim(),
        },
      },
      {
        onSuccess: () => {
          setPortRange("")
          setSource("")
        },
      },
    )
  }

  return (
    <TableRow className="hover:bg-transparent">
      <TableCell className="px-3 py-2">
        <Select
          value={direction}
          onValueChange={(value) => {
            setDirection(value as SGDirection)
          }}
        >
          <SelectTrigger
            size="sm"
            className="w-full font-mono text-[12px]"
            aria-label={t("vpc.rules.direction")}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SG_DIRECTIONS.map((d) => (
              <SelectItem key={d} value={d} className="font-mono text-[12px]">
                {t(`vpc.rules.${d}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="px-3 py-2">
        <Select
          value={protocol}
          onValueChange={(value) => {
            const nextProtocol = value as SGProtocol
            setProtocol(nextProtocol)
            if (!sgProtocolUsesPorts(nextProtocol)) {
              setPortRange("")
            }
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
          value={usesPorts ? portRange : ""}
          onChange={(e) => {
            setPortRange(e.target.value)
          }}
          placeholder={usesPorts ? t("vpc.rules.portPlaceholder") : ""}
          className="h-8 font-mono text-[12px]"
          disabled={!usesPorts}
        />
      </TableCell>
      <TableCell className="px-3 py-2">
        <Input
          value={source}
          onChange={(e) => {
            setSource(e.target.value)
          }}
          placeholder={t("vpc.rules.sourcePlaceholder")}
          className="h-8 font-mono text-[12px]"
        />
      </TableCell>
      <TableCell className="px-3 py-2">
        <Select
          value={action}
          onValueChange={(value) => {
            setAction(value as SGRuleAction)
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
      <TableCell className="px-3 py-2 text-right">
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1"
          disabled={!canSubmit || isPending}
          onClick={submit}
          loading={isPending}
        >
          <Plus className="size-3" />
          {t("vpc.rules.add")}
        </Button>
      </TableCell>
    </TableRow>
  )
}

/* ── Security group panel ──────────────────────────────────────────────── */

function SecurityGroupPanel({
  group,
  index,
  onDelete,
}: Readonly<{
  group: SecurityGroup
  index: number
  onDelete: (group: SecurityGroup) => void
}>) {
  const { t } = useTranslation()
  const {
    data: rules = [],
    isLoading,
    isError: sGRulesError,
    refetch: refetchSGRules,
  } = useSGRules(group.id)
  const { mutate: removeRule, isPending: isRemoving } = useRemoveSGRule()

  const columns = useMemo<ColumnDef<SGRule>[]>(
    () => [
      textColumn({
        id: "direction",
        header: t("vpc.rules.direction"),
        accessor: (rule) => t(`vpc.rules.${rule.direction}`),
        mono: true,
      }),
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
      {
        id: "remove",
        header: "",
        meta: { interactive: true } satisfies DataTableColumnMeta,
        cell: ({ row }) => (
          <div className="text-right">
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
    <div className="glass-1 overflow-hidden animate-content-enter" style={staggerDelay(index)}>
      <div className="flex flex-wrap items-start justify-between gap-2 px-4 py-3.5 border-b border-border-glass">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Lock className="size-3.5 text-muted-foreground" />
            <h3 className="font-mono text-[13px] font-semibold text-foreground">{group.name}</h3>
            <span className="font-mono text-[11px] text-muted-foreground">
              {t("vpc.rules.count", { count: rules.length })}
            </span>
          </div>
          <p className="mt-0.5 text-[12px] text-muted-foreground">{group.description}</p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="gap-1.5 text-muted-foreground hover:text-destructive"
          onClick={() => {
            onDelete(group)
          }}
        >
          <Trash2 className="size-3.5" />
          {t("vpc.actions.delete")}
        </Button>
      </div>

      <DataTable<SGRule>
        data={rules}
        columns={columns}
        loading={isLoading}
        skeletonRows={3}
        getRowId={(rule) => rule.id}
        empty={<span className="text-[13px] text-muted-foreground">{t("vpc.rules.empty")}</span>}
        // The add form is part of the grid, so it belongs in the body — and it
        // has to survive the empty state, or there is no way to add the first rule.
        footerRow={<AddRuleRow sgId={group.id} />}
        error={sGRulesError ? t("console.table.error") : undefined}
        onRetry={() => void refetchSGRules()}
        retryLabel={t("console.table.retry")}
      />
    </div>
  )
}

/* ── Tab ───────────────────────────────────────────────────────────────── */

export function SecurityGroupsTab({ network }: Readonly<{ network: VPCNetwork }>) {
  const { t } = useTranslation()
  const { data: groups = [], isLoading } = useSecurityGroups(network.id)
  const { mutate: deleteGroup, isPending: isDeleting } = useDeleteSecurityGroup()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [toDelete, setToDelete] = useState<SecurityGroup | null>(null)

  if (isLoading) {
    return (
      <div className="space-y-3">
        {["a", "b", "c"].map((k) => (
          <Skeleton key={k} className="h-40 rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => {
            setSheetOpen(true)
          }}
        >
          <Plus className="size-3.5" />
          {t("vpc.sgForm.create")}
        </Button>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          icon={Lock}
          title={t("vpc.detail.noSecurityGroups")}
          description={t("vpc.detail.noSecurityGroupsDescription")}
          action={{
            label: t("vpc.sgForm.create"),
            onClick: () => {
              setSheetOpen(true)
            },
          }}
        />
      ) : (
        groups.map((group, index) => (
          <SecurityGroupPanel key={group.id} group={group} index={index} onDelete={setToDelete} />
        ))
      )}

      <CreateSecurityGroupSheet network={network} open={sheetOpen} onOpenChange={setSheetOpen} />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null)
        }}
        title={t("vpc.sgDeleteConfirm.title")}
        description={t("vpc.sgDeleteConfirm.description", { name: toDelete?.name ?? "" })}
        confirmLabel={t("vpc.actions.delete")}
        loading={isDeleting}
        onConfirm={() => {
          if (toDelete) {
            deleteGroup(toDelete.id, {
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
