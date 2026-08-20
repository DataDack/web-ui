import { useState } from "react"

import {
  Button,
  CopyButton,
  DataTable,
  EmptyState,
  Input,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  cn,
} from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import { Link2, Pencil, Ticket, Users } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ConfirmDialog } from "@/components/console"
import {
  promoShareLink,
  type PromoCode,
  type PromoRedemption,
  usePromoRedemptions,
  useRevokeRedemption,
} from "@/modules/promotions"

import { formatPct, formatRupees, useScopeSentence } from "./promo-format"
import { PromoStateBadge, RedemptionStatusBadge } from "./promo-ui"

interface Props {
  code: PromoCode | null
  onOpenChange: (open: boolean) => void
  onEdit: (code: PromoCode) => void
}

/**
 * Everything about one campaign: what it grants, how it is doing, who has used
 * it, and the link to hand out.
 *
 * The share link is given the most prominent position on the sheet because it is
 * the thing an operator opens this for most often. A campaign nobody can be
 * given the link to is a campaign that does not run.
 */
export function PromoCodeDetailSheet({ code, onOpenChange, onEdit }: Readonly<Props>) {
  const { t } = useTranslation()
  const scopeSentence = useScopeSentence()
  const { data: redemptions = [], isLoading, isError, refetch, isFetching } = usePromoRedemptions(
    code?.id,
  )
  const { mutate: revoke, isPending: isRevoking } = useRevokeRedemption(code?.id)
  const [revoking, setRevoking] = useState<PromoRedemption | null>(null)
  const [reason, setReason] = useState("")

  const columns: ColumnDef<PromoRedemption>[] = [
    {
      id: "account",
      header: () => t("superAdmin.promoCodes.redemptionFields.account"),
      cell: ({ row }) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium text-foreground">
            {row.original.account_name || "—"}
          </span>
          <span className="truncate font-mono text-[11px] text-muted-foreground">
            {row.original.account_number}
          </span>
        </div>
      ),
    },
    {
      id: "user",
      header: () => t("superAdmin.promoCodes.redemptionFields.user"),
      cell: ({ row }) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm text-foreground">{row.original.user_name || "—"}</span>
          <span className="truncate text-[11px] text-muted-foreground">
            {row.original.user_email}
          </span>
        </div>
      ),
    },
    {
      id: "granted",
      header: () => t("superAdmin.promoCodes.redemptionFields.granted"),
      cell: ({ row }) => (
        <span className="text-sm tabular-nums text-foreground">
          {row.original.kind === "credit"
            ? formatRupees(row.original.credit_amount)
            : formatPct(row.original.discount_pct)}
        </span>
      ),
    },
    {
      id: "status",
      header: () => t("superAdmin.promoCodes.redemptionFields.status"),
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <RedemptionStatusBadge status={row.original.status} />
          {row.original.revoked_reason && (
            <span className="max-w-[180px] truncate text-[11px] text-muted-foreground">
              {row.original.revoked_reason}
            </span>
          )}
        </div>
      ),
    },
    {
      id: "when",
      header: () => t("superAdmin.promoCodes.redemptionFields.redeemedAt"),
      cell: ({ row }) => (
        <span className="text-[11px] text-muted-foreground">
          {new Date(row.original.redeemed_at).toLocaleString()}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => "",
      enableSorting: false,
      cell: ({ row }) =>
        // Only a live percent-off redemption can be withdrawn. A credit grant is
        // already spent money and a revoked row is already revoked — offering the
        // button there would promise something the server will not do.
        row.original.status === "active" && row.original.kind === "percent_off" ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              setReason("")
              setRevoking(row.original)
            }}
          >
            {t("superAdmin.promoCodes.actions.revoke")}
          </Button>
        ) : null,
    },
  ]

  const shareLink = code ? promoShareLink(code.code) : ""

  // The two kind-dependent rows, resolved before the JSX: a credit code has no
  // scope and no duration, so both read "—" rather than borrowing the
  // percent-off wording for a field that does not apply to them.
  const notApplicable = t("superAdmin.promoCodes.detail.notApplicable")
  const appliesToValue = (() => {
    if (!code) return ""
    if (code.kind === "credit") return notApplicable
    return scopeSentence(code.applies_to)
  })()
  const durationValue = (() => {
    if (!code) return ""
    if (code.kind === "credit") return notApplicable
    if (code.duration_days === 0) return t("superAdmin.promoCodes.detail.untilCampaignEnds")
    return t("superAdmin.promoCodes.detail.days", { count: code.duration_days })
  })()

  return (
    <>
      <Sheet
        open={!!code}
        onOpenChange={(open) => {
          if (!open) onOpenChange(false)
        }}
      >
        <SheetContent side="right" className="flex w-full max-w-[720px] flex-col gap-0 p-0">
          {code && (
            <>
              <SheetHeader className="shrink-0 px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <SheetTitle className="flex items-center gap-2">
                      <span className="truncate">{code.name}</span>
                      <PromoStateBadge state={code.state} />
                    </SheetTitle>
                    <SheetDescription className="mt-1">
                      {code.description || t("superAdmin.promoCodes.detail.noDescription")}
                    </SheetDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 gap-1.5"
                    onClick={() => {
                      onEdit(code)
                    }}
                  >
                    <Pencil className="size-3.5" />
                    {t("superAdmin.actions.edit")}
                  </Button>
                </div>
              </SheetHeader>
              <Separator />

              <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                {/* The link, first: it is what this sheet is opened for. */}
                <div className="rounded-lg border border-brand-gold/30 bg-brand-gold/5 p-4">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Link2 className="size-3.5" />
                    {t("superAdmin.promoCodes.detail.shareTitle")}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {t("superAdmin.promoCodes.detail.shareHint")}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <CopyButton
                      value={code.code}
                      label={code.code}
                      copiedLabel={t("console.copy.copied")}
                      className="text-sm font-semibold tracking-wider"
                    />
                    <span className="text-muted-foreground">·</span>
                    <CopyButton
                      value={shareLink}
                      label={t("superAdmin.promoCodes.detail.copyLink")}
                      mono={false}
                      copiedLabel={t("superAdmin.promoCodes.toasts.linkCopied")}
                      className="text-sm"
                    />
                  </div>
                  <p className="mt-2 break-all font-mono text-[11px] text-muted-foreground">
                    {shareLink}
                  </p>
                </div>

                <DetailGrid
                  items={[
                    {
                      label: t("superAdmin.promoCodes.fields.kind"),
                      value: t(`superAdmin.promoCodes.kinds.${code.kind}`),
                    },
                    {
                      label:
                        code.kind === "credit"
                          ? t("superAdmin.promoCodes.fields.creditAmount")
                          : t("superAdmin.promoCodes.fields.discountPct"),
                      value:
                        code.kind === "credit"
                          ? formatRupees(code.credit_amount)
                          : formatPct(code.discount_pct),
                    },
                    {
                      label: t("superAdmin.promoCodes.fields.appliesTo"),
                      value: appliesToValue,
                    },
                    {
                      label: t("superAdmin.promoCodes.fields.maxRedemptions"),
                      value:
                        code.max_redemptions === 0
                          ? t("superAdmin.promoCodes.usage.unlimited")
                          : `${String(code.redeemed_count)} / ${String(code.max_redemptions)}`,
                    },
                    {
                      label: t("superAdmin.promoCodes.fields.perAccountLimit"),
                      value: String(code.per_account_limit),
                    },
                    {
                      label: t("superAdmin.promoCodes.fields.durationDays"),
                      value: durationValue,
                    },
                    {
                      label: t("superAdmin.promoCodes.fields.startsAt"),
                      value: code.starts_at
                        ? new Date(code.starts_at).toLocaleString()
                        : t("superAdmin.promoCodes.detail.immediately"),
                    },
                    {
                      label: t("superAdmin.promoCodes.fields.endsAt"),
                      value: code.ends_at
                        ? new Date(code.ends_at).toLocaleString()
                        : t("superAdmin.promoCodes.detail.noEnd"),
                    },
                    {
                      label: t("superAdmin.promoCodes.fields.newAccountsOnly"),
                      value: code.new_accounts_only
                        ? t("superAdmin.promoCodes.detail.newerThan", {
                            count: code.new_account_max_age_days,
                          })
                        : t("superAdmin.promoCodes.detail.anyAccount"),
                    },
                    {
                      label: t("superAdmin.promoCodes.fields.creditsGranted"),
                      value: formatRupees(code.credits_granted),
                    },
                  ]}
                />

                <div>
                  <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <Users className="size-4 text-muted-foreground" />
                    {t("superAdmin.promoCodes.detail.redemptions")}
                    <span className="text-muted-foreground">({redemptions.length})</span>
                  </h3>
                  <div className="mt-3">
                    <DataTable<PromoRedemption>
                      data={redemptions}
                      columns={columns}
                      loading={isLoading}
                      error={isError ? t("console.table.error") : undefined}
                      onRetry={() => void refetch()}
                      retryLabel={t("console.table.retry")}
                      getRowId={(r) => r.id}
                      pagination={{ pageSize: 10 }}
                      onRefresh={() => void refetch()}
                      refreshLabel={t("console.table.refresh")}
                      refreshing={isFetching}
                      empty={
                        <EmptyState
                          icon={Ticket}
                          title={t("superAdmin.promoCodes.detail.noRedemptions")}
                          description={t("superAdmin.promoCodes.detail.noRedemptionsHint")}
                        />
                      }
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!revoking}
        onOpenChange={(open) => {
          if (!open) setRevoking(null)
        }}
        title={t("superAdmin.promoCodes.revoke.title")}
        description={
          <div className="space-y-3">
            <p>
              {t("superAdmin.promoCodes.revoke.description", {
                account: revoking?.account_name ?? "",
              })}
            </p>
            <Input
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
              }}
              placeholder={t("superAdmin.promoCodes.revoke.reasonPlaceholder")}
              aria-label={t("superAdmin.promoCodes.revoke.reasonLabel")}
            />
            <p className="text-[11px] text-muted-foreground">
              {t("superAdmin.promoCodes.revoke.note")}
            </p>
          </div>
        }
        confirmLabel={t("superAdmin.promoCodes.actions.revoke")}
        loading={isRevoking}
        onConfirm={() => {
          if (!revoking || reason.trim().length < 3) return
          revoke(
            { id: revoking.id, reason: reason.trim() },
            {
              onSuccess: () => {
                setRevoking(null)
              },
            },
          )
        }}
      />
    </>
  )
}

/** Two-column label/value grid — the detail sheet's own, kept local because it
 *  wants a denser rhythm than the shared KeyValueGrid. */
function DetailGrid({
  items,
}: Readonly<{ items: { label: string; value: string }[] }>) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {item.label}
          </dt>
          <dd className={cn("mt-0.5 truncate text-sm text-foreground")} title={item.value}>
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
