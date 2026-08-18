import type { ComponentType } from "react"

import { cn } from "@datadack/common-ui"
import { CreditCard, Table2 } from "lucide-react"

import { SETTINGS_SECTIONS, type SettingsSection } from "./settings-sections"
import { GitHubMark } from "../../../components/GitHubMark"

/** Both lucide glyphs and the inline Octocat answer this shape. */
type SectionIcon = ComponentType<{ className?: string }>

const SECTION_META: Record<SettingsSection, { label: string; icon: SectionIcon }> = {
  plan: { label: "Plan", icon: CreditCard },
  compare: { label: "Compare plans", icon: Table2 },
  github: { label: "GitHub connections", icon: GitHubMark },
}

interface SettingsNavProps {
  active: SettingsSection
  onSelect: (section: SettingsSection) => void
  className?: string
}

/**
 * The settings page's own nav — one panel per section rather than one long
 * scroll.
 *
 * The page had grown three unrelated concerns stacked vertically (the account's
 * tier, a five-column comparison table, and the GitHub accounts we can read
 * repositories from), and the table alone was taller than a screen. Splitting
 * them means the thing you came to change is the thing on screen.
 *
 * Buttons rather than links: the parent writes ?section= itself, so the section
 * is still addressable and back still works, without every item having to
 * rebuild the whole query string.
 */
export function SettingsNav({ active, onSelect, className }: Readonly<SettingsNavProps>) {
  return (
    <nav
      aria-label="Settings sections"
      className={cn(
        // Below md this is a scrolling strip above the panel; from md it is
        // the column on the left, the width the console's other section navs use.
        "flex shrink-0 gap-1 overflow-x-auto rounded-[0.625rem] border border-border/60 bg-muted/20 p-1.5 md:w-[232px] md:flex-col md:overflow-visible",
        className,
      )}
    >
      {SETTINGS_SECTIONS.map((section) => {
        const { label, icon: Icon } = SECTION_META[section]
        const current = section === active

        return (
          <button
            key={section}
            type="button"
            aria-current={current || undefined}
            onClick={() => {
              onSelect(section)
            }}
            className={cn(
              "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-2.5 py-2 text-left text-[13px] text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground",
              current &&
                "bg-primary/10 text-foreground shadow-[inset_2px_0_0_var(--primary)] hover:bg-primary/10",
            )}
          >
            <Icon className="size-3.5 shrink-0" />
            {label}
          </button>
        )
      })}
    </nav>
  )
}
