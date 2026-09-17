import { useState } from "react"

import { Button, cn, CopyButton, Input } from "@datadack/common-ui"
import { Check, Eye, EyeOff, Sparkles, X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { checkWindowsPassword, generateWindowsPassword, type PasswordRule } from "../windows"

/**
 * Password + confirmation inputs with a generator and a live rule checklist.
 * Shared by the create wizard and the Connect page's reset dialog, so both hold
 * a password to exactly the rules the backend enforces.
 */
export function WindowsPasswordFields({
  password,
  confirm,
  onPasswordChange,
  onConfirmChange,
  passwordError,
  confirmError,
  idPrefix,
}: Readonly<{
  password: string
  confirm: string
  onPasswordChange: (value: string) => void
  onConfirmChange: (value: string) => void
  passwordError?: string
  confirmError?: string
  idPrefix: string
}>) {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)
  const checks = checkWindowsPassword(password)

  const ruleLabel: Record<PasswordRule, string> = {
    length: t("vms.windows.rules.length", "12–72 characters"),
    ascii: t("vms.windows.rules.ascii", "Printable ASCII only, no spaces"),
    classes: t(
      "vms.windows.rules.classes",
      "At least three of: lowercase, uppercase, digits, symbols",
    ),
    username: t("vms.windows.rules.username", "Does not contain “Administrator”"),
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor={`${idPrefix}-password`}
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {t("vms.windows.password", "Administrator password")}
          </label>
          <div className="flex items-center gap-1">
            {password && <CopyButton value={password} label="" />}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs"
              onClick={() => {
                const pw = generateWindowsPassword()
                onPasswordChange(pw)
                onConfirmChange(pw)
                setVisible(true)
              }}
            >
              <Sparkles className="size-3.5" />
              {t("vms.windows.generate", "Generate")}
            </Button>
          </div>
        </div>
        <div className="relative">
          <Input
            id={`${idPrefix}-password`}
            type={visible ? "text" : "password"}
            value={password}
            autoComplete="new-password"
            spellCheck={false}
            onChange={(e) => {
              onPasswordChange(e.target.value)
            }}
            className={cn("pr-9 font-mono", passwordError && "border-destructive")}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted-foreground hover:text-foreground"
            onClick={() => {
              setVisible((v) => !v)
            }}
            aria-label={
              visible
                ? t("vms.windows.hide", "Hide password")
                : t("vms.windows.show", "Show password")
            }
          >
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {passwordError && <p className="text-[11px] text-destructive">{passwordError}</p>}
      </div>

      <ul className="grid gap-1 sm:grid-cols-2">
        {checks.map(({ rule, ok }) => (
          <li
            key={rule}
            className={cn(
              "flex items-center gap-1.5 text-[12px]",
              ok ? "text-status-success" : "text-muted-foreground",
            )}
          >
            {ok ? <Check className="size-3.5 shrink-0" /> : <X className="size-3.5 shrink-0" />}
            {ruleLabel[rule]}
          </li>
        ))}
      </ul>

      <div className="space-y-1.5">
        <label
          htmlFor={`${idPrefix}-confirm`}
          className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {t("vms.windows.confirm", "Confirm password")}
        </label>
        <Input
          id={`${idPrefix}-confirm`}
          type={visible ? "text" : "password"}
          value={confirm}
          autoComplete="new-password"
          spellCheck={false}
          onChange={(e) => {
            onConfirmChange(e.target.value)
          }}
          className={cn("font-mono", confirmError && "border-destructive")}
        />
        {confirmError && <p className="text-[11px] text-destructive">{confirmError}</p>}
      </div>
    </div>
  )
}
