import { Badge, Card, cn, Switch } from "@datadack/common-ui"
import { Lock, type LucideIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

interface GateCardProps {
  icon: LucideIcon
  title: string
  description: string
  /** What the backend is ACTUALLY enforcing — not the stored override. */
  enforced: boolean
  /** True when an override is stored; false when the value is inherited. */
  overridden: boolean
  /** Human label for what an unset override resolves to on this deployment. */
  inheritedLabel: string
  /** What turning this gate OFF means for tenants, in one line. */
  offConsequence: string
  /** Set when the gate cannot be turned on at all; explains why, and locks it. */
  lockedReason?: string
  pending: boolean
  /**
   * Enabling and disabling are separate callbacks rather than one
   * onChange(boolean) because the page treats them as different operations:
   * enabling tightens the platform and applies immediately, disabling opens it
   * up and has to be confirmed. Collapsing them into a flag would push that
   * distinction into the caller and hide it from this component's contract.
   */
  onEnable: () => void
  onDisable: () => void
}

/**
 * One platform gate, as a switch with its consequences spelled out.
 *
 * Three facts are shown rather than one, because they can legitimately
 * disagree: what is being ENFORCED (the switch and the status pill), whether
 * that came from an override or the deployment default (the badge), and what
 * happens to tenants when it is off (the consequence line). A card that showed
 * only the stored override would report a gate as off while the backend is
 * still enforcing it, which is precisely the confusion this page exists to end.
 *
 * When the gate cannot be enabled at all — no KYC service is configured, so
 * nobody could ever complete verification — the switch is rendered LOCKED with
 * the reason rather than hidden. Hiding it leaves an operator hunting for a
 * control that is deliberately unavailable, and the backend would answer 409
 * anyway.
 */
export function GateCard({
  icon: Icon,
  title,
  description,
  enforced,
  overridden,
  inheritedLabel,
  offConsequence,
  lockedReason,
  pending,
  onEnable,
  onDisable,
}: Readonly<GateCardProps>) {
  const { t } = useTranslation()
  const locked = Boolean(lockedReason)

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-md border",
              enforced
                ? "border-status-success/30 bg-status-success/10 text-status-success"
                : "border-border/60 bg-muted/40 text-muted-foreground",
            )}
          >
            <Icon className="size-4" />
          </div>

          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
              <Badge
                variant="outline"
                className={cn(
                  "font-mono text-[10px] tracking-wide uppercase",
                  enforced
                    ? "border-status-success/30 text-status-success"
                    : "border-status-warning/30 text-status-warning",
                )}
              >
                {enforced
                  ? t("superAdmin.platformSettings.state.enforced")
                  : t("superAdmin.platformSettings.state.notEnforced")}
              </Badge>
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                {overridden
                  ? t("superAdmin.platformSettings.source.overridden")
                  : t("superAdmin.platformSettings.source.inherited", { value: inheritedLabel })}
              </Badge>
            </div>

            <p className="text-[13px] text-muted-foreground">{description}</p>

            {/* Only shown while the gate is off: the consequence is a warning
			          about the state tenants are actually in, not a preview of
			          what a click would do. */}
            {!enforced && !locked && (
              <p className="text-[13px] text-status-warning">{offConsequence}</p>
            )}

            {locked && (
              <p className="flex items-start gap-1.5 text-[13px] text-muted-foreground">
                <Lock className="mt-0.5 size-3.5 shrink-0" />
                <span>{lockedReason}</span>
              </p>
            )}
          </div>
        </div>

        <Switch
          checked={enforced}
          disabled={pending || locked}
          aria-label={title}
          onCheckedChange={(checked) => {
            if (checked) onEnable()
            else onDisable()
          }}
        />
      </div>
    </Card>
  )
}
