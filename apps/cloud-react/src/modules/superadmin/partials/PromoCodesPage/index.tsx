import { useCallback, useMemo, useState } from "react"

import {
  actionsColumn,
  Button,
  DataTable,
  EmptyState,
  type RowAction,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import { Coins, Link2, Pause, Pencil, Play, Plus, RefreshCw, Ticket, Trash2, Users } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { ConfirmDialog, PageHeader, StatGrid, type StatCardProps } from "@/components/console"
import {
  promoShareLink,
  type PromoCode,
  type PromoState,
  useDeletePromoCode,
  usePromoCodes,
  usePromoStats,
  useSetPromoStatus,
} from "@/modules/promotions"
import { useScreen } from "@/services/api/screen"

import { formatRupees } from "./promo-format"
import { PromoStateBadge, RewardCell, UsageCell } from "./promo-ui"
import { PromoCodeDetailSheet } from "./PromoCodeDetailSheet"
import { PromoCodeFormSheet } from "./PromoCodeFormSheet"

type StateFilter = PromoState | "all"

const STATE_FILTERS: StateFilter[] = ["all", "active", "scheduled", "paused", "expired", "exhausted"]

interface ActionHelpers {
  t: (key: string, opts?: Record<string, unknown>) => string
  onEdit: (code: PromoCode) => void
  onShare: (code: PromoCode) => void
  onToggle: (code: PromoCode) => void
  onRedemptions: (code: PromoCode) => void
  onDelete: (code: PromoCode) => void
}

// Kept at module scope so the column callback stays shallow (lint: nesting).
function buildActions(code: PromoCode, h: ActionHelpers): RowAction<PromoCode>[] {
  const actions: RowAction<PromoCode>[] = [
    { label: h.t("superAdmin.promoCodes.actions.copyLink"), icon: Link2, onAction: h.onShare },
    { label: h.t("superAdmin.actions.edit"), icon: Pencil, onAction: h.onEdit },
    {
      label: h.t("superAdmin.promoCodes.actions.viewRedemptions"),
      icon: Users,
      onAction: h.onRedemptions,
    },
  ]
  // Pausing an already-finished campaign changes nothing, so the toggle is only
  // offered where it does something.
  if (code.state !== "expired" && code.state !== "exhausted") {
    actions.push({
      label:
        code.status === "paused"
          ? h.t("superAdmin.promoCodes.actions.resume")
          : h.t("superAdmin.promoCodes.actions.pause"),
      icon: code.status === "paused" ? Play : Pause,
      onAction: h.onToggle,
    })
  }
  // Only an unused campaign can be deleted — the server refuses the rest, and an
  // action that is always refused is worse than one that is not offered.
  if (code.redeemed_count === 0) {
    actions.push({
      label: h.t("superAdmin.actions.delete"),
      icon: Trash2,
      destructive: true,
      onAction: h.onDelete,
    })
  }
  return actions
}

/**
 * Promo codes — the operator's campaign desk.
 *
 * A campaign is two decisions: what it gives away, and how far it is allowed to
 * spread. The table is built around the second one, because that is the one that
 * costs money and the one that is easy to get wrong: the usage column is the
 * widest non-text column, and an uncapped campaign says so in words rather than
 * showing a progress bar that would imply a limit it does not have.
 */
export function PromoCodesPage() {
  useScreen("superadmin.promoCodes")
  const { t } = useTranslation()

  const { data: codes = [], isLoading, isError, refetch, isFetching } = usePromoCodes()
  const { data: stats, isLoading: statsLoading } = usePromoStats()
  const { mutate: setStatus } = useSetPromoStatus()
  const { mutate: removeCode, isPending: isDeleting } = useDeletePromoCode()

  const [stateFilter, setStateFilter] = useState<StateFilter>("all")
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<PromoCode | null>(null)
  const [detail, setDetail] = useState<PromoCode | null>(null)
  const [deleting, setDeleting] = useState<PromoCode | null>(null)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (code: PromoCode) => {
    setEditing(code)
    setFormOpen(true)
  }

  // Stable across renders so the memoised columns don't have to be rebuilt for
  // it — and so the exhaustive-deps rule is satisfied honestly rather than
  // silenced.
  const copyShareLink = useCallback((code: PromoCode) => {
    void navigator.clipboard
      .writeText(promoShareLink(code.code))
      .then(() => toast.success(t("superAdmin.promoCodes.toasts.linkCopied")))
      .catch(() => toast.error(t("superAdmin.promoCodes.toasts.linkCopyFailed")))
  }, [t])

  const rows = useMemo(
    () => (stateFilter === "all" ? codes : codes.filter((c) => c.state === stateFilter)),
    [codes, stateFilter],
  )

  const tiles = useMemo<StatCardProps[]>(
    () => [
      {
        label: t("superAdmin.promoCodes.stats.activeCodes"),
        value: stats?.active_codes ?? 0,
        icon: Ticket,
        color: "success",
        loading: statsLoading,
      },
      {
        label: t("superAdmin.promoCodes.stats.redemptions"),
        value: stats?.total_redemptions ?? 0,
        icon: Users,
        color: "info",
        loading: statsLoading,
      },
      {
        label: t("superAdmin.promoCodes.stats.creditsGranted"),
        value: stats?.credits_granted ?? 0,
        // The tile counts up, so the ₹ formatting is handed in rather than
        // baked into the value — see the console's StatCard.
        format: formatRupees,
        icon: Coins,
        color: "warning",
        loading: statsLoading,
      },
      {
        label: t("superAdmin.promoCodes.stats.activeDiscounts"),
        value: stats?.active_discounts ?? 0,
        loading: statsLoading,
      },
    ],
    [stats, statsLoading, t],
  )

  const columns = useMemo<ColumnDef<PromoCode>[]>(() => {
    const helpers: ActionHelpers = {
      t,
      onEdit: openEdit,
      onShare: copyShareLink,
      onToggle: (code) => {
        setStatus({ id: code.id, status: code.status === "paused" ? "active" : "paused" })
      },
      onRedemptions: (code) => {
        setDetail(code)
      },
      onDelete: (code) => {
        setDeleting(code)
      },
    }
    return [
      {
        id: "code",
        header: () => t("superAdmin.promoCodes.fields.code"),
        accessorFn: (c) => `${c.code} ${c.name}`,
        cell: ({ row }) => (
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-mono text-sm font-semibold tracking-wider text-foreground">
              {row.original.code}
            </span>
            <span className="truncate text-[11px] text-muted-foreground">{row.original.name}</span>
          </div>
        ),
      },
      {
        id: "reward",
        header: () => t("superAdmin.promoCodes.fields.reward"),
        enableSorting: false,
        cell: ({ row }) => <RewardCell code={row.original} />,
      },
      {
        id: "usage",
        header: () => t("superAdmin.promoCodes.fields.usage"),
        accessorFn: (c) => c.redeemed_count,
        cell: ({ row }) => <UsageCell code={row.original} />,
      },
      {
        id: "window",
        header: () => t("superAdmin.promoCodes.fields.window"),
        enableSorting: false,
        meta: { responsive: "lg" },
        cell: ({ row }) => (
          <div className="flex min-w-0 flex-col text-[11px] text-muted-foreground">
            <span>
              {row.original.starts_at
                ? new Date(row.original.starts_at).toLocaleDateString()
                : t("superAdmin.promoCodes.detail.immediately")}
            </span>
            <span>
              {row.original.ends_at
                ? new Date(row.original.ends_at).toLocaleDateString()
                : t("superAdmin.promoCodes.detail.noEnd")}
            </span>
          </div>
        ),
      },
      {
        id: "state",
        header: () => t("superAdmin.promoCodes.fields.state"),
        accessorFn: (c) => c.state,
        cell: ({ row }) => <PromoStateBadge state={row.original.state} />,
      },
      actionsColumn<PromoCode>({
        ariaLabel: t("console.table.actions"),
        actions: (code) => buildActions(code, helpers),
      }),
    ]
  }, [t, setStatus, copyShareLink])

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Ticket}
        breadcrumbs={[{ label: t("superAdmin.title") }, { label: t("superAdmin.promoCodes.title") }]}
        title={t("superAdmin.promoCodes.title")}
        description={t("superAdmin.promoCodes.subtitle")}
        actions={
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void refetch()}
              disabled={isFetching}
              aria-label={t("common.refresh")}
            >
              <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
            <Button className="gap-2" onClick={openCreate}>
              <Plus className="size-4" />
              {t("superAdmin.promoCodes.add")}
            </Button>
          </>
        }
      />

      <StatGrid stats={tiles} />

      <DataTable<PromoCode>
        data={rows}
        columns={columns}
        loading={isLoading}
        error={isError ? t("console.table.error") : undefined}
        onRetry={() => void refetch()}
        retryLabel={t("console.table.retry")}
        getRowId={(c) => c.id}
        searchable
        searchPlaceholder={t("superAdmin.promoCodes.searchPlaceholder")}
        toolbar={
          <Select
            value={stateFilter}
            onValueChange={(v) => {
              setStateFilter(v as StateFilter)
            }}
          >
            <SelectTrigger className="w-[160px]" aria-label={t("superAdmin.promoCodes.fields.state")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATE_FILTERS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "all"
                    ? t("superAdmin.promoCodes.filters.all")
                    : t(`superAdmin.promoCodes.states.${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        onRowClick={(code) => {
          setDetail(code)
        }}
        empty={
          <EmptyState
            icon={Ticket}
            title={t("superAdmin.promoCodes.empty")}
            description={t("superAdmin.promoCodes.emptySubtitle")}
            action={{ label: t("superAdmin.promoCodes.add"), onClick: openCreate }}
          />
        }
        noResults={
          <EmptyState
            icon={Ticket}
            title={t("superAdmin.promoCodes.noResults")}
            description={t("superAdmin.promoCodes.noResultsSubtitle")}
          />
        }
        onRefresh={() => void refetch()}
        refreshLabel={t("console.table.refresh")}
        refreshing={isFetching}
      />

      <PromoCodeFormSheet open={formOpen} onOpenChange={setFormOpen} code={editing} />

      <PromoCodeDetailSheet
        code={detail}
        onOpenChange={() => {
          setDetail(null)
        }}
        onEdit={(code) => {
          setDetail(null)
          openEdit(code)
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title={t("superAdmin.promoCodes.delete.title")}
        description={t("superAdmin.promoCodes.delete.description", { code: deleting?.code ?? "" })}
        confirmLabel={t("superAdmin.actions.delete")}
        loading={isDeleting}
        onConfirm={() => {
          if (!deleting) return
          removeCode(
            { id: deleting.id },
            {
              onSuccess: () => {
                setDeleting(null)
              },
            },
          )
        }}
      />
    </div>
  )
}
