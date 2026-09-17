import { CopyButton } from "@datadack/common-ui"
import { Info } from "lucide-react"
import { useWatch, type UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { WINDOWS_ADMIN_USER } from "../../windows"
import { WindowsPasswordFields } from "../WindowsPasswordFields"
import { FieldLabel } from "./wizard.shared"
import type { FormValues } from "./wizard.types"

/** Auth step for Windows images: the Administrator password replaces the SSH key. */
export function PasswordStep({ form }: Readonly<{ form: UseFormReturn<FormValues> }>) {
  const { t } = useTranslation()
  const password = useWatch({ control: form.control, name: "admin_password" })
  const confirm = useWatch({ control: form.control, name: "admin_password_confirm" })
  const { errors, touchedFields } = form.formState

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <FieldLabel>{t("vms.windows.username", "Username")}</FieldLabel>
        <div className="text-sm">
          <CopyButton value={WINDOWS_ADMIN_USER} />
        </div>
      </div>

      <WindowsPasswordFields
        idPrefix="wizard-admin"
        password={password}
        confirm={confirm}
        onPasswordChange={(value) => {
          form.setValue("admin_password", value, { shouldValidate: true, shouldTouch: true })
          // Re-check the confirmation too: it may now match (or stop matching).
          void form.trigger("admin_password_confirm")
        }}
        onConfirmChange={(value) => {
          form.setValue("admin_password_confirm", value, {
            shouldValidate: true,
            shouldTouch: true,
          })
        }}
        passwordError={touchedFields.admin_password ? errors.admin_password?.message : undefined}
        confirmError={
          touchedFields.admin_password_confirm ? errors.admin_password_confirm?.message : undefined
        }
      />

      <div className="flex items-start gap-2 rounded-lg border border-status-info/40 bg-status-info/5 px-3 py-2.5 text-[13px] text-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0 text-status-info" />
        <span>
          {t(
            "vms.windows.saveNotice",
            "Save this password now — it is never shown again. You can set a new one later from the instance's Connect page.",
          )}
        </span>
      </div>
    </div>
  )
}
