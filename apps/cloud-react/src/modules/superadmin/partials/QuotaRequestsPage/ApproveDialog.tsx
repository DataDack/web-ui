import { useState } from "react"

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Textarea,
} from "@datadack/common-ui"
import { ArrowRight, Check, Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Field } from "../../components/form-fields"
import { useApproveQuotaRequest } from "../../superadmin.hooks"
import type { AdminQuotaRequest } from "../../superadmin.types"

interface Props {
  request: AdminQuotaRequest | null
  onOpenChange: (open: boolean) => void
}

// Keyed on the request id by the parent dialog so every opening starts from a
// fresh form seeded with the requested limit.
function ApproveForm({
  request,
  onOpenChange,
}: Readonly<{ request: AdminQuotaRequest; onOpenChange: (open: boolean) => void }>) {
  const { t } = useTranslation()
  const { mutate: approve, isPending } = useApproveQuotaRequest()

  const [grantedLimit, setGrantedLimit] = useState(String(request.requested_limit))
  const [note, setNote] = useState("")

  const parsed = Number(grantedLimit)
  const invalid = grantedLimit.trim() === "" || !Number.isInteger(parsed) || parsed < 1

  const submit = () => {
    if (invalid) return
    approve(
      {
        id: request.id,
        payload: {
          // Only send a granted_limit that differs from the ask — nil
          // means "grant exactly what was requested" on the backend.
          ...(parsed === request.requested_limit ? {} : { granted_limit: parsed }),
          ...(note.trim() ? { note: note.trim() } : {}),
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <>
      <div className="flex items-center justify-between rounded-lg border border-border-glass bg-muted/30 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{request.quota_name}</p>
          <p className="truncate font-mono text-[11px] text-muted-foreground">
            {request.quota_code}
          </p>
        </div>
        <span className="flex items-center gap-1.5 font-mono text-[13px] tabular-nums text-foreground">
          {request.current_limit}
          <ArrowRight className="size-3 text-muted-foreground" />
          {request.requested_limit}
        </span>
      </div>

      <div className="flex flex-col gap-5">
        <Field label={t("superAdmin.quotaRequests.grantedLimit")} required>
          <Input
            type="number"
            min={1}
            className="font-mono tabular-nums"
            value={grantedLimit}
            onChange={(e) => {
              setGrantedLimit(e.target.value)
            }}
          />
        </Field>

        <Field label={t("superAdmin.quotaRequests.noteOptional")}>
          <Textarea
            rows={2}
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
          <Button type="button" disabled={isPending || invalid} className="gap-2" onClick={submit}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {t("superAdmin.quotaRequests.approve")}
          </Button>
        </div>
      </div>
    </>
  )
}

// Approve dialog: the granted limit is prefilled with what was asked, so the
// common path is a single click — but the reviewer can grant a different
// (usually lower) figure, with an optional note back to the customer.
export function ApproveDialog({ request, onOpenChange }: Readonly<Props>) {
  const { t } = useTranslation()

  return (
    <Dialog open={!!request} onOpenChange={onOpenChange}>
      <DialogContent className="glass-3 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="size-4 text-status-success" />
            {t("superAdmin.quotaRequests.approveTitle")}
          </DialogTitle>
          <DialogDescription>{t("superAdmin.quotaRequests.approveDescription")}</DialogDescription>
        </DialogHeader>

        {request && <ApproveForm key={request.id} request={request} onOpenChange={onOpenChange} />}
      </DialogContent>
    </Dialog>
  )
}
