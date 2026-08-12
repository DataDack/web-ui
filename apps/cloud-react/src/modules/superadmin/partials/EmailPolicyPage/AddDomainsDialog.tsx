import { useEffect, useMemo, useState } from "react"

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
} from "@datadack/common-ui"
import { Loader2, ShieldBan } from "lucide-react"
import { useTranslation } from "react-i18next"

interface AddDomainsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pending: boolean
  /** Existing accounts per domain, so the dialog can warn before the write. */
  usersByDomain: Map<string, number>
  onSubmit: (domains: string[], reason: string) => void
}

/**
 * Block one domain, or fifty.
 *
 * The input is a textarea rather than a single field because the realistic task
 * is pasting a list somebody collected — from a signup log, from a public
 * disposable-domain list — and twenty round trips for twenty domains is twenty
 * chances for half of them to land.
 *
 * It warns when a pasted domain already has accounts behind it. Blocking never
 * signs anyone out (the gate only refuses NEW accounts), but "gmail.com" pasted
 * by accident is a mistake worth catching before it is written, not after.
 */
export function AddDomainsDialog({
  open,
  onOpenChange,
  pending,
  usersByDomain,
  onSubmit,
}: Readonly<AddDomainsDialogProps>) {
  const { t } = useTranslation()
  const [raw, setRaw] = useState("")
  const [reason, setReason] = useState("")

  useEffect(() => {
    if (!open) {
      setRaw("")
      setReason("")
    }
  }, [open])

  // Split on anything a pasted list plausibly uses as a separator: newlines,
  // commas, semicolons, spaces.
  const domains = useMemo(
    () =>
      Array.from(
        new Set(
          raw
            .split(/[\s,;]+/)
            .map((d) => d.trim().toLowerCase())
            .filter(Boolean),
        ),
      ),
    [raw],
  )

  const withUsers = useMemo(
    () =>
      domains
        .map((d) => ({ domain: d, users: usersByDomain.get(d) ?? 0 }))
        .filter((d) => d.users > 0),
    [domains, usersByDomain],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg glass-3">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldBan className="size-4" />
            {t("superAdmin.emailPolicy.add.title")}
          </DialogTitle>
          <DialogDescription>{t("superAdmin.emailPolicy.add.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="blocked-domains">{t("superAdmin.emailPolicy.add.domainsLabel")}</Label>
          <Textarea
            id="blocked-domains"
            value={raw}
            rows={5}
            placeholder={t("superAdmin.emailPolicy.add.domainsPlaceholder")}
            spellCheck={false}
            autoComplete="off"
            onChange={(event) => {
              setRaw(event.target.value)
            }}
          />
          <p className="text-[11px] text-muted-foreground">
            {t("superAdmin.emailPolicy.add.domainsHint", { count: domains.length })}
          </p>
        </div>

        {withUsers.length > 0 && (
          <div className="rounded-md border border-status-warning/30 bg-status-warning/5 p-3">
            <p className="text-[12px] text-status-warning">
              {t("superAdmin.emailPolicy.add.hasUsersWarning", { count: withUsers.length })}
            </p>
            <ul className="mt-1.5 space-y-0.5">
              {withUsers.slice(0, 5).map((d) => (
                <li key={d.domain} className="font-mono text-[11px] text-muted-foreground">
                  {d.domain} · {t("superAdmin.emailPolicy.usersCount", { count: d.users })}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="blocked-domains-reason">
            {t("superAdmin.emailPolicy.add.reasonLabel")}
          </Label>
          <Input
            id="blocked-domains-reason"
            value={reason}
            maxLength={512}
            placeholder={t("superAdmin.emailPolicy.add.reasonPlaceholder")}
            onChange={(event) => {
              setReason(event.target.value)
            }}
          />
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
            disabled={pending || domains.length === 0}
            className={pending ? "gap-2" : undefined}
            onClick={() => {
              onSubmit(domains, reason.trim())
            }}
          >
            {pending && <Loader2 className="size-3.5 animate-spin" />}
            {t("superAdmin.emailPolicy.add.confirm", { count: domains.length })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
