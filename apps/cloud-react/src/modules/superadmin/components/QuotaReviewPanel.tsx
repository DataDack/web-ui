import { useState } from "react"

import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Skeleton,
  Textarea,
  cn,
} from "@datadack/common-ui"
import { ArrowRight, Check, Gauge, TriangleAlert, X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { KeyValueGrid, Section, type KeyValueItem } from "@/components/console"

import { useApproveQuotaRequest, useRejectQuotaRequest } from "../superadmin.hooks"
import type { QuotaRequestStatus, QuotaTicketReview } from "../superadmin.types"

const UNLIMITED = -1

const STATUS_CLASSES: Record<QuotaRequestStatus, string> = {
  pending: "border-status-warning/25 bg-status-warning-bg text-status-warning",
  approved: "border-status-success/25 bg-status-success-bg text-status-success",
  rejected: "border-status-danger/25 bg-status-danger-bg text-status-danger",
}

/** −1 reads as a word here; everywhere else it would look like a bad number. */
function limitText(value: number, unlimited: string): string {
  return value === UNLIMITED ? unlimited : String(value)
}

/**
 * The quota increase carried by a support ticket, with the two actions that
 * decide it.
 *
 * This is what the separate quota-requests queue became. Reviewing on the ticket
 * means the decision, the reason for it and the conversation that led there are
 * one thread the customer can already see — there is no second record to keep in
 * step, and approving posts the outcome to the thread itself.
 */
export function QuotaReviewPanel({
  ticketId,
  review,
  loading,
}: Readonly<{ ticketId: string; review: QuotaTicketReview | null | undefined; loading: boolean }>) {
  const { t } = useTranslation()
  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)

  if (loading) {
    return (
      <Section variant="panel" title={t("superAdmin.quotaRequests.panelTitle")}>
        <Skeleton className="h-24 w-full" />
      </Section>
    )
  }
  // Not a quota ticket (or the request could not be read) — the page is a plain
  // ticket page and says nothing about quotas.
  if (!review) return null

  const unlimited = t("governance.quotas.unlimited")
  const pending = review.status === "pending"
  // The limit moved between filing and now — a plan change, or another admin's
  // override. The reviewer has to judge against the live figure, so say so.
  const drifted = review.filed_limit !== review.current_limit

  const items: KeyValueItem[] = [
    {
      label: t("superAdmin.quotaRequests.columns.quota"),
      value: review.quota_name || review.quota_code,
    },
    { label: t("superAdmin.quotaRequests.quotaCode"), value: review.quota_code, copyable: true },
    {
      label: t("superAdmin.quotaRequests.currentLimit"),
      value: limitText(review.current_limit, unlimited),
    },
    {
      label: t("superAdmin.quotaRequests.requestedLimit"),
      value: limitText(review.requested_limit, unlimited),
    },
  ]
  if (review.granted_limit !== undefined) {
    items.push({
      label: t("superAdmin.quotaRequests.grantedLimit"),
      value: limitText(review.granted_limit, unlimited),
    })
  }

  return (
    <Section
      variant="panel"
      title={t("superAdmin.quotaRequests.panelTitle")}
      description={t("superAdmin.quotaRequests.panelSubtitle")}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand-gold/10 text-brand-gold">
            <Gauge className="size-4" />
          </span>
          <span className="flex items-center gap-2 font-mono text-sm tabular-nums text-foreground">
            {limitText(review.current_limit, unlimited)}
            <ArrowRight className="size-4 text-muted-foreground" />
            {limitText(review.granted_limit ?? review.requested_limit, unlimited)}
          </span>
          <Badge
            variant="outline"
            className={cn("gap-1.5 font-mono text-[11px]", STATUS_CLASSES[review.status])}
          >
            {review.status === "approved" && <Check className="size-3" />}
            {review.status === "rejected" && <X className="size-3" />}
            {t(`governance.quotas.status.${review.status}`)}
          </Badge>
        </div>

        {drifted && (
          <p className="flex items-start gap-2 rounded-md bg-status-warning-bg px-3 py-2 text-[13px] text-status-warning">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
            {t("superAdmin.quotaRequests.limitDrifted", {
              filed: limitText(review.filed_limit, unlimited),
              current: limitText(review.current_limit, unlimited),
            })}
          </p>
        )}

        {!review.adjustable && (
          <p className="flex items-start gap-2 rounded-md bg-status-danger-bg px-3 py-2 text-[13px] text-status-danger">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
            {t("superAdmin.quotaRequests.notAdjustable")}
          </p>
        )}

        <KeyValueGrid items={items} columns={2} />

        {pending && (
          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                setRejectOpen(true)
              }}
            >
              <X className="size-4" />
              {t("superAdmin.quotaRequests.reject")}
            </Button>
            <Button
              variant="gold"
              className="gap-2"
              disabled={!review.adjustable}
              onClick={() => {
                setApproveOpen(true)
              }}
            >
              <Check className="size-4" />
              {t("superAdmin.quotaRequests.approve")}
            </Button>
          </div>
        )}
      </div>

      <ApproveDialog
        ticketId={ticketId}
        review={review}
        open={approveOpen}
        onOpenChange={setApproveOpen}
      />
      <RejectDialog ticketId={ticketId} open={rejectOpen} onOpenChange={setRejectOpen} />
    </Section>
  )
}

