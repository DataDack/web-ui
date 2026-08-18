import { Badge, Switch, cn } from "@datadack/common-ui"

import { FieldRow } from "@/components/console"

interface PreviewEnvironmentFieldProps {
  enabled: boolean
  onChange: (enabled: boolean) => void
  disabled?: boolean
  className?: string
}

/**
 * Whether this project has a preview environment at all.
 *
 * Environment variables carry targets — production, preview, or both — and this
 * is the switch those targets hang off. Without it the editor would offer to
 * scope a variable to a deployment the project never opted into, which is a
 * control that looks like it does something and cannot.
 *
 * The description states the current limit rather than hiding it: nothing
 * deploys to preview yet, so what turning this on buys today is the scoping —
 * a preview-only variable is genuinely withheld from the production build and
 * the container that serves it, not merely labelled.
 */
export function PreviewEnvironmentField({
  enabled,
  onChange,
  disabled = false,
  className,
}: Readonly<PreviewEnvironmentFieldProps>) {
  return (
    <FieldRow
      label="Preview environment"
      className={className}
      description={
        enabled
          ? "Variables can be scoped to production, preview, or both. No preview deployment runs yet, so a preview-only variable is withheld from the production build until one does."
          : "Off — this project has one deployment, and every variable applies to it. Turn this on to scope variables to a preview environment separately."
      }
      aside={
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "font-mono text-[10px] tracking-wide uppercase",
              enabled ? "border-status-info/30 text-status-info" : "text-muted-foreground",
            )}
          >
            {enabled ? "On" : "Off"}
          </Badge>
          <Switch
            checked={enabled}
            disabled={disabled}
            aria-label="Preview environment"
            onCheckedChange={onChange}
          />
        </div>
      }
    >
      {/* The switch is the control; FieldRow wants a body, and a second copy
			    of the same state under it would be noise. */}
      <span className="sr-only">
        {enabled ? "Preview environment is on" : "Preview environment is off"}
      </span>
    </FieldRow>
  )
}
