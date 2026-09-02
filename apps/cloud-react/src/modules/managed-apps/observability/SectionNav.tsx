import { cn } from "@datadack/common-ui"

import { groupsForTab, isLive, SECTION_GROUP_LABELS, sectionsIn, type SectionTab } from "./sections"

/**
 * The section rail.
 *
 * A rail rather than a tab strip because there are seventeen destinations and
 * they fall into five natural groups — Traffic, Compute, Delivery, Security,
 * Deploys — which is where a question lands before the reader knows which page
 * answers it. Seventeen tabs in a row is a menu you have to read twice.
 *
 * A section with no live meter is still listed, dimmed. Hiding it would be the
 * tidier choice and the wrong one: what the platform measures is part of what a
 * customer is choosing, and a page that says "this is coming and here is what
 * it will show" is worth more than the same page silently absent.
 */
export function SectionNav({
  tab,
  active,
  onSelect,
}: Readonly<{ tab: SectionTab; active: string; onSelect: (key: string) => void }>) {
  const groups = groupsForTab(tab)
  return (
    <nav aria-label="Observability sections" className="w-full shrink-0 lg:w-52">
      <ul className="space-y-4">
        {groups.map((group) => (
          <li key={group}>
            <p className="px-2 pb-1 text-[10px] font-medium tracking-wide text-muted-foreground/70 uppercase">
              {SECTION_GROUP_LABELS[group]}
            </p>
            <ul className="space-y-0.5">
              {sectionsIn(group).map((section) => {
                const Icon = section.icon
                const live = isLive(section)
                const selected = active === section.key
                return (
                  <li key={section.key}>
                    <button
                      type="button"
                      // The rail is a listbox of destinations, so the current
                      // one is announced rather than only coloured.
                      aria-current={selected ? "page" : undefined}
                      onClick={() => {
                        onSelect(section.key)
                      }}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                        selected
                          ? "glass-1-bg-raised font-medium text-foreground"
                          : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-3.5 shrink-0",
                          selected && "text-brand-gold",
                          !live && "opacity-50",
                        )}
                      />
                      <span className={cn("min-w-0 truncate", !live && "opacity-70")}>
                        {section.label}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  )
}
