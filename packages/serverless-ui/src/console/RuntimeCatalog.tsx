import { useMemo, useState } from "react"

import { css, cx } from "@emotion/css"
import { AlertTriangle, Check, PackageOpen, Search } from "lucide-react"

import { Input, fontMono } from "@datadack/common-ui"

import { familyLabel, RuntimeIcon } from "./RuntimeIcon"
/**
 * One runtime catalog entry as served by the control plane's GET /v1/runtimes.
 * A plain interface rather than a schema: the consumer owns fetching and
 * validation, this component only renders.
 */
export interface RuntimeInfo {
  name: string
  family: string
  languageVersion?: string
  osRelease: string
  architectures: string[]
  handlerFormat: string
  handlerRequired: boolean
  /** True when the artifact must carry its own RIC and a `bootstrap` binary. */
  bundledRic: boolean
  deprecatedForCreate: boolean
  deprecatedForUpdate: boolean
  successorRuntime?: string
}

export interface RuntimeCatalogProps {
  /** The catalog to render — the consumer fetches it (GET /v1/runtimes). */
  runtimes: RuntimeInfo[]
  isLoading?: boolean
  /** Render the load-failure alert instead of the grid. */
  errored?: boolean
  value?: string
  onSelect: (runtime: RuntimeInfo) => void
  /** Hide runtimes that can no longer back a new function. */
  hideDeprecated?: boolean
  className?: string
}

const FAMILY_ORDER = ["nodejs", "python", "ruby", "java", "dotnet", "provided", "go"]

const stack = css`
  display: flex;
  flex-direction: column;
  gap: 14px;
`

const alert = css`
  display: flex;
  align-items: flex-start;
  gap: 9px;
  border-radius: 0.5rem;
  padding: 10px 12px;
  background: var(--status-danger-bg);
  color: var(--status-danger);
  font-size: 12px;

  & svg {
    width: 16px;
    height: 16px;
    flex: none;
  }
`

const searchBox = css`
  position: relative;
`

const searchIcon = css`
  position: absolute;
  top: 50%;
  left: 9px;
  width: 14px;
  height: 14px;
  transform: translateY(-50%);
  color: var(--muted-foreground);
  pointer-events: none;
`

const searchInput = css`
  padding-left: 30px;
  max-width: 280px;
`

const grid = css`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 10px;
`

const card = css`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  background: var(--card);
  color: inherit;
  text-align: left;
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: var(--brand-gold);
  }
`

const cardSelected = css`
  border-color: var(--brand-gold);
  background: var(--brand-gold-soft);
`

const cardDisabled = css`
  opacity: 0.45;
  cursor: not-allowed;

  & svg {
    filter: grayscale(1);
  }
`

const skeletonPulse = css`
  min-height: 74px;
  border-style: dashed;
  animation: sui-catalog-pulse 1.4s ease-in-out infinite;

  @keyframes sui-catalog-pulse {
    50% {
      opacity: 0.5;
    }
  }
`

const groupLabel = css`
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted-foreground);
`

const cardHead = css`
  display: flex;
  align-items: center;
  gap: 8px;
`

const cardName = css`
  font-family: ${fontMono};
  font-size: 13px;
  font-weight: 600;
`

const cardCheck = css`
  margin-left: auto;
  width: 16px;
  height: 16px;
  flex: none;
  color: var(--brand-gold);
`

const cardMeta = css`
  font-size: 11px;
  color: var(--muted-foreground);
`

const cardTags = css`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 2px;
`

const tag = css`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 6px;
  border: 1px solid var(--border);
  border-radius: 999px;
  font-family: ${fontMono};
  font-size: 10px;
  color: var(--muted-foreground);

  & svg {
    width: 12px;
    height: 12px;
    flex: none;
  }
`

const tagWarn = css`
  border-color: transparent;
  background: var(--status-warning-bg);
  color: var(--status-warning);
`

const tagDanger = css`
  border-color: transparent;
  background: var(--status-danger-bg);
  color: var(--status-danger);
`

