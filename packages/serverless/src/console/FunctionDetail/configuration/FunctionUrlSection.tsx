import { useId, useState } from "react"

import { ExternalLink, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  Badge,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  css,
  cx,
  fontMono,
} from "@datadack/common-ui"

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

const monoInput = css`
  font-family: ${fontMono};
  font-size: 13px;
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

const AUTH_NONE = "NONE"
const AUTH_IAM = "AWS_IAM"

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
  const fieldId = useId()

  const [creating, setCreating] = useState(false)
  const [domain, setDomain] = useState("")
  const [authType, setAuthType] = useState(AUTH_NONE)
  // The domain pending release, or null. Holding the value (not a boolean) is
  // what lets the dialog name the hostname it is about to free.
  const [releasing, setReleasing] = useState<string | null>(null)

  const config = labels.configuration
  const writable = capabilities.functionUrlWrite

  const closeForm = () => {
    setCreating(false)
    setDomain("")
    setAuthType(AUTH_NONE)
  }

  const submit = () => {
    create.mutate(
      // An empty domain is omitted rather than sent blank: to the control plane
      // "absent" means "generate one for me", and "" would read as a domain.
      { domain: domain.trim() || undefined, authType },
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
                {url.authType}
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
          <div className={field}>
            <Label htmlFor={`${fieldId}-domain`}>{config.functionUrlDomain}</Label>
            <Input
              id={`${fieldId}-domain`}
              value={domain}
              placeholder={config.functionUrlDomainPlaceholder}
              className={monoInput}
              autoComplete="off"
              onChange={(event) => {
                setDomain(event.target.value)
              }}
            />
            <p className={hintLine}>{config.functionUrlDomainHint}</p>
          </div>

          <div className={field}>
            <Label>{config.functionUrlAuthType}</Label>
            <Select value={authType} onValueChange={setAuthType}>
              <SelectTrigger aria-label={config.functionUrlAuthType}>
                <SelectValue placeholder={config.functionUrlAuthType} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={AUTH_NONE}>{config.functionUrlAuthNone}</SelectItem>
                <SelectItem value={AUTH_IAM}>{config.functionUrlAuthIam}</SelectItem>
              </SelectContent>
            </Select>
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
