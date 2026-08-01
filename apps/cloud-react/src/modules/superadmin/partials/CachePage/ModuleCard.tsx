import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

import { Badge } from "@DataDack/common-ui"

import { groupState, type Selection } from "./cache-selection"
import { ImpactBadge } from "./ImpactBadge"
import type { CacheNamespaceGroup } from "../../superadmin.types"

interface ModuleCardProps {
  group: CacheNamespaceGroup
  selection: Selection
  onToggleNamespace: (key: string) => void
  onToggleGroup: (group: CacheNamespaceGroup) => void
  onClearGroup: (group: CacheNamespaceGroup) => void
  disabled?: boolean
}

// One owning module and its clearable key families. The module header doubles
// as a select-all so the two coarsest combos — "this whole module" and "these
// specific families" — are one click apart.
export function ModuleCard({
  group,
  selection,
  onToggleNamespace,
  onToggleGroup,
  onClearGroup,
  disabled = false,
}: Readonly<ModuleCardProps>) {
  const { t } = useTranslation()
  const { all, some } = groupState(selection, group)

  return (
    <section className="glass-2 overflow-hidden">
      <header className="flex flex-wrap items-start gap-3 border-b border-border/60 p-4">
        <Checkbox
          className="mt-0.5"
          checked={all || (some && "indeterminate")}
          onCheckedChange={() => {
            onToggleGroup(group)
          }}
          disabled={disabled}
          aria-label={t("superAdmin.cache.selectModule", { module: group.label })}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">{group.label}</h2>
            <Badge variant="outline" className="font-mono text-[11px]">
              {group.module}
            </Badge>
            <span className="text-[11px] text-muted-foreground">
              {t("superAdmin.cache.keyCount", { count: group.keys })}
            </span>
          </div>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{group.description}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onClearGroup(group)
          }}
          disabled={disabled || group.keys === 0}
        >
          {t("superAdmin.cache.clearModule")}
        </Button>
      </header>

      <ul className="divide-y divide-border/60">
        {group.namespaces.map((ns) => {
          const checked = selection.has(ns.key)
          return (
            <li key={ns.key}>
              {/* The whole row is the control, so the click target is
							    the description rather than a 16px box. The row itself
							    carries the checkbox role — a <label> wrapping a Radix
							    checkbox would fire the toggle twice on a direct hit. */}
              <div
                role="checkbox"
                aria-checked={checked}
                aria-disabled={disabled}
                tabIndex={disabled ? -1 : 0}
                onClick={() => {
                  if (!disabled) onToggleNamespace(ns.key)
                }}
                onKeyDown={(e) => {
                  if (disabled || (e.key !== " " && e.key !== "Enter")) return
                  e.preventDefault() // Space would otherwise scroll the page
                  onToggleNamespace(ns.key)
                }}
                className={cn(
                  "flex cursor-pointer items-start gap-3 p-4 transition-colors hover:bg-muted/40",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  checked && "bg-primary/5",
                  disabled && "cursor-not-allowed opacity-60",
                )}
              >
                {/* Presentational: the row above owns the semantics. */}
                <Checkbox
                  className="pointer-events-none mt-0.5"
                  checked={checked}
                  tabIndex={-1}
                  aria-hidden
                  disabled={disabled}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-medium text-foreground">{ns.label}</span>
                    <ImpactBadge impact={ns.impact} />
                    <span className="text-[11px] text-muted-foreground">
                      {t("superAdmin.cache.keyCount", { count: ns.keys })}
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] text-muted-foreground">{ns.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {ns.patterns.map((p) => (
                      <code
                        key={p}
                        className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
                      >
                        {p}
                      </code>
                    ))}
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