const empty = css`
  margin: 0;
  font-size: 13px;
  color: var(--muted-foreground);
`

/**
 * A runtime catalog as a selectable grid, grouped by language family. Purely
 * presentational: pass the runtimes (typically straight from GET /v1/runtimes)
 * and handle selection — filtering and grouping run in here.
 */
export function RuntimeCatalog({
  runtimes,
  isLoading = false,
  errored = false,
  value,
  onSelect,
  hideDeprecated = false,
  className,
}: Readonly<RuntimeCatalogProps>) {
  const [filter, setFilter] = useState("")

  const groups = useMemo(() => {
    const visible = runtimes.filter((runtime) => {
      if (hideDeprecated && runtime.deprecatedForCreate) return false
      if (!filter) return true
      const haystack = `${runtime.name} ${runtime.family} ${runtime.osRelease}`.toLowerCase()
      return haystack.includes(filter.toLowerCase())
    })
    const byFamily = new Map<string, RuntimeInfo[]>()
    for (const runtime of visible) {
      const bucket = byFamily.get(runtime.family)
      if (bucket) bucket.push(runtime)
      else byFamily.set(runtime.family, [runtime])
    }
    return [...byFamily.entries()].sort(
      ([a], [b]) => FAMILY_ORDER.indexOf(a) - FAMILY_ORDER.indexOf(b),
    )
  }, [runtimes, filter, hideDeprecated])

  if (errored) {
    return (
      <div className={alert}>
        <AlertTriangle />
        Could not load the runtime catalog.
      </div>
    )
  }

  return (
    <div className={cx(stack, className)}>
      <div className={searchBox}>
        <Search className={searchIcon} />
        <Input
          value={filter}
          onChange={(event) => {
            setFilter(event.target.value)
          }}
          placeholder="Filter runtimes…"
          aria-label="Filter runtimes"
          className={searchInput}
        />
      </div>

      {isLoading && (
        <div className={grid}>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={`skeleton-${String(i)}`} className={cx(card, skeletonPulse)} />
          ))}
        </div>
      )}

      {!isLoading &&
        groups.map(([family, familyRuntimes]) => (
          <section key={family}>
            <h4 className={groupLabel}>
              <RuntimeIcon family={family} />
              {familyLabel(family)}
            </h4>
            <div className={grid}>
              {familyRuntimes.map((runtime) => {
                const selected = runtime.name === value
                const disabled = runtime.deprecatedForCreate
                return (
                  <button
                    key={runtime.name}
                    type="button"
                    disabled={disabled}
                    aria-pressed={selected}
                    onClick={() => {
                      onSelect(runtime)
                    }}
                    className={cx(card, selected && cardSelected, disabled && cardDisabled)}
                    title={
                      disabled
                        ? `Deprecated — use ${runtime.successorRuntime ?? "a supported runtime"}`
                        : runtime.handlerFormat
                    }
                  >
                    <span className={cardHead}>
                      <RuntimeIcon family={runtime.family} />
                      <span className={cardName}>{runtime.name}</span>
                      {selected && <Check className={cardCheck} />}
                    </span>
                    <span className={cardMeta}>
                      {runtime.languageVersion
                        ? `${familyLabel(runtime.family)} ${runtime.languageVersion} · ${runtime.osRelease}`
                        : runtime.osRelease}
                    </span>
                    <span className={cardTags}>
                      {runtime.architectures.map((arch) => (
                        <span key={arch} className={tag}>
                          {arch}
                        </span>
                      ))}
                      {/* A bundled RIC means no inline authoring — say so up
                          front rather than after a failed invoke. */}
                      {runtime.bundledRic && (
                        <span className={cx(tag, tagWarn)}>
                          <PackageOpen /> bundled RIC
                        </span>
                      )}
                      {disabled && <span className={cx(tag, tagDanger)}>deprecated</span>}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        ))}

      {!isLoading && groups.length === 0 && <p className={empty}>No runtimes match that filter.</p>}
    </div>
  )
}
