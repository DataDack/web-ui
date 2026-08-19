import type { ReactNode } from "react"

import { cn, Tabs, TabsList, TabsTrigger } from "@datadack/common-ui"
import { CreditCard, Table2 } from "lucide-react"

import { SETTINGS_SECTIONS, type SettingsSection } from "./settings-sections"
import { GitHubMark } from "../../../components/GitHubMark"

const SECTION_META: Record<SettingsSection, { label: string; icon: ReactNode }> = {
  plan: { label: "Plan", icon: <CreditCard /> },
  compare: { label: "Compare plans", icon: <Table2 /> },
  github: { label: "GitHub connections", icon: <GitHubMark /> },
}

interface SettingsNavProps {
  active: SettingsSection
  onSelect: (section: SettingsSection) => void
  className?: string
}

/**
 * The settings page's own nav — one tab per section, above the panel.
 *
 * It used to be a 232px column down the left, which cost the panel a seventh of
 * the page for three items that fit comfortably on one line. A tab strip gives
 * the width back to the thing being read: the comparison table in particular is
 * five columns wide and was being squeezed for the sake of a nav that never
 * needed the room.
 *
 * The underline tabs are the console's own page-level chrome (the same ones the
 * project detail page uses), so a section here reads like a tab anywhere else.
 * The parent still writes ?section= itself, so a section is a link and back
 * still works between them.
 */
export function SettingsNav({ active, onSelect, className }: Readonly<SettingsNavProps>) {
  return (
    <Tabs
      value={active}
      onValueChange={(next) => {
        onSelect(next as SettingsSection)
      }}
      className={cn("gap-0", className)}
    >
      <TabsList aria-label="Settings sections">
        {SETTINGS_SECTIONS.map((section) => {
          const { label, icon } = SECTION_META[section]
          return (
            <TabsTrigger key={section} value={section} className="gap-1.5 px-3 py-2 text-[13px]">
              {icon}
              {label}
            </TabsTrigger>
          )
        })}
      </TabsList>
    </Tabs>
  )
}
