import { useEffect, useRef, useState } from "react"

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
} from "@datadack/common-ui"
import { AlertTriangle, Globe } from "lucide-react"

import { extractError } from "@/services/api/client"

import { useUpdateProjectHostname } from "../../managed-apps.hooks"
import type { Project } from "../../managed-apps.types"

// Client-side sanity only — the server owns the real rules (the reserved list,
// and whether anyone else already holds the name). Kept in step with the label
// rules in cloud-be-go's projects_hostname.go so the obvious mistakes are caught
// without a round trip and nothing else is refused here.
const LABEL_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/
const MIN_LABEL = 3
const MAX_LABEL = 63

/**
 * The platform zone this app's address sits under, derived from the URL the API
 * already returns rather than from a second copy of the setting.
 *
 * Sliced rather than matched: the URL is a plain origin, and a pattern for the
 * path would be one more regular expression over customer-influenced text for
 * no gain.
 *
 * Falls back to an empty suffix rather than guessing: with no zone to show, the
 * input is still a valid label field, which is better than rendering somebody
 * else's domain beside it.
 */
function appZoneOf(project: Project): string {
  const withoutScheme = project.url.slice(project.url.indexOf("//") + 2)
  const slash = withoutScheme.indexOf("/")
  const host = slash === -1 ? withoutScheme : withoutScheme.slice(0, slash)
  const prefix = project.subdomain + "."
  return host.startsWith(prefix) ? host.slice(prefix.length) : ""
}

function validate(label: string, current: string): string | undefined {
  if (label === "") return "An address is required"
  if (label === current) return "This is already the app's address"
  if (label.length < MIN_LABEL) return `At least ${String(MIN_LABEL)} characters`
  if (label.length > MAX_LABEL) return `At most ${String(MAX_LABEL)} characters`
  if (!LABEL_RE.test(label)) {
    return "Lowercase letters, digits and hyphens, starting and ending with a letter or digit"
  }
  return undefined
}

/**
 * Change the platform-provided address an app answers on.
 *
 * A move, not an alias — which is the whole reason this is a dialog with a
 * warning in it rather than an editable cell. The old hostname stops resolving
 * as soon as the registry catches up (seconds), and the platform keeps no
 * redirect from it: anything that was pointing at the old address has to be
 * changed. A customer who needs the old name to keep answering wants a custom
 * domain, and the same tab is where they add one.
 *
 * The mutation's error is rendered inline instead of toasted. The likely failure
 * is a name somebody else holds, and that is fixed in the input the customer is
 * still looking at.
 */
export function AppAddressDialog({
  project,
  open,
  onOpenChange,
}: Readonly<{
  project: Project
  open: boolean
  onOpenChange: (open: boolean) => void
}>) {
  const [label, setLabel] = useState(project.subdomain)
  const [touched, setTouched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { mutate, isPending, error, reset } = useUpdateProjectHostname(project.id)

  // Every open starts from the address the app currently has, so a dialog
  // reopened after a cancel never carries the abandoned draft. Focus is moved
  // here rather than with autoFocus, which fires on mount whether or not the
  // dialog is the thing that just opened.
  useEffect(() => {
    if (open) {
      setLabel(project.subdomain)
      setTouched(false)
      reset()
      inputRef.current?.focus()
    }
  }, [open, project.subdomain, reset])

  const zone = appZoneOf(project)
  const invalid = validate(label.trim().toLowerCase(), project.subdomain)
  const serverError = error ? extractError(error, "Could not change the address") : undefined

  const submit = () => {
    setTouched(true)
    if (invalid) return
    mutate(
      { label: label.trim().toLowerCase() },
      {
        onSuccess: () => {
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="size-4 text-brand-gold" />
            Change address
          </DialogTitle>
          <DialogDescription>
            The name this app answers on{zone ? ` under ${zone}` : ""}. Custom domains attached to
            it are not affected.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="app-address">New address</Label>
            <div className="flex items-stretch">
              <Input
                id="app-address"
                ref={inputRef}
                value={label}
                spellCheck={false}
                autoComplete="off"
                className="min-w-0 rounded-r-none font-mono"
                aria-invalid={touched && invalid !== undefined}
                onChange={(event) => {
                  setLabel(event.target.value)
                }}
                onBlur={() => {
                  setTouched(true)
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") submit()
                }}
              />
              {zone !== "" && (
                <span className="flex shrink-0 items-center whitespace-nowrap rounded-r-md border border-l-0 border-border glass-1-bg-raised px-3 font-mono text-[12px] text-muted-foreground">
                  .{zone}
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Lowercase letters, digits and hyphens. Currently{" "}
              <span className="font-mono text-foreground">{project.subdomain}</span>.
            </p>
            {touched && invalid !== undefined && (
              <p className="text-[11px] text-status-danger">{invalid}</p>
            )}
            {serverError !== undefined && (
              <p className="text-[11px] text-status-danger">{serverError}</p>
            )}
          </div>

          <div className="flex gap-2 rounded-md border border-status-warning/30 glass-1-bg-raised p-3">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-status-warning" />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              The old address stops working. Links, bookmarks, OAuth callbacks and webhooks pointing
              at{" "}
              <span className="font-mono text-foreground">
                {project.subdomain}
                {zone ? `.${zone}` : ""}
              </span>{" "}
              need to be updated, and the name is released for anyone else to claim.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
            }}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button variant="gold" onClick={submit} disabled={isPending || invalid !== undefined}>
            {isPending ? "Changing…" : "Change address"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
