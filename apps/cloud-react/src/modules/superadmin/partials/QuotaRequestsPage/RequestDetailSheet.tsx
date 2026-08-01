import type { ReactNode } from "react"

import { ArrowRight, Check, X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

import { RequestStatusPill } from "./RequestStatusPill"
import type { AdminQuotaRequest } from "../../superadmin.types"

interface Props {
  request: AdminQuotaRequest | null
  onOpenChange: (open: boolean) => void
  onApprove: (request: AdminQuotaRequest) => void
  onReject: (request: AdminQuotaRequest) => void
}

function Row({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">{label}</p>
      {children}
    </div>
  )
}

function formatDate(raw?: string | null): string {
  if (!raw) return "—"
  const date = new Date(raw)
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
}

// Read-only drill-in for one request: the full justification (the table clamps
// it to two lines) plus the review trail, with approve/reject at hand while
// the request is still pending.
export function RequestDetailSheet({
  request,
  onOpenChange,
  onApprove,
  onReject,
}: Readonly<Props>) {
  const { t } = useTranslation()

  return (
    <Sheet open={!!request} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-[480px] p-0 flex flex-col gap-0">
        <SheetHeader className="px-6 py-5 shrink-0">
          <SheetTitle className="flex items-center gap-2.5">
            {request?.quota_name}
            {request && <RequestStatusPill status={request.status} />}
          </SheetTitle>
          <SheetDescription className="font-mono text-[12px]">
            {request?.quota_code}
          </SheetDescription>
        </SheetHeader>
        <Separator />

        {request && (
          <div className="flex-1 px-6 py-5 space-y-5 overflow-y-auto">
            <Row label={t("superAdmin.quotaRequests.columns.change")}>
              <span className="flex items-center gap-1.5 font-mono text-[15px] tabular-nums text-foreground">
                {request.current_limit}
                <ArrowRight className="size-3.5 text-muted-foreground" />
                <span className="font-medium">{request.requested_limit}</span>
              </span>
            </Row>

            <Row label={t("superAdmin.quotaRequests.columns.account")}>
              <p className="text-sm text-foreground">{request.account_name || "—"}</p>
              {request.account_number && (
                <p className="font-mono text-[11px] text-muted-foreground">
                  {request.account_number}
                </p>
              )}
            </Row>

            <Row label={t("superAdmin.quotaRequests.columns.requester")}>
              <p className="text-sm text-foreground">{request.requested_by_name || "—"}</p>
              <p className="text-[12px] text-muted-foreground">{request.requested_by_email}</p>
            </Row>

            <Row label={t("superAdmin.quotaRequests.columns.age")}>
              <p className="font-mono text-[12px] text-muted-foreground">
                {formatDate(request.created_at)}
              </p>
            </Row>

            <Row label={t("superAdmin.quotaRequests.columns.justification")}>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {request.justification || "—"}
              </p>
            </Row>

            {request.status !== "pending" && (
              <Row label={t("superAdmin.quotaRequests.note")}>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {request.review_note || "—"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {request.reviewed_by_email}
                  {request.reviewed_at ? ` · ${formatDate(request.reviewed_at)}` : ""}
                </p>
              </Row>
            )}
          </div>
        )}

        {request?.status === "pending" && (
          <>
            <Separator />
            <div className="flex items-center justify-end gap-3 px-6 py-4 shrink-0">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  onReject(request)
                }}
              >
                <X className="size-4 text-status-danger" />
                {t("superAdmin.quotaRequests.reject")}
              </Button>
              <Button
                variant="gold"
                className="gap-2"
                onClick={() => {
                  onApprove(request)
                }}
              >
                <Check className="size-4" />
                {t("superAdmin.quotaRequests.approve")}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
