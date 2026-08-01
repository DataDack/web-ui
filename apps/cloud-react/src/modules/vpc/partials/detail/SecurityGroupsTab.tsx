import { useState } from "react"

import { Loader2, Lock, Plus, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ConfirmDialog, EmptyState, staggerDelay } from "@/components/console"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { Badge, Skeleton } from "@datadack/serverless-ui"

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
  SGRuleAction,
  VPCNetwork,
} from "../../vpc.types"

const HEAD_CLASS = "px-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground"

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
        >
          {isPending ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
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
  const { data: rules = [], isLoading } = useSGRules(group.id)
  const { mutate: removeRule, isPending: isRemoving } = useRemoveSGRule()

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

      {isLoading ? (
        <div className="p-4 space-y-2">
          {["a", "b", "c"].map((k) => (
            <Skeleton key={k} className="h-8 rounded" />
          ))}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={HEAD_CLASS}>{t("vpc.rules.direction")}</TableHead>
              <TableHead className={HEAD_CLASS}>{t("vpc.rules.protocol")}</TableHead>
              <TableHead className={HEAD_CLASS}>{t("vpc.rules.portRange")}</TableHead>
              <TableHead className={HEAD_CLASS}>{t("vpc.rules.source")}</TableHead>
              <TableHead className={HEAD_CLASS}>{t("vpc.rules.action")}</TableHead>
              <TableHead className={HEAD_CLASS} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((rule, ruleIndex) => (
              <TableRow
                key={rule.id}
                className="animate-content-enter"
                style={staggerDelay(ruleIndex)}
              >
                <TableCell className="px-3 font-mono text-[12px]">
                  {t(`vpc.rules.${rule.direction}`)}
                </TableCell>
                <TableCell className="px-3 font-mono text-[12px] uppercase">
                  {rule.protocol}
                </TableCell>
                <TableCell className="px-3 font-mono text-[12px]">{rule.port_range}</TableCell>
                <TableCell className="px-3 font-mono text-[12px]">{rule.source}</TableCell>
                <TableCell className="px-3">
                  <RuleActionBadge action={rule.action} />
                </TableCell>
                <TableCell className="px-3 text-right">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    disabled={isRemoving}
                    aria-label={t("vpc.rules.remove")}
                    onClick={() => {
                      removeRule({ ruleId: rule.id, sgId: group.id })
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {rules.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={6}
                  className="px-3 py-4 text-center text-[13px] text-muted-foreground"
                >
                  {t("vpc.rules.empty")}
                </TableCell>
              </TableRow>
            )}
            <AddRuleRow sgId={group.id} />
          </TableBody>
        </Table>
      )}
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
