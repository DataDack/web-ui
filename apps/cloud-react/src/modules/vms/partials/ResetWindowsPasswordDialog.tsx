import { useState } from "react"

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@datadack/common-ui"
import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { useResetInstancePassword } from "../vms.hooks"
import { isValidWindowsPassword } from "../windows"
import { WindowsPasswordFields } from "./WindowsPasswordFields"

/** Set a new Administrator password on a Windows instance. */
export function ResetWindowsPasswordDialog({
  instanceId,
  open,
  onOpenChange,
}: Readonly<{ instanceId: string; open: boolean; onOpenChange: (open: boolean) => void }>) {
  const { t } = useTranslation()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const { mutate, isPending } = useResetInstancePassword(instanceId)

  const valid = isValidWindowsPassword(password)
  const mismatch = confirm.length > 0 && confirm !== password

  // Nothing typed here outlives the dialog.
  const close = (next: boolean) => {
    if (!next) {
      setPassword("")
      setConfirm("")
    }
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="glass-3 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("vms.windows.reset.title", "Reset Administrator password")}</DialogTitle>
          <DialogDescription>
            {t(
              "vms.windows.reset.description",
              "A running instance takes the new password immediately; a stopped one applies it when it next starts. Signed-in RDP sessions stay open.",
            )}
          </DialogDescription>
        </DialogHeader>

        <WindowsPasswordFields
          idPrefix="reset-admin"
          password={password}
          confirm={confirm}
          onPasswordChange={setPassword}
          onConfirmChange={setConfirm}
          confirmError={
            mismatch ? t("vms.windows.mismatch", "The passwords do not match") : undefined
          }
        />

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            disabled={isPending}
            onClick={() => {
              close(false)
            }}
          >
            {t("common.cancel", "Cancel")}
          </Button>
          <Button
            type="button"
            variant="gold"
            className="gap-2"
            disabled={!valid || confirm !== password || isPending}
            onClick={() => {
              mutate(password, {
                onSuccess: () => {
                  close(false)
                },
              })
            }}
          >
            {isPending && <Loader2 className="size-3.5 animate-spin" />}
            {t("vms.windows.reset.submit", "Set password")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
