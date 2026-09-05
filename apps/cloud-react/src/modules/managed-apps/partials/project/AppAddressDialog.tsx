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
  Select,
  SelectTrigger,
  SelectValue,
} from "@datadack/common-ui"
import { AlertTriangle, Globe } from "lucide-react"
import { useTranslation } from "react-i18next"

import {
  useClearDomainRedirect,
  useDomains,
  useSetDomainRedirect,
} from "@/modules/domains/domains.hooks"
import { REDIRECT_STATUSES, type Domain } from "@/modules/domains/domains.types"
import {
  DomainBehaviorChoice,
  type DomainBehavior,
} from "@/modules/domains/partials/DomainBehaviorChoice"
import { isValidHostname, normalizeHostname } from "@/modules/domains/partials/hostname-input"
import { RedirectSettingsFields } from "@/modules/domains/partials/RedirectSettingsFields"
import { extractError } from "@/services/api/client"

import { useUpdateProjectHostname } from "../../managed-apps.hooks"
import type { Project } from "../../managed-apps.types"

const LABEL_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/
const MIN_LABEL = 3
const MAX_LABEL = 63

/** The host part of the public app URL, without guessing the platform zone. */
function appHostnameOf(project: Project): string {
  const withoutScheme = project.url.slice(project.url.indexOf("//") + 2)
  const slash = withoutScheme.indexOf("/")
  return slash === -1 ? withoutScheme : withoutScheme.slice(0, slash)
}

function appZoneOf(project: Project): string {
  const host = appHostnameOf(project)
  const prefix = project.subdomain + "."
  return host.startsWith(prefix) ? host.slice(prefix.length) : ""
}

function validateAddress(label: string): string | undefined {
  if (label === "") return "An address is required"
  if (label.length < MIN_LABEL) return `At least ${String(MIN_LABEL)} characters`
  if (label.length > MAX_LABEL) return `At most ${String(MAX_LABEL)} characters`
  if (!LABEL_RE.test(label)) {
    return "Lowercase letters, digits and hyphens, starting and ending with a letter or digit"
  }
  return undefined
}

function hostnameWithLabel(
  label: string,
  zone: string,
  currentHostname: string,
  changed: boolean,
): string {
  if (!changed || zone === "") return currentHostname
  return `${label}.${zone}`
}

function redirectFieldError(
  selfRedirect: boolean,
  touched: boolean,
  invalid: boolean,
  selfMessage: string,
  invalidMessage: string,
): string {
  if (selfRedirect) return selfMessage
  if (touched && invalid) return invalidMessage
  return ""
}

