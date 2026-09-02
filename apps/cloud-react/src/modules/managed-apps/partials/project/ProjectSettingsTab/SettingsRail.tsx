import { ArrowUpRight } from "lucide-react"
import { Link } from "react-router-dom"

import { cn } from "@datadack/common-ui"

import {
  SETTINGS_DEPARTURES,
  type SettingsSectionId,
  type SettingsSectionMeta,
} from "./settings-sections"
import { MANAGED_APPS_ROUTES } from "../../../managed-apps.constants"

interface SettingsRailProps {
  projectId: string
  sections: SettingsSectionMeta[]
  active: SettingsSectionId
  onSelect: (id: SettingsSectionId) => void
  /** Rendered against Build & output — how many fields are overridden. */
  buildOverrides?: number
  /**
   * Sections that need looking at. A dot, not a count: the rail's job is to
   * say WHERE the problem is, and the section itself says what it is. Marking
   * every section that has an opinion would make the dot mean nothing.
   */
  attention?: Partial<Record<SettingsSectionId, boolean>>
}

const ROW =
  "group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors"

/** Gold marks the section currently in view. */
function iconTone(isActive: boolean): string {
  if (isActive) return "text-brand-gold-ink"
  return "text-muted-foreground group-hover:text-foreground"
}

/**
 * The rail — Settings' own navigation.
 *
 * It replaces a stack of five panels that were all on screen at once, which is
 * why the sections below it render ONE at a time: a page that shows everything
 * has no use for a map. Each entry is the whole of what that section holds, so
 * choosing "Git" gets Git and nothing else to scroll past.
 *
 * On viewports below `lg` the rail becomes a horizontally scrolling row of
 * chips above the content, because a 180px column and a form do not both fit.
 */
export function SettingsRail({
  projectId,
  sections,
  active,
  onSelect,
  buildOverrides = 0,
  attention,
}: Readonly<SettingsRailProps>) {
  return (
    <nav
      aria-label="Settings sections"
      className={cn(
        "flex gap-1 overflow-x-auto pb-1 lg:sticky lg:top-4 lg:flex-col lg:overflow-visible lg:pb-0",
        // The chip row scrolls; hiding its bar keeps it from stacking a
        // scrollbar on top of the content on trackpad-less machines.
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
      )}
    >
      {sections.map((section) => {
        const Icon = section.icon
        const isActive = section.id === active
        return (
          <button
            key={section.id}
            type="button"
            aria-current={isActive ? "page" : undefined}
            onClick={() => {
              onSelect(section.id)
            }}
            className={cn(
              ROW,
              "shrink-0 lg:shrink",
              isActive
                ? "glass-1-bg-raised font-medium text-foreground"
                : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
            )}
          >
            <Icon className={cn("size-4 shrink-0", iconTone(isActive))} />
            <span className="min-w-0">
              <span className="block truncate">{section.label}</span>
              {/* The hint is what makes the rail a map rather than a menu, but
                  it only earns its line where there is a column to hold it. */}
              <span className="hidden truncate text-[11px] font-normal text-muted-foreground lg:block">
                {section.hint}
              </span>
            </span>
            {attention?.[section.id] === true && (
              <span
                aria-label="Needs attention"
                className="ml-auto size-1.5 shrink-0 rounded-full bg-status-warning"
              />
            )}
            {section.id === "build" && buildOverrides > 0 && (
              <span className="ml-auto hidden shrink-0 rounded-full bg-brand-gold-soft px-1.5 font-mono text-[10px] text-brand-gold-ink lg:block">
                {buildOverrides}
              </span>
            )}
            {section.comingSoon === true && (
              <span className="ml-auto hidden shrink-0 rounded-full border border-border/70 px-1.5 py-0.5 font-mono text-[9px] tracking-wide text-muted-foreground uppercase lg:block">
                Soon
              </span>
            )}
          </button>
        )
      })}

      <span aria-hidden className="hidden h-px bg-border/60 lg:my-2 lg:block" />

      {SETTINGS_DEPARTURES.map((departure) => {
        const Icon = departure.icon
        return (
          <Link
            key={departure.tab}
            to={`${MANAGED_APPS_ROUTES.project(projectId)}?tab=${departure.tab}`}
            className={cn(ROW, "shrink-0 text-muted-foreground hover:text-foreground lg:shrink")}
          >
            <Icon className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0">
              <span className="block truncate">{departure.label}</span>
              <span className="hidden truncate text-[11px] text-muted-foreground lg:block">
                {departure.hint}
              </span>
            </span>
            <ArrowUpRight className="ml-auto hidden size-3 shrink-0 text-muted-foreground lg:block" />
          </Link>
        )
      })}
    </nav>
  )
}
