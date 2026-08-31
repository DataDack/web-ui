import { useState, type ReactNode } from "react"

import { Eye, EyeOff, ExternalLink, Settings2 } from "lucide-react"

import {
  css,
  cx,
  fontMono,
  formatBytes,
  media,
  mix,
  StatusBadge,
  timeAgo,
} from "@datadack/common-ui"

import type { FunctionCode, FunctionEntity, FunctionUrl } from "../../../data/types"
import type { FunctionDetailLabels } from "../labels"

/* Below md the workbench stacks, so the rail is a band under the editor rather
   than a column beside it — 288px of fixed width in a column layout would push
   the whole page sideways. */
const rail = css`
  display: flex;
  width: 100%;
  max-height: 260px;
  flex-shrink: 0; 
  flex-direction: column;
  min-height: 0;
  overflow: hidden auto;
  border-top: 1px solid ${mix("--border", 60)};
  background: var(--glass-1-bg);
  padding-bottom: 14px;

  ${media.md} {
    width: 288px;
    max-height: none;
    border-top: 0;
    border-left: 1px solid ${mix("--border", 60)};
  }
`

const sectionHead = css`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px 6px;
`

const sectionTitle = css`
  flex: 1;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted-foreground);
`

const headButton = css`
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  padding: 2px;
  color: var(--muted-foreground);
  cursor: pointer;

  &:hover {
    color: var(--foreground);
  }
`

const card = css`
  margin: 0 12px;
  border-radius: 0.5rem;
  border: 1px solid ${mix("--border", 55)};
  background: var(--glass-1-bg);
  padding: 12px;
`

const cardHead = css`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
`

const cardTitle = css`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 600;
  color: var(--foreground);
`

const factRow = css`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  padding: 4px 0;
  font-size: 11.5px;
`

const factKey = css`
  flex-shrink: 0;
  color: var(--muted-foreground);
`

const factValue = css`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: ${fontMono};
  font-size: 11px;
  color: var(--foreground);
`

const urlValue = css`
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 5px;
  color: var(--primary);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

const urlIcon = css`
  width: 11px;
  height: 11px;
  flex-shrink: 0;
`

const disabledUrl = css`
  color: var(--muted-foreground);
  text-decoration: line-through;
`

const envList = css`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 12px;
`

const envItem = css`
  border-radius: 0.5rem;
  border: 1px solid ${mix("--border", 50)};
  background: var(--glass-1-bg);
  padding: 8px 10px;
`

const envKey = css`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: ${fontMono};
  font-size: 11px;
  font-weight: 600;
  color: var(--foreground);
`

const envValue = css`
  margin-top: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: ${fontMono};
  font-size: 11px;
  color: var(--brand-gold);
`

const emptyNote = css`
  padding: 4px 14px 8px;
  font-size: 12px;
  color: var(--muted-foreground);
`

/** Fixed-width mask, so a long secret does not advertise its own length. */
const MASK = "••••••••••••••••••"

export interface CodeDeployRailProps {
  fn: FunctionEntity
  code: FunctionCode
  urls?: readonly FunctionUrl[]
  labels: FunctionDetailLabels
  /** Opens the Configuration → Environment variables section. */
  onManageEnv?: () => void
  className?: string
}

/**
 * The workbench's right panel: where this code is running, and what it runs
 * with.
 *
 * Read-only on purpose. Everything here has an editing surface one click away
 * in Configuration; repeating those forms beside the editor would mean two
 * places to save the same field. What the panel is for is the question you ask
 * mid-edit — which version is live, which region, which env var the handler is
 * about to read — answered without leaving the file.
 */
export function CodeDeployRail({
  fn,
  code,
  urls,
  labels,
  onManageEnv,
  className,
}: Readonly<CodeDeployRailProps>) {
  const copy = labels.code.rail
  const [revealed, setRevealed] = useState(false)

  // Prefer a live hostname over a parked one, so a function with both shows the
  // address that actually answers.
  const primaryUrl = urls?.find((entry) => !entry.disabled) ?? urls?.[0]
  const deployedAt = fn.version?.createdAt ?? fn.updatedAt
  const envEntries = Object.entries(fn.env ?? {})

  // Built ahead of the JSX: three outcomes (live link, parked domain, none at
  // all) nested inline would be a ternary inside a ternary.
  let urlNode: ReactNode = <span className={factValue}>{copy.noUrl}</span>
  if (primaryUrl?.disabled) {
    urlNode = <span className={cx(factValue, disabledUrl)}>{primaryUrl.domain}</span>
  } else if (primaryUrl) {
    urlNode = (
      <a
        className={cx(factValue, urlValue)}
        href={`https://${primaryUrl.domain}`}
        target="_blank"
        rel="noreferrer noopener"
        title={primaryUrl.domain}
      >
        <ExternalLink className={urlIcon} aria-hidden />
        {primaryUrl.domain}
      </a>
    )
  }

  const facts: { key: string; value: string }[] = [
    { key: copy.version, value: code.version ? `v${code.version}` : (fn.version?.version ?? "—") },
    { key: copy.lastDeployed, value: deployedAt ? timeAgo(deployedAt) : "—" },
    { key: copy.region, value: fn.region ?? "—" },
    { key: copy.size, value: formatBytes(code.sizeBytes) },
  ]
  if (code.sha256) facts.push({ key: copy.digest, value: code.sha256.slice(0, 7) })

  return (
    <aside className={cx(rail, className)}>
      <div className={sectionHead}>
        <span className={sectionTitle}>{copy.deployment}</span>
      </div>

      <div className={card}>
        <div className={cardHead}>
          <StatusBadge status={fn.state} pulse={fn.state.toLowerCase() === "active"} />
          <span className={cardTitle}>
            {code.draft ? copy.draft : (fn.runtime ?? fn.packageType)}
          </span>
        </div>

        {facts.map((fact) => (
          <div className={factRow} key={fact.key}>
            <span className={factKey}>{fact.key}</span>
            <span className={factValue} title={fact.value}>
              {fact.value}
            </span>
          </div>
        ))}

        <div className={factRow}>
          <span className={factKey}>{copy.url}</span>
          {urlNode}
        </div>
      </div>

      <div className={sectionHead}>
        <span className={sectionTitle}>{copy.environment}</span>
        {envEntries.length > 0 && (
          <button
            type="button"
            className={headButton}
            aria-label={revealed ? copy.concealValues : copy.revealValues}
            title={revealed ? copy.concealValues : copy.revealValues}
            aria-pressed={revealed}
            onClick={() => {
              setRevealed((on) => !on)
            }}
          >
            {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
        {onManageEnv && (
          <button
            type="button"
            className={headButton}
            aria-label={copy.manageEnv}
            title={copy.manageEnv}
            onClick={onManageEnv}
          >
            <Settings2 size={14} />
          </button>
        )}
      </div>

      {envEntries.length === 0 ? (
        <p className={emptyNote}>{copy.envEmpty}</p>
      ) : (
        <div className={envList}>
          {envEntries.map(([key, value]) => (
            <div className={envItem} key={key}>
              <div className={envKey} title={key}>
                {key}
              </div>
              <div className={envValue} title={revealed ? value : undefined}>
                {revealed ? value : MASK}
              </div>
            </div>
          ))}
        </div>
      )}
    </aside>
  )
}