/** Edit a managed app hostname and its traffic behavior in one place. */
export function AppAddressDialog({
  project,
  domain,
  open,
  onOpenChange,
}: Readonly<{
  project: Project
  domain?: Domain | null
  open: boolean
  onOpenChange: (open: boolean) => void
}>) {
  const { t } = useTranslation()
  const [label, setLabel] = useState(project.subdomain)
  const [addressTouched, setAddressTouched] = useState(false)
  const [behavior, setBehavior] = useState<DomainBehavior>("connect")
  const [redirectTo, setRedirectTo] = useState("")
  const [redirectStatus, setRedirectStatus] = useState<number>(REDIRECT_STATUSES[0].value)
  const [dropPath, setDropPath] = useState(false)
  const [redirectTouched, setRedirectTouched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: domains } = useDomains({
    resource_type: "mgd_app_project",
    resource_id: project.id,
    limit: 50,
  })

  const {
    mutateAsync: updateHostname,
    isPending: addressPending,
    error: addressError,
    reset: resetAddress,
  } = useUpdateProjectHostname(project.id)
  const {
    mutateAsync: setRedirect,
    isPending: redirectPending,
    reset: resetRedirect,
  } = useSetDomainRedirect()
  const {
    mutateAsync: clearRedirect,
    isPending: clearPending,
    reset: resetClear,
  } = useClearDomainRedirect()

  const activeDomain =
    domain ?? domains?.rows.find((candidate) => candidate.managed && candidate.is_primary)
  const existingRedirect = activeDomain?.policy?.redirect

  useEffect(() => {
    if (!open) return
    setLabel(project.subdomain)
    setAddressTouched(false)
    setBehavior(existingRedirect ? "redirect" : "connect")
    setRedirectTo(existingRedirect?.to ?? "")
    setRedirectStatus(existingRedirect?.status ?? REDIRECT_STATUSES[0].value)
    setDropPath(existingRedirect?.drop_path ?? false)
    setRedirectTouched(false)
    resetAddress()
    resetRedirect()
    resetClear()
    inputRef.current?.focus()
  }, [
    open,
    project.subdomain,
    activeDomain?.hostname,
    existingRedirect?.to,
    existingRedirect?.status,
    existingRedirect?.drop_path,
    resetAddress,
    resetRedirect,
    resetClear,
  ])

  if (!activeDomain) return null

  const zone = appZoneOf(project)
  const normalizedLabel = label.trim().toLowerCase()
  const addressChanged = normalizedLabel !== project.subdomain
  const addressInvalid = validateAddress(normalizedLabel)
  const destination = normalizeHostname(redirectTo)
  const nextHostname = hostnameWithLabel(
    normalizedLabel,
    zone,
    activeDomain.hostname,
    addressChanged,
  )
  const selfRedirect = destination !== "" && destination === normalizeHostname(nextHostname)
  const destinationInvalid = destination !== "" && !isValidHostname(destination)
  const redirectError = redirectFieldError(
    selfRedirect,
    redirectTouched,
    destination === "" || destinationInvalid,
    t("domains.redirect.selfRedirect"),
    t("domains.redirect.invalidTo"),
  )
  const routingChanged =
    behavior === "connect"
      ? existingRedirect != null
      : existingRedirect == null ||
        destination !== normalizeHostname(existingRedirect.to) ||
        redirectStatus !== existingRedirect.status ||
        dropPath !== (existingRedirect.drop_path ?? false)
  const hasChanges = addressChanged || routingChanged
  const busy = addressPending || redirectPending || clearPending
  const serverError = addressError
    ? extractError(addressError, "Could not change the address")
    : undefined

  const submit = async () => {
    setAddressTouched(true)
    setRedirectTouched(true)
    if (busy || addressInvalid || !hasChanges) return
    if (behavior === "redirect" && (!isValidHostname(destination) || selfRedirect)) return

    try {
      let hostname = activeDomain.hostname
      if (addressChanged) {
        const updatedProject = await updateHostname({ label: normalizedLabel })
        hostname = appHostnameOf(updatedProject) || nextHostname
      }

      if (behavior === "redirect" && (routingChanged || addressChanged)) {
        await setRedirect({
          hostname,
          to: destination,
          status: redirectStatus,
          drop_path: dropPath,
        })
      } else if (behavior === "connect" && existingRedirect) {
        await clearRedirect(hostname)
      }

      onOpenChange(false)
    } catch {
      // Each mutation owns its actionable inline message or toast.
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-3 max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="size-4 text-brand-gold" />
            Edit domain
          </DialogTitle>
          <DialogDescription>
            Change this app’s platform address and choose how incoming requests are handled.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="app-address">Address</Label>
            <div className="flex items-stretch">
              <Input
                id="app-address"
                ref={inputRef}
                value={label}
                spellCheck={false}
                autoComplete="off"
                className="min-w-0 rounded-r-none font-mono"
                aria-invalid={addressTouched && addressInvalid !== undefined}
                onChange={(event) => {
                  setLabel(event.target.value)
                }}
                onBlur={() => {
                  setAddressTouched(true)
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void submit()
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
            {addressTouched && addressInvalid !== undefined && (
              <p className="text-[12px] text-status-danger">{addressInvalid}</p>
            )}
            {serverError !== undefined && (
              <p className="text-[12px] text-status-danger">{serverError}</p>
            )}
          </div>

          {addressChanged && (
            <div className="flex gap-2 rounded-md border border-status-warning/30 glass-1-bg-raised p-3">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-status-warning" />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                The old address stops working. Links, bookmarks, OAuth callbacks and webhooks
                pointing at{" "}
                <span className="font-mono text-foreground">{activeDomain.hostname}</span> need to
                be updated, and the name is released for anyone else to claim.
              </p>
            </div>
          )}

          <DomainBehaviorChoice
            value={behavior}
            onChange={(next) => {
              setBehavior(next)
              setRedirectTouched(false)
            }}
          />

          {behavior === "connect" ? (
            <div className="space-y-1.5 rounded-lg border border-border/60 glass-1-bg-raised p-3">
              <Label htmlFor="app-domain-environment">
                {t("domains.behavior.environmentLabel")}
              </Label>
              <Select value="production" disabled>
                <SelectTrigger id="app-domain-environment" className="w-full">
                  <SelectValue>{t("domains.behavior.connect.environment")}</SelectValue>
                </SelectTrigger>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                {t("domains.behavior.environmentHint")}
              </p>
            </div>
          ) : (
            <RedirectSettingsFields
              idPrefix="app-address"
              to={redirectTo}
              onToChange={(value) => {
                setRedirectTo(value)
                setRedirectTouched(false)
              }}
              status={redirectStatus}
              onStatusChange={setRedirectStatus}
              dropPath={dropPath}
              onDropPathChange={setDropPath}
              fieldError={redirectError}
              onSubmit={() => void submit()}
            />
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
            }}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            variant="gold"
            onClick={() => void submit()}
            disabled={
              busy ||
              !hasChanges ||
              addressInvalid !== undefined ||
              (behavior === "redirect" && destination === "")
            }
            loading={busy}
          >
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
