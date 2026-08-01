import { useMemo, useState } from 'react'

import { AlertTriangle, Check, PackageOpen, Search } from 'lucide-react'

import { cn } from '@/lib/utils'

import { familyLabel, RuntimeIcon } from './RuntimeIcon'
import { useRuntimes } from '../lib/queries'
import type { Runtime } from '../lib/schemas'

export interface RuntimeCatalogProps {
  theme?: 'light' | 'dark'
  value?: string
  onSelect: (runtime: Runtime) => void
  /** Hide runtimes that can no longer back a new function. */
  hideDeprecated?: boolean
  className?: string
}

const FAMILY_ORDER = ['nodejs', 'python', 'ruby', 'java', 'dotnet', 'provided', 'go']

/**
 * The control plane's runtime catalog as a selectable grid. The list comes from
 * GET /v1/runtimes rather than a hardcoded array, so a runtime added or
 * deprecated in the backend shows up here without a frontend release.
 */
export function RuntimeCatalog({
  value,
  onSelect,
  hideDeprecated = false,
  theme,
  className,
}: Readonly<RuntimeCatalogProps>) {
  // No .fs-root when nested: the enclosing component already provides the
  // tokens, and a second one would repaint its background mid-form.
  return (
    <RuntimeCatalogView
      wrap={theme !== undefined}
      theme={theme}
      value={value}
      onSelect={onSelect}
      hideDeprecated={hideDeprecated}
      className={className}
    />
  )
}

function RuntimeCatalogView({
  value,
  onSelect,
  hideDeprecated = false,
  theme,
  wrap,
  className,
}: Readonly<RuntimeCatalogProps & { wrap?: boolean }>) {
  const { data, isLoading, error } = useRuntimes()
  const [filter, setFilter] = useState('')

  const groups = useMemo(() => {
    const runtimes = (data ?? []).filter((runtime) => {
      if (hideDeprecated && runtime.deprecatedForCreate) return false
      if (!filter) return true
      const haystack = `${runtime.name} ${runtime.family} ${runtime.osRelease}`.toLowerCase()
      return haystack.includes(filter.toLowerCase())
    })
    const byFamily = new Map<string, Runtime[]>()
    for (const runtime of runtimes) {
      const bucket = byFamily.get(runtime.family)
      if (bucket) bucket.push(runtime)
      else byFamily.set(runtime.family, [runtime])
    }
    return [...byFamily.entries()].sort(
      ([a], [b]) => FAMILY_ORDER.indexOf(a) - FAMILY_ORDER.indexOf(b),
    )
  }, [data, filter, hideDeprecated])

  if (error) {
    return (
      <div className="fs-alert fs-alert-danger">
        <AlertTriangle className="fs-size-4" />
        Could not load the runtime catalog.
      </div>
    )
  }

  return (
    <div
      className={cn(
        wrap && 'fs-root',
        wrap && theme === 'dark' && 'fs-dark',
        'fs-stack',
        className,
      )}
    >
      <div className="fs-search">
        <Search className="fs-search-icon" />
        <input
          value={filter}
          onChange={(event) => {
            setFilter(event.target.value)
          }}
          placeholder="Filter runtimes…"
          aria-label="Filter runtimes"
          className="fs-input fs-input-search"
        />
      </div>

      {isLoading && (
        <div className="fs-grid">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={`skeleton-${String(i)}`} className="fs-runtime-card fs-skeleton" />
          ))}
        </div>
      )}

      {!isLoading &&
        groups.map(([family, runtimes]) => (
          <section key={family}>
            <h4 className="fs-group-label">
              <RuntimeIcon family={family} className="fs-group-icon" />
              {familyLabel(family)}
            </h4>
            <div className="fs-grid">
              {runtimes.map((runtime) => {
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
                    className={cn(
                      'fs-runtime-card',
                      selected && 'fs-runtime-card-selected',
                      disabled && 'fs-runtime-card-disabled',
                    )}
                    title={
                      disabled
                        ? `Deprecated — use ${runtime.successorRuntime ?? 'a supported runtime'}`
                        : runtime.handlerFormat
                    }
                  >
                    <span className="fs-runtime-head">
                      <RuntimeIcon family={runtime.family} />
                      <span className="fs-runtime-name">{runtime.name}</span>
                      {selected && <Check className="fs-size-4 fs-runtime-check" />}
                    </span>
                    <span className="fs-runtime-meta">
                      {runtime.languageVersion
                        ? `${familyLabel(runtime.family)} ${runtime.languageVersion} · ${runtime.osRelease}`
                        : runtime.osRelease}
                    </span>
                    <span className="fs-runtime-tags">
                      {runtime.architectures.map((arch) => (
                        <span key={arch} className="fs-tag">
                          {arch}
                        </span>
                      ))}
                      {/* A bundled RIC means no inline authoring — say so up
                          front rather than after a failed invoke. */}
                      {runtime.bundledRic && (
                        <span className="fs-tag fs-tag-warn">
                          <PackageOpen className="fs-size-3" /> bundled RIC
                        </span>
                      )}
                      {disabled && <span className="fs-tag fs-tag-danger">deprecated</span>}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        ))}

      {!isLoading && groups.length === 0 && (
        <p className="fs-empty">No runtimes match that filter.</p>
      )}
    </div>
  )
}