function ApproveDialog({
  ticketId,
  review,
  open,
  onOpenChange,
}: Readonly<{
  ticketId: string
  review: QuotaTicketReview
  open: boolean
  onOpenChange: (open: boolean) => void
}>) {
  const { t } = useTranslation()
  const { mutate: approve, isPending } = useApproveQuotaRequest()
  // Pre-filled with what was asked for: granting exactly that is the common
  // case, and an empty box would make the reviewer retype it to agree.
  const [granted, setGranted] = useState(String(review.requested_limit))
  const [note, setNote] = useState("")

  const parsed = Number(granted)
  // The backend re-checks this against the live limit; the same rule is enforced
  // here so the reviewer is told before the round trip, not after it.
  const valid =
    granted.trim() !== "" &&
    Number.isInteger(parsed) &&
    (parsed === UNLIMITED || parsed > review.current_limit)

  const submit = () => {
    if (!valid) return
    approve(
      {
        ticketId,
        payload: { granted_limit: parsed, note: note.trim() || undefined },
      },
      {
        onSuccess: () => {
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("superAdmin.quotaRequests.approveTitle")}</DialogTitle>
          <DialogDescription>{t("superAdmin.quotaRequests.approveDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="granted-limit">{t("superAdmin.quotaRequests.grantedLimit")}</Label>
            <Input
              id="granted-limit"
              inputMode="numeric"
              value={granted}
              onChange={(e) => {
                setGranted(e.target.value)
              }}
            />
            <p className="text-[11px] text-muted-foreground">
              {t("superAdmin.quotaRequests.grantedHint", {
                current: review.current_limit === UNLIMITED ? "−1" : review.current_limit,
              })}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="approve-note">{t("superAdmin.quotaRequests.noteOptional")}</Label>
            <Textarea
              id="approve-note"
              rows={3}
              className="resize-none"
              value={note}
              onChange={(e) => {
                setNote(e.target.value)
              }}
            />
            <p className="text-[11px] text-muted-foreground">
              {t("superAdmin.quotaRequests.noteVisibleToCustomer")}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            {t("common.cancel")}
          </Button>
          <Button variant="gold" className="gap-2" disabled={!valid || isPending} onClick={submit}>
            <Check className="size-4" />
            {t("superAdmin.quotaRequests.approve")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RejectDialog({
  ticketId,
  open,
  onOpenChange,
}: Readonly<{ ticketId: string; open: boolean; onOpenChange: (open: boolean) => void }>) {
  const { t } = useTranslation()
  const { mutate: reject, isPending } = useRejectQuotaRequest()
  const [note, setNote] = useState("")

  const submit = () => {
    const body = note.trim()
    if (!body) return
    reject(
      { ticketId, payload: { note: body } },
      {
        onSuccess: () => {
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("superAdmin.quotaRequests.rejectTitle")}</DialogTitle>
          <DialogDescription>{t("superAdmin.quotaRequests.rejectDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="reject-note">{t("superAdmin.quotaRequests.note")}</Label>
          <Textarea
            id="reject-note"
            rows={3}
            className="resize-none"
            value={note}
            onChange={(e) => {
              setNote(e.target.value)
            }}
          />
          <p className="text-[11px] text-muted-foreground">
            {t("superAdmin.quotaRequests.noteRequired")}
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="destructive"
            className="gap-2"
            disabled={!note.trim() || isPending}
            onClick={submit}
          >
            <X className="size-4" />
            {t("superAdmin.quotaRequests.reject")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
