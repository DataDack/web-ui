import { useEffect, useState, type ReactNode } from "react"

import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Textarea,
} from "@datadack/common-ui"
import { Save, TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { OptOutStatusPill } from "./OptOutStatusPill"
import { SubmittedForm } from "./SubmittedForm"
import { OPTOUT_STATUSES } from "./optout-constants"
import { useUpdateOptOutRequest } from "../../superadmin.hooks"
import type { OptOutRequest, OptOutStatus } from "../../superadmin.types"

interface Props {
  request: OptOutRequest | null
  onOpenChange: (open: boolean) => void
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
        second: "2-digit",
      })
}

/** Whole days elapsed, for the "how long has this been sitting" line. */
function daysSince(raw: string): number | null {
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return null
  return Math.floor((Date.now() - date.getTime()) / 86_400_000)
}

/**
 * The drill-in for one privacy request: what was asked, by whom, when it
 * arrived, and the controls to work it.
 *
 * Status and notes save together in one PATCH. Here that is not just
 * convenience — a rejected rights request with no recorded reason is the row
 * nobody can defend later, and two separate buttons make writing the reason the
 * step you skip.
 */
export function OptOutDetailSheet({ request, onOpenChange }: Readonly<Props>) {
  const { t } = useTranslation()
  const update = useUpdateOptOutRequest()

  const [status, setStatus] = useState<OptOutStatus>("new")
  const [notes, setNotes] = useState("")

  // Reseed the draft whenever a different row is opened. Without this the sheet
  // keeps the previous row's edits, which is how you close the wrong request.
  useEffect(() => {
    if (!request) return
    setStatus(request.status)
    setNotes(request.notes)
  }, [request])

  const dirty = !!request && (status !== request.status || notes !== request.notes)
  // Rejecting is the one transition that must carry an explanation.
  const needsReason = status === "rejected" && notes.trim() === ""
  const age = request ? daysSince(request.created_at) : null

  const save = () => {
    if (!request || needsReason) return
    update.mutate(
      { id: request.id, payload: { status, notes } },
      { onSuccess: () => { onOpenChange(false) } },
    )
  }

  return (
    <Sheet open={!!request} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-[560px] p-0 flex flex-col gap-0">
        <SheetHeader className="px-6 py-5 shrink-0">
          <SheetTitle className="flex items-center gap-2.5">
            {request ? `${request.first_name} ${request.last_name}`.trim() : ""}
            {request && <OptOutStatusPill status={request.status} />}
          </SheetTitle>
          <SheetDescription>
            {t("superAdmin.optOutRequests.unverifiedNotice")}
          </SheetDescription>
        </SheetHeader>
        <Separator />

        {request && (
          <div className="flex-1 px-6 py-5 space-y-5 overflow-y-auto">
            {/* The submission itself, verbatim and in form order. It comes first
                because it is what has to be read before anything is decided. */}
            <SubmittedForm request={request} />

            <Separator />

            {/* The three moments. This is the compliance record — how long it
                sat is the number the whole queue exists to keep small. */}
            <Row label={t("superAdmin.optOutRequests.timing")}>
              <dl className="space-y-1 text-[13px]">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">
                    {t("superAdmin.optOutRequests.columns.received")}
                  </dt>
                  <dd className="font-mono text-foreground">{formatDate(request.created_at)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">
                    {t("superAdmin.optOutRequests.firstHandled")}
                  </dt>
                  <dd className="font-mono text-foreground">{formatDate(request.handled_at)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">
                    {t("superAdmin.optOutRequests.completed")}
                  </dt>
                  <dd className="font-mono text-foreground">{formatDate(request.completed_at)}</dd>
                </div>
              </dl>
              {/* Suppressed on the day it arrives: "open for 0 days" is noise,
                  and the received timestamp above already says so. */}
              {age !== null && age > 0 && !request.completed_at && (
                <p className="pt-1 text-[12px] text-status-warning">
                  {t("superAdmin.optOutRequests.openForDays", { count: age })}
                </p>
              )}
            </Row>

            <Separator />

            <Row label={t("superAdmin.optOutRequests.columns.status")}>
              <Select
                value={status}
                onValueChange={(v) => { setStatus(v as OptOutStatus) }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPTOUT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`superAdmin.optOutRequests.status.${s}`, { defaultValue: s })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Row>

            <Row label={t("superAdmin.optOutRequests.notes")}>
              <Textarea
                value={notes}
                rows={4}
                placeholder={t("superAdmin.optOutRequests.notesPlaceholder")}
                onChange={(e) => { setNotes(e.target.value) }}
              />
              {needsReason && (
                <p className="flex items-center gap-1.5 pt-1 text-[12px] text-status-danger">
                  <TriangleAlert className="size-3.5" />
                  {t("superAdmin.optOutRequests.reasonRequired")}
                </p>
              )}
            </Row>

            <Separator />

            {/* Provenance, last and smallest — but always present. It is part of
                the record of who made the request. */}
            <div className="space-y-1 text-[11px] text-muted-foreground">
              <p className="font-mono">
                {request.source}
                {request.ip_address ? ` · ${request.ip_address}` : ""}
              </p>
              {request.user_agent && <p className="font-mono break-all">{request.user_agent}</p>}
              <p className="font-mono">{request.id}</p>
            </div>
          </div>
        )}

        <Separator />
        <div className="flex items-center justify-end gap-3 px-6 py-4 shrink-0">
          <Button variant="outline" onClick={() => { onOpenChange(false) }}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="gold"
            className="gap-2"
            disabled={!dirty || needsReason || update.isPending}
            onClick={save}
          >
            <Save className="size-4" />
            {t("common.save")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
