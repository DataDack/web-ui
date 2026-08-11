import { useState } from "react"

import { Check, ExternalLink, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Badge, Button, Label, css, cx, fontMono } from "@datadack/common-ui"

import { SectionShell } from "./SectionShell"
import { useCreateFunctionUrl, useDeleteFunctionUrl, useFunctionUrls } from "../../../data/queries"
import { useServerlessContext } from "../../../data/transport"
import type { FunctionEntity } from "../../../data/types"
import { ConfirmDialog } from "../../ConfirmDialog"
import { errorMessage } from "../errorMessage"
import type { FunctionDetailLabels } from "../labels"

const list = css`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const row = css`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
`

const anchor = css`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: ${fontMono};
  font-size: 13px;
  color: var(--primary);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

const parked = css`
  color: var(--muted-foreground);
  text-decoration: line-through;
`

const icon = css`
  width: 13px;
  height: 13px;
  flex-shrink: 0;
  color: var(--muted-foreground);
`

const badge = css`
  font-family: ${fontMono};
  font-size: 11px;
`

const emptyLine = css`
  margin: 0;
  font-size: 13px;
  color: var(--muted-foreground);
`

const hintLine = css`
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--muted-foreground);
`

const releaseButton = css`
  margin-left: auto;
  color: var(--muted-foreground);

  &:hover {
    color: var(--destructive);
  }
`

const form = css`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const field = css`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

/** Separates the create form from the rows it sits under. */
const formAfterList = css`
  margin-top: 20px;
`

const formFooter = css`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`

/* The auth choice is two options with real consequences — public versus signed —
   so it is laid out as cards rather than a dropdown: both are readable at once,
   and the trade-off does not hide behind a closed menu. */
const choices = css`
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(0, 1fr);

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const choice = css`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 0.625rem;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 120ms ease,
    background-color 120ms ease;

  &:hover {
    border-color: var(--primary);
  }
`

const choiceSelected = css`
  border-color: var(--primary);
  background: color-mix(in oklab, var(--primary) 8%, transparent);
`

const choiceText = css`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
`

const choiceTitle = css`
  font-family: ${fontMono};
  font-size: 13px;
  font-weight: 600;
  color: var(--foreground);
`

const choiceHint = css`
  font-size: 12px;
  line-height: 1.35;
  color: var(--muted-foreground);
`

const choiceCheck = css`
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--primary);
`

const choiceCheckEmpty = css`
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  margin-top: 2px;
  border: 1px solid var(--border);
  border-radius: 999px;
