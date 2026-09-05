import { Button, DialogFooter, Label, Textarea } from "@datadack/common-ui"
import { useTranslation } from "react-i18next"

import type { DomainClaimKind } from "../domains.types"
import { DomainBehaviorChoice, type DomainBehavior } from "./DomainBehaviorChoice"
import { DomainKindChoice } from "./DomainKindChoice"
import type { ParsedHostnames } from "./hostname-input"
import { RedirectSettingsFields } from "./RedirectSettingsFields"

/** How many previewed hostnames are spelled out before the count takes over. */
const PREVIEW_LIMIT = 3

/**
 * The dialog's first step: which kind of name, and which name.
 *
 * Its own component because it is the only step with a form in it, and because
 * every string on it changes with the kind — the label, the placeholder, the
 * hint, the invalid message and the submit button all say something different
 * about a name under our zone than about a domain the tenant owns. Keeping that
 * in the dialog made one function that both drove four steps of state machine
 * and phrased two vocabularies.
 */
export function AddDomainInputStep({
  kind,
  onKindChange,
  zone,
  labelMode,
  value,
  onValueChange,
  parsed,
  rejected,
  serverError,
  behavior,
  onBehaviorChange,
  redirectTo,
  onRedirectToChange,
  redirectStatus,
  onRedirectStatusChange,
  dropPath,
  onDropPathChange,
  redirectError,
  redirectReady,
  creating,
  onSubmit,
  onCancel,
}: Readonly<{
  kind: DomainClaimKind
  onKindChange: (kind: DomainClaimKind) => void
  /** The resource's platform zone; empty means it has no address yet. */
  zone: string
  /** The field takes bare labels under `zone` rather than whole hostnames. */
  labelMode: boolean
  value: string
  onValueChange: (value: string) => void
  parsed: ParsedHostnames
  rejected: string[]
  serverError: string | null
  behavior: DomainBehavior
  onBehaviorChange: (behavior: DomainBehavior) => void
  redirectTo: string
  onRedirectToChange: (value: string) => void
  redirectStatus: number
  onRedirectStatusChange: (value: number) => void
  dropPath: boolean
  onDropPathChange: (value: boolean) => void
  redirectError: string
  redirectReady: boolean
  creating: boolean
  onSubmit: () => void
  onCancel: () => void
}>) {
  const { t } = useTranslation()

  // Every string that differs between the two kinds, resolved once. The
  // alternative — a ternary at each use — is how one of them ends up phrased
  // for the other kind after an edit.
  const copy = labelMode
    ? {
        field: t("domains.add.labelLabel"),
        placeholder: t("domains.add.labelPlaceholder"),
        hint: t("domains.add.labelHint", { zone }),
        invalid: t("domains.add.labelInvalidNamed", { names: rejected.join(", ") }),
        submit: t("domains.add.submitInternal"),
      }
    : {
        field: t("domains.add.hostnameLabel"),
        placeholder: t("domains.add.hostnamePlaceholder"),
        hint: t("domains.add.hostnameHint"),
        invalid: t("domains.add.hostnameInvalidNamed", { names: rejected.join(", ") }),
        submit: t("domains.add.submit"),
      }

  const many = parsed.valid.length > 1
  const preview = parsed.valid.slice(0, PREVIEW_LIMIT)

  return (
    <>
      <DomainKindChoice
        value={kind}
        onChange={onKindChange}
        zone={zone}
        internalDisabled={zone === ""}
      />

      <div className="space-y-1.5">
        <Label htmlFor="custom-domain-hostname">{copy.field}</Label>
        {/* A textarea rather than an input, because the realistic add is not one
            name: it is the apex and the www, a column pasted out of a registrar,
            or the two internal names an app answers on. Enter still submits a
            single name — the one-line case must not get slower to serve the
            many-line one — so a newline needs Shift. */}
        <Textarea
          id="custom-domain-hostname"
          value={value}
          placeholder={copy.placeholder}
          spellCheck={false}
          autoComplete="off"
          rows={value.includes("\n") ? 5 : 2}
          className="resize-y font-mono text-[13px]"
          onChange={(event) => {
            onValueChange(event.target.value)
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault()
              onSubmit()
            }
          }}
        />

        {rejected.length > 0 ? (
          <p className="text-[12px] text-destructive">{copy.invalid}</p>
        ) : (
          <p className="text-[11px] text-muted-foreground">{copy.hint}</p>
        )}

        {/* The whole name, spelled out. A label field under a zone the tenant
            cannot see is the field where somebody types the full hostname and is
            told it is invalid. */}
        {labelMode && preview.length > 0 && (
          <ul className="space-y-0.5">
            {preview.map((label) => (
              <li key={label} className="font-mono text-[12px] text-foreground">
                {label}
                <span className="text-muted-foreground">.{zone}</span>
              </li>
            ))}
            {parsed.valid.length > PREVIEW_LIMIT && (
              <li className="text-[11px] text-muted-foreground">
                {t("domains.add.andMore", { count: parsed.valid.length - PREVIEW_LIMIT })}
              </li>
            )}
          </ul>
        )}

        {/* The count is the preview's job whenever there is one. */}
        {many && rejected.length === 0 && !labelMode && (
          <p className="text-[11px] text-muted-foreground">
            {t("domains.add.willAddCount", { count: parsed.valid.length })}
          </p>
        )}

        {serverError && <p className="text-[12px] text-destructive">{serverError}</p>}
      </div>

      {many ? (
        <p className="rounded-md border border-border/60 glass-1-bg-raised p-3 text-[12px] text-muted-foreground">
          {t("domains.behavior.batchConnects")}
        </p>
      ) : (
        <div className="space-y-3">
          <DomainBehaviorChoice value={behavior} onChange={onBehaviorChange} />
          {behavior === "redirect" && (
            <RedirectSettingsFields
              idPrefix="add-domain"
              to={redirectTo}
              onToChange={onRedirectToChange}
              status={redirectStatus}
              onStatusChange={onRedirectStatusChange}
              dropPath={dropPath}
              onDropPathChange={onDropPathChange}
              fieldError={redirectError}
              onSubmit={onSubmit}
            />
          )}
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="ghost" disabled={creating} onClick={onCancel}>
          {t("console.confirm.cancel")}
        </Button>
        <Button
          type="button"
          variant="gold"
          disabled={
            creating ||
            parsed.valid.length === 0 ||
            (!many && behavior === "redirect" && !redirectReady)
          }
          loading={creating}
          onClick={onSubmit}
        >
          {many ? t("domains.add.submitMany", { count: parsed.valid.length }) : copy.submit}
        </Button>
      </DialogFooter>
    </>
  )
}
