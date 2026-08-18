/**
 * The settings page's sub-pages, held in ?section= so each one is a link.
 *
 * Their own module rather than SettingsNav.tsx: the page shell and the nav both
 * need them, and a component file that also exports constants loses fast refresh.
 */
export const SETTINGS_SECTIONS = ["plan", "compare", "github"] as const
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number]
export const DEFAULT_SETTINGS_SECTION: SettingsSection = "plan"

export function parseSettingsSection(raw: string | null): SettingsSection {
  return SETTINGS_SECTIONS.find((section) => section === raw) ?? DEFAULT_SETTINGS_SECTION
}
