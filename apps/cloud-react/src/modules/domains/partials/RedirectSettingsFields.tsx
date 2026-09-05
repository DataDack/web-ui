import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from "@datadack/common-ui"
import { useTranslation } from "react-i18next"

import { REDIRECT_STATUSES } from "../domains.types"

/** The destination-specific half of domain configuration, shared by add/edit. */
export function RedirectSettingsFields({
  idPrefix,
  to,
  onToChange,
  status,
  onStatusChange,
  dropPath,
  onDropPathChange,
  fieldError = "",
  onSubmit,
}: Readonly<{
  idPrefix: string
  to: string
  onToChange: (value: string) => void
  status: number
  onStatusChange: (value: number) => void
  dropPath: boolean
  onDropPathChange: (value: boolean) => void
  fieldError?: string
  onSubmit?: () => void
}>) {
  const { t } = useTranslation()
  const destination = to.trim() === "" ? "example.com" : to.trim()
  const destinationId = `${idPrefix}-redirect-to`
  const statusId = `${idPrefix}-redirect-status`

  return (
    <div className="space-y-4 rounded-lg border border-border/60 glass-1-bg-raised p-3">
      <div className="space-y-1.5">
        <Label htmlFor={destinationId}>{t("domains.redirect.toLabel")}</Label>
        <Input
          id={destinationId}
          value={to}
          placeholder="example.com"
          spellCheck={false}
          autoComplete="off"
          className="font-mono"
          aria-invalid={fieldError !== ""}
          onChange={(event) => {
            onToChange(event.target.value)
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") onSubmit?.()
          }}
        />
        {fieldError === "" ? (
          <p className="text-[11px] text-muted-foreground">{t("domains.redirect.toHint")}</p>
        ) : (
          <p className="text-[12px] text-destructive">{fieldError}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={statusId}>{t("domains.redirect.statusLabel")}</Label>
        <Select
          value={String(status)}
          onValueChange={(value) => {
            onStatusChange(Number(value))
          }}
        >
          <SelectTrigger id={statusId} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REDIRECT_STATUSES.map((option) => (
              <SelectItem key={option.value} value={String(option.value)}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground">
          {REDIRECT_STATUSES.find((option) => option.value === status)?.hint}
        </p>
      </div>

      <div className="flex items-start justify-between gap-4 rounded-md border border-border/60 p-3">
        <div className="min-w-0">
          <p className="text-[13px] text-foreground">{t("domains.redirect.dropPathLabel")}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {dropPath
              ? t("domains.redirect.dropPathOn")
              : t("domains.redirect.dropPathOff", { host: destination })}
          </p>
        </div>
        <Switch
          checked={dropPath}
          onCheckedChange={onDropPathChange}
          aria-label={t("domains.redirect.dropPathLabel")}
        />
      </div>
    </div>
  )
}
