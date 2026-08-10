import { ExternalLink } from "lucide-react"

import { Badge, css, cx, fontMono } from "@datadack/common-ui"

import { useFunctionUrls } from "../../../data/queries"
import type { FunctionEntity } from "../../../data/types"
import type { FunctionDetailLabels } from "../labels"
import { SectionShell } from "./SectionShell"

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

export interface FunctionUrlSectionProps {
  fn: FunctionEntity
  scope?: string
  labels: FunctionDetailLabels
  className?: string
}

/**
 * The hostnames that invoke this function.
 *
 * Read-only for now: the control plane mints a URL when the function is
 * deployed and releases it when the function goes, so there is nothing here an
 * operator has to do. Mapping a custom domain is a POST the console does not
 * expose yet — hence no Edit button rather than a disabled one.
 */
export function FunctionUrlSection({
  fn,
  scope,
  labels,
  className,
}: Readonly<FunctionUrlSectionProps>) {
  const { data: urls, isLoading } = useFunctionUrls(fn.name, scope)
  const config = labels.configuration

  return (
    <SectionShell title={config.nav.functionUrl} className={className}>
      {isLoading && <p className={emptyLine}>…</p>}

      {!isLoading && (!urls || urls.length === 0) && (
        <p className={emptyLine}>{config.functionUrlEmpty}</p>
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
            </div>
          ))}
        </div>
      )}
    </SectionShell>
  )
}
