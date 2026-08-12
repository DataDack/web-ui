import { useState } from "react"

import { Badge, Button, Card, Input, cn } from "@datadack/common-ui"
import { ArrowRight, FlaskConical, Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import type { EmailPolicyCheck } from "../../superadmin.types"

interface CheckAddressCardProps {
  pending: boolean
  result: EmailPolicyCheck | null
  onCheck: (email: string) => void
}

/** Colour per outcome — blocked reads as a refusal, rewritten as a change. */
const outcomeTone: Record<EmailPolicyCheck["outcome"], string> = {
  allowed: "border-status-success/30 text-status-success",
  rewritten: "border-status-info/30 text-status-info",
  allowed_existing: "border-status-warning/30 text-status-warning",
  blocked: "border-destructive/30 text-destructive",
}

/**
 * Dry-run one address against the live policy.
 *
 * Without this, "would this address be able to sign up" is only answerable by
 * trying it — which an operator cannot do with a customer's address, and which
 * would burn an OTP if they did. It reads; it creates nothing and sends
 * nothing.
 */
export function CheckAddressCard({ pending, result, onCheck }: Readonly<CheckAddressCardProps>) {
  const { t } = useTranslation()
  const [email, setEmail] = useState("")

  const submit = () => {
    const value = email.trim()
    if (value !== "") onCheck(value)
  }

  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/40 text-muted-foreground">
          <FlaskConical className="size-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">
              {t("superAdmin.emailPolicy.check.title")}
            </h3>
            <p className="text-[13px] text-muted-foreground">
              {t("superAdmin.emailPolicy.check.description")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={email}
              type="email"
              spellCheck={false}
              autoComplete="off"
              className="h-9 max-w-xs"
              placeholder={t("superAdmin.emailPolicy.check.placeholder")}
              onChange={(event) => {
                setEmail(event.target.value)
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") submit()
              }}
            />
            <Button
              type="button"
              variant="outline"
              disabled={pending || email.trim() === ""}
              onClick={submit}
            >
              {pending && <Loader2 className="size-3.5 animate-spin" />}
              {t("superAdmin.emailPolicy.check.action")}
            </Button>
          </div>

          {result && (
            <div className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn("font-mono text-[10px] uppercase", outcomeTone[result.outcome])}
                >
                  {t(`superAdmin.emailPolicy.check.outcomes.${result.outcome}`)}
                </Badge>
                {result.matched_domain && (
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {t("superAdmin.emailPolicy.check.matched", { domain: result.matched_domain })}
                  </span>
                )}
              </div>

              {/* The rewrite is shown as a transformation, because the address
			          on the right is the one that would be created and mailed. */}
              <div className="flex flex-wrap items-center gap-2 font-mono text-[12px]">
                <span className="text-muted-foreground">{result.original}</span>
                {result.rewritten && (
                  <>
                    <ArrowRight className="size-3.5 text-muted-foreground" />
                    <span className="text-foreground">{result.email}</span>
                  </>
                )}
              </div>

              <p className="text-[12px] text-muted-foreground">
                {t(`superAdmin.emailPolicy.check.explain.${result.outcome}`)}
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
