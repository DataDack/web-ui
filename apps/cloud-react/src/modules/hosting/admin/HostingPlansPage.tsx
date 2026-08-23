import { useMemo, useState } from "react"

import { actionsColumn, Badge, Button, DataTable, EmptyState } from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import { Copy, EyeOff, Package, Pencil, Plus, Trash2 } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { ConfirmDialog, PageHeader } from "@/components/console"

import { HOSTING_ADMIN_ROUTES } from "../hosting.constants"
import { useAdminHostingPlans, useDeleteHostingPlan } from "../hosting.hooks"
import type { AdminPlanRow } from "../hosting.types"
import { formatLimitMB, formatMoney } from "../hosting.utils"

/**
 * The product catalogue.
 *
 * Plans live in S3, not the database, so this page is editing files — which is
 * why the account count travels alongside each row rather than on it, and why
 * deleting is refused once a plan has been sold.
 */
export function HostingPlansPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useAdminHostingPlans()
  const remove = useDeleteHostingPlan()

  const [deleting, setDeleting] = useState<AdminPlanRow | null>(null)

  // Memoised because the section lookup below depends on them: a fresh []
  // literal each render would rebuild that map on every keystroke.
  const rows = useMemo(() => data?.items ?? [], [data])
  const groups = useMemo(() => data?.groups ?? [], [data])

  const groupName = useMemo(() => {
    const byKey = new Map(groups.map((g) => [g.key, g.name]))
    // A plan whose section was deleted still has to render — losing a section
    // must never lose a product.
    return (key: string) => byKey.get(key) ?? (key ? key : "Other")
  }, [groups])

  const columns = useMemo<ColumnDef<AdminPlanRow>[]>(
    () => [
      {
        id: "name",
        header: () => <span className="text-xs font-semibold uppercase tracking-wider">Plan</span>,
        accessorFn: (r) => `${r.plan.name} ${r.plan.sku}`,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="flex items-center gap-2 text-[14px] font-semibold">
              {row.original.plan.name}
              {!row.original.plan.visible && (
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <EyeOff className="size-3" /> Hidden
                </Badge>
              )}
              {row.original.plan.retired && (
                <Badge variant="outline" className="text-[10px]">
                  Retired
                </Badge>
              )}
            </span>
            <span className="mt-0.5 font-mono text-[11px] text-muted-foreground">
              {row.original.plan.sku} · {groupName(row.original.plan.group)}
            </span>
          </div>
        ),
      },
      {
        id: "price",
        header: () => <span className="text-xs font-semibold uppercase tracking-wider">Price</span>,
        accessorFn: (r) => r.plan.pricing.monthly,
        cell: ({ row }) => {
          const p = row.original.plan.pricing
          return (
            <div className="flex flex-col text-[13px]">
              <span className="font-medium">
                {p.monthly > 0 ? `${formatMoney(p.monthly, p.currency)}/mo` : "Not sold monthly"}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {[
                  p.quarterly > 0 ? `${formatMoney(p.quarterly, p.currency)}/qtr` : null,
                  p.annual > 0 ? `${formatMoney(p.annual, p.currency)}/yr` : null,
                  p.setup_fee > 0 ? `setup ${formatMoney(p.setup_fee, p.currency)}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </span>
            </div>
          )
        },
      },
      {
        id: "limits",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">Limits</span>
        ),
        accessorFn: (r) => r.plan.limits.disk_mb,
        cell: ({ row }) => (
          <div className="flex flex-col text-[13px]">
            <span>{formatLimitMB(row.original.plan.limits.disk_mb)} disk</span>
            <span className="text-[11px] text-muted-foreground">
              {formatLimitMB(row.original.plan.limits.bandwidth_mb)} bandwidth
            </span>
          </div>
        ),
      },
      {
        id: "provisioning",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">Provisioning</span>
        ),
        accessorFn: (r) => r.plan.server_group,
        cell: ({ row }) => (
          <div className="flex flex-col text-[13px]">
            <span className="font-mono text-[11px]">{row.original.plan.whm_package || "—"}</span>
            <span className="text-[11px] text-muted-foreground">
              {row.original.plan.server_group || "any provider"}
            </span>
          </div>
        ),
      },
      {
        id: "accounts",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">In use</span>
        ),
        accessorFn: (r) => r.accounts,
        cell: ({ row }) => <span className="text-[13px] font-medium">{row.original.accounts}</span>,
      },
      actionsColumn<AdminPlanRow>({
        ariaLabel: "Plan actions",
        actions: (row) => [
          {
            label: "Edit",
            icon: Pencil,
            onAction: (r) => void navigate(HOSTING_ADMIN_ROUTES.planEdit(r.plan.sku)),
          },
          {
            label: "Copy SKU",
            icon: Copy,
            onAction: (r) => void navigator.clipboard.writeText(r.plan.sku),
          },
          {
            label: row.accounts > 0 ? "Delete (in use)" : "Delete",
            icon: Trash2,
            destructive: true,
            onAction: setDeleting,
          },
        ],
      }),
    ],
    [groupName, navigate],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hosting plans"
        description="What you sell. Stored as JSON in S3 and served to the pricing page without touching the database."
        icon={Package}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void refetch()}>
              Refresh
            </Button>
            <Button onClick={() => void navigate(HOSTING_ADMIN_ROUTES.planNew)}>
              <Plus className="size-4" /> Add plan
            </Button>
          </div>
        }
      />

      <DataTable
        data={rows}
        columns={columns}
        loading={isLoading}
        error={isError ? "The plan catalogue could not be loaded." : undefined}
        onRetry={() => void refetch()}
        searchable
        searchPlaceholder="Search plans"
        empty={
          <EmptyState
            icon={Package}
            title="No plans yet"
            description="Define what you sell before customers can order hosting."
            action={{
              label: "Add plan",
              onClick: () => void navigate(HOSTING_ADMIN_ROUTES.planNew),
            }}
          />
        }
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title="Delete this plan?"
        description={
          deleting && deleting.accounts > 0 ? (
            <p>
              <strong>{deleting.plan.name}</strong> has {deleting.accounts} account(s) on it.
              Deleting is refused — mark it retired instead, which hides it from the pricing page
              while those accounts keep resolving what they bought.
            </p>
          ) : (
            <p>
              <strong>{deleting?.plan.name}</strong> will be removed from the catalogue. The pricing
              page updates immediately.
            </p>
          )
        }
        confirmLabel="Delete plan"
        loading={remove.isPending}
        onConfirm={() => {
          if (!deleting) return
          remove.mutate(deleting.plan.sku, {
            onSuccess: () => {
              setDeleting(null)
            },
          })
        }}
      />
    </div>
  )
}
