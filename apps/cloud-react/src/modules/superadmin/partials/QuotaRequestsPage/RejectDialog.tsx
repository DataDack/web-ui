import { useState } from "react"

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Textarea,
} from "@datadack/common-ui"
import { Loader2, X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Field } from "../../components/form-fields"
import { useRejectQuotaRequest } from "../../superadmin.hooks"
import type { AdminQuotaRequest } from "../../superadmin.types"

interface Props {
  request: AdminQuotaRequest | null
  onOpenChange: (open: boolean) => void
}

// Keyed on the request id by the parent dialog so every opening starts blank.
function RejectForm({
  request,
  onOpenChange,
}: Readonly<{ request: AdminQuotaRequest; onOpenChange: (open: boolean) => void }>) {
  const { t } = useTranslation()
  const { mutate: reject, isPending } = useRejectQuotaRequest()

  const [note, setNote] = useState("")

  const submit = () => {
    if (!note.trim()) return
    reject(
      { id: request.id, payload: { note: note.trim() } },
      {
        onSuccess: () => {
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <>
      <div className="rounded-lg border border-border-glass bg-muted/30 px-4 py-3">
        <p className="truncate text-sm font-medium text-foreground">{request.quota_name}</p>
        <p className="truncate font-mono text-[11px] text-muted-foreground">
          {request.account_name || request.requested_by_email}
        </p>
      </div>

      <div className="flex flex-col gap-5">
        <Field
          label={t("superAdmin.quotaRequests.note")}
          required
          hint={t("superAdmin.quotaRequests.noteRequired")}
        >
          <Textarea
            rows={3}
            value={note}
            onChange={(e) => {
              setNote(e.target.value)
            }}
          />
        </Field>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={isPending}
            onClick={() => {
              onOpenChange(false)
            }}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending || !note.trim()}
            className="gap-2"
            onClick={submit}
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {t("superAdmin.quotaRequests.reject")}
          </Button>
        </div>
      </div>
    </>
  )
}

// Reject dialog: the note is mandatory — it is the only feedback the customer
// gets on their Requests tab, so a silent rejection is never allowed.
export function RejectDialog({ request, onOpenChange }: Readonly<Props>) {
  const { t } = useTranslation()

  return (
    <Dialog open={!!request} onOpenChange={onOpenChange}>
      <DialogContent className="glass-3 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <X className="size-4 text-status-danger" />
            {t("superAdmin.quotaRequests.rejectTitle")}
          </DialogTitle>
          <DialogDescription>{t("superAdmin.quotaRequests.rejectDescription")}</DialogDescription>
        </DialogHeader>

        {request && <RejectForm key={request.id} request={request} onOpenChange={onOpenChange} />}
      </DialogContent>
    </Dialog>
  )
}
