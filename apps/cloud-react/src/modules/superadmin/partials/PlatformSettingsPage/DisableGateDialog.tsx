import { useEffect, useState } from "react"

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
} from "@datadack/common-ui"
import { Loader2, TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

interface DisableGateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  /** What tenants will be able to do once this gate is off. */
  consequence: string
  pending: boolean
  onConfirm: (reason: string) => void
}

/**
 * Confirmation for turning a platform gate OFF, with a reason.
 *
 * Only the off direction stops for this. Turning a gate on tightens the
 * platform and is safely reversible; turning one off lets every tenant past a
 * compliance or authorization check, and the backend records the operator, the
 * change and the reason on one audit line — an override with no trail is
 * indistinguishable from a compromise.
 *
 * The reason is optional rather than enforced: a required field here would be
 * satisfied with "x" under time pressure, which is worse than an honest blank.
 */
export function DisableGateDialog({
  open,
  onOpenChange,
  title,
  consequence,
  pending,
  onConfirm,
}: Readonly<DisableGateDialogProps>) {
  const { t } = useTranslation()
  const [reason, setReason] = useState("")

  // Clear between openings so a reason typed for one gate cannot be submitted
  // against the other.
  useEffect(() => {
    if (!open) setReason("")
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md glass-3">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TriangleAlert className="size-4 text-destructive" />
            {title}
          </DialogTitle>
          <DialogDescription>{consequence}</DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="gate-disable-reason">
            {t("superAdmin.platformSettings.disable.reasonLabel")}
          </Label>
          <Textarea
            id="gate-disable-reason"
            value={reason}
            rows={3}
            maxLength={512}
            placeholder={t("superAdmin.platformSettings.disable.reasonPlaceholder")}
            onChange={(event) => {
              setReason(event.target.value)
            }}
          />
          <p className="text-[11px] text-muted-foreground">
            {t("superAdmin.platformSettings.disable.reasonHint")}
          </p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => {
              onOpenChange(false)
            }}
          >
            {t("console.confirm.cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            className={pending ? "gap-2" : undefined}
            onClick={() => {
              onConfirm(reason.trim())
            }}
          >
            {pending && <Loader2 className="size-3.5 animate-spin" />}
            {t("superAdmin.platformSettings.disable.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
