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
import { Mail, Save } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ContactStatusPill } from "./ContactStatusPill"
import { CONTACT_STATUSES } from "./contact-constants"
import { useUpdateContactSubmission } from "../../superadmin.hooks"
import type { ContactSubmission, ContactSubmissionStatus } from "../../superadmin.types"

interface Props {
  submission: ContactSubmission | null
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
      })
}

/**
 * The drill-in for one contact submission: the full message (the table clamps it
 * to two lines), the context the visitor gave, and the triage controls.
 *
 * Status and notes save together in one PATCH. They are the two halves of the
 * same act — "I replied, here is what I said" — and splitting them into two
 * buttons invites a status change that loses the note explaining it.
 */
export function ContactDetailSheet({ submission, onOpenChange }: Readonly<Props>) {
  const { t } = useTranslation()
  const update = useUpdateContactSubmission()

  const [status, setStatus] = useState<ContactSubmissionStatus>("new")
  const [notes, setNotes] = useState("")

  // Reseed the draft whenever a different row is opened. Without this the sheet
  // keeps the previous row's edits, which is how you mark the wrong lead spam.
  useEffect(() => {
    if (!submission) return
    setStatus(submission.status)
    setNotes(submission.notes)
  }, [submission])

  const dirty =
    !!submission && (status !== submission.status || notes !== submission.notes)

  const save = () => {
    if (!submission) return
    update.mutate(
      { id: submission.id, payload: { status, notes } },
      { onSuccess: () => { onOpenChange(false) } },
    )
  }

  return (
    <Sheet open={!!submission} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-[520px] p-0 flex flex-col gap-0">
        <SheetHeader className="px-6 py-5 shrink-0">
          <SheetTitle className="flex items-center gap-2.5">
            {submission?.name}
            {submission && <ContactStatusPill status={submission.status} />}
          </SheetTitle>
          <SheetDescription className="font-mono text-[12px]">
            {submission?.company || t("superAdmin.contactSubmissions.noCompany")}
          </SheetDescription>
        </SheetHeader>
        <Separator />

        {submission && (
          <div className="flex-1 px-6 py-5 space-y-5 overflow-y-auto">
            <Row label={t("superAdmin.contactSubmissions.columns.email")}>
              {/* Linked, not just shown: replying is the action this whole queue
                  exists to produce, so it is one click from here. */}
              <a
                href={`mailto:${submission.email}`}
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <Mail className="size-3.5" />
                {submission.email}
              </a>
            </Row>

            <div className="grid grid-cols-2 gap-5">
              <Row label={t("superAdmin.contactSubmissions.columns.teamSize")}>
                <p className="text-sm text-foreground">{submission.team_size || "—"}</p>
              </Row>
              <Row label={t("superAdmin.contactSubmissions.columns.useCase")}>
                <p className="text-sm text-foreground">{submission.use_case || "—"}</p>
              </Row>
            </div>

            <Row label={t("superAdmin.contactSubmissions.columns.message")}>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {submission.message || "—"}
              </p>
            </Row>

            <Separator />

            <Row label={t("superAdmin.contactSubmissions.columns.status")}>
              <Select
                value={status}
                onValueChange={(v) => { setStatus(v as ContactSubmissionStatus) }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`superAdmin.contactSubmissions.status.${s}`, { defaultValue: s })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Row>

            <Row label={t("superAdmin.contactSubmissions.notes")}>
              <Textarea
                value={notes}
                rows={4}
                placeholder={t("superAdmin.contactSubmissions.notesPlaceholder")}
                onChange={(e) => { setNotes(e.target.value) }}
              />
            </Row>

            <Separator />

            {/* Provenance, last and smallest. It matters when a row looks like
                junk and nowhere else. */}
            <div className="space-y-1 text-[11px] text-muted-foreground">
              <p>
                {t("superAdmin.contactSubmissions.columns.received")}:{" "}
                {formatDate(submission.created_at)}
              </p>
              {submission.handled_at && (
                <p>
                  {t("superAdmin.contactSubmissions.firstHandled")}:{" "}
                  {formatDate(submission.handled_at)}
                </p>
              )}
              <p className="font-mono">
                {submission.source}
                {submission.ip_address ? ` · ${submission.ip_address}` : ""}
              </p>
              {submission.user_agent && (
                <p className="font-mono break-all">{submission.user_agent}</p>
              )}
            </div>
          </div>
        )}

        <Separator />
        <div className="flex items-center justify-end gap-3 px-6 py-4 shrink-0">
          <Button
            variant="outline"
            onClick={() => { onOpenChange(false) }}
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="gold"
            className="gap-2"
            disabled={!dirty || update.isPending}
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