`

/**
 * The wire values the control plane accepts. `AWS_IAM` is Lambda's spelling and
 * what is stored; the console shows it as plain "IAM" — see `authTypeLabel`.
 */
const AUTH_NONE = "NONE"
const AUTH_IAM = "AWS_IAM"

/** The picker's options, in the order they are offered. */
const AUTH_CHOICES = [
  { value: AUTH_NONE, title: "functionUrlAuthNone", hint: "functionUrlAuthNoneHint" },
  { value: AUTH_IAM, title: "functionUrlAuthIam", hint: "functionUrlAuthIamHint" },
] as const

/** What a stored auth type is called on screen: AWS_IAM reads as "IAM" here. */
function authTypeLabel(authType: string): string {
  return authType === AUTH_IAM ? "IAM" : authType
}

export interface FunctionUrlSectionProps {
  fn: FunctionEntity
  scope?: string
  labels: FunctionDetailLabels
  className?: string
}

/**
 * The hostnames that invoke this function.
 *
 * Nothing here is automatic: deploying a function mints no URL, so the list
 * starts empty and stays empty until somebody creates one — publishing a
 * function to the internet is a decision, not a side effect of shipping code.
 * The generated hostname carries the account ID, so two tenants can each have
 * one for a function they both called "api".
 *
 * Creating only ever takes that generated hostname. The control plane accepts a
 * domain of your own, but a name nobody has pointed at this platform resolves
 * nowhere and has no certificate, so it is not something to hand someone behind
 * the same button — it needs its own flow with DNS and issuance in it.
 */
export function FunctionUrlSection({
  fn,
  scope,
  labels,
  className,
}: Readonly<FunctionUrlSectionProps>) {
  const { capabilities } = useServerlessContext()
  const { data: urls, isLoading } = useFunctionUrls(fn.name, scope)
  const create = useCreateFunctionUrl(fn.name, scope)
  const remove = useDeleteFunctionUrl(fn.name, scope)

  const [creating, setCreating] = useState(false)
  const [authType, setAuthType] = useState(AUTH_NONE)
  // The domain pending release, or null. Holding the value (not a boolean) is
  // what lets the dialog name the hostname it is about to free.
  const [releasing, setReleasing] = useState<string | null>(null)

  const config = labels.configuration
  const writable = capabilities.functionUrlWrite

  const closeForm = () => {
    setCreating(false)
    setAuthType(AUTH_NONE)
  }

  const submit = () => {
    create.mutate(
      // No domain is ever sent: the console only ever asks for the hostname the
      // platform generates. Mapping a name of your own is a different act — it
      // needs DNS you control and a certificate for it — so it does not belong
      // behind the same button, where a typo silently becomes an unroutable URL.
      { authType },
      {
        onSuccess: (created) => {
          toast.success(config.functionUrlCreated(created.domain))
          closeForm()
        },
        onError: (error) => {
          toast.error(errorMessage(error, config.functionUrlCreateFailed))
        },
      },
    )
  }

  const confirmRelease = () => {
    if (!releasing) return
    const domainToRelease = releasing
    remove.mutate(domainToRelease, {
      onSuccess: () => {
        toast.success(config.functionUrlDeleted(domainToRelease))
        setReleasing(null)
      },
      onError: (error) => {
        toast.error(errorMessage(error, labels.errors.deleteFailed))
      },
    })
  }

  return (
    <SectionShell
      title={config.nav.functionUrl}
      className={className}
      actions={
        writable &&
        !creating && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCreating(true)
            }}
          >
            {config.functionUrlCreate}
          </Button>
        )
      }
    >
      {isLoading && <p className={emptyLine}>…</p>}

      {!isLoading && (!urls || urls.length === 0) && (
        <>
          <p className={emptyLine}>{config.functionUrlEmpty}</p>
          {writable && <p className={hintLine}>{config.functionUrlEmptyHint}</p>}
        </>
      )}

      {!isLoading && urls && urls.length > 0 && (
        <div className={list}>
          {urls.map((url) => (
            <div className={row} key={url.domain}>
              <ExternalLink className={icon} aria-hidden />
              {url.disabled ? (
                <span className={cx(anchor, parked)}>{url.domain}</span>
              ) : (
                <a
                  className={anchor}
                  href={`https://${url.domain}`}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {url.domain}
                </a>
              )}
              {url.disabled && (
                <Badge variant="outline" className={badge}>
                  {config.functionUrlDisabled}
                </Badge>
              )}
              {url.qualifier && (
                <Badge variant="outline" className={badge}>
                  {url.qualifier}
                </Badge>
              )}
              {/* A generated hostname is released with the function; a custom
                  one is the operator's to manage, so the distinction is worth
                  showing rather than hiding behind identical rows. */}
              <Badge variant="outline" className={badge}>
                {url.generated ? config.functionUrlGenerated : config.functionUrlCustom}
              </Badge>
              <Badge variant="outline" className={badge}>
                {authTypeLabel(url.authType)}
              </Badge>
              {writable && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={releaseButton}
                  aria-label={`${config.functionUrlDelete} ${url.domain}`}
                  onClick={() => {
                    setReleasing(url.domain)
                  }}
                >
                  <Trash2 size={14} />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {creating && (
        <div className={cx(form, urls && urls.length > 0 && formAfterList)}>
          <p className={hintLine}>{config.functionUrlGeneratedHint}</p>

          <div className={field}>
            <Label>{config.functionUrlAuthType}</Label>
            <div className={choices} role="radiogroup" aria-label={config.functionUrlAuthType}>
              {AUTH_CHOICES.map((option) => {
                const selected = authType === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={cx(choice, selected && choiceSelected)}
                    onClick={() => {
                      setAuthType(option.value)
                    }}
                  >
                    {selected ? (
                      <Check className={choiceCheck} aria-hidden />
                    ) : (
                      <span className={choiceCheckEmpty} aria-hidden />
                    )}
                    <span className={choiceText}>
                      <span className={choiceTitle}>{config[option.title]}</span>
                      <span className={choiceHint}>{config[option.hint]}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className={formFooter}>
            <Button variant="ghost" size="sm" onClick={closeForm} disabled={create.isPending}>
              {config.cancel}
            </Button>
            <Button
              variant="gold"
              size="sm"
              loading={create.isPending}
              disabled={create.isPending}
              onClick={submit}
            >
              {config.functionUrlCreateSubmit}
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={releasing !== null}
        onOpenChange={(open) => {
          if (!open) setReleasing(null)
        }}
        title={config.functionUrlDeleteTitle(releasing ?? "")}
        description={config.functionUrlDeleteDescription}
        confirmLabel={config.functionUrlDeleteConfirm}
        cancelLabel={config.cancel}
        loading={remove.isPending}
        onConfirm={confirmRelease}
      />
    </SectionShell>
  )
}
