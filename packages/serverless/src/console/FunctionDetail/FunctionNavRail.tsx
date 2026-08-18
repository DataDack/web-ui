import { ArrowLeft, Container, Package, type LucideIcon } from "lucide-react"

import { css, cx, fontMono, mix, StatusBadge } from "@datadack/common-ui"

import { CONFIGURATION_SECTIONS, type ConfigurationSectionValue } from "./configuration/sections"
import type { FunctionDetailLabels } from "./labels"
import { FUNCTION_DETAIL_TABS, type FunctionDetailTabValue } from "./tabs"
import type { FunctionEntity } from "../../data/types"

/**
 * Which rail group a tab belongs to. Configuration is not here: its entry in
 * the rail is the section list itself, so clicking a section IS clicking the
 * tab.
 */
const GROUP_OF_TAB: Record<FunctionDetailTabValue, "build" | "release" | "configuration"> = {
  code: "build",
  test: "build",
  monitor: "build",
  configuration: "configuration",
  aliases: "release",
  versions: "release",
}

const rail = css`
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  width: 232px;
  min-height: 0;
  gap: 4px;
  overflow: hidden auto;
  border-right: 1px solid ${mix("--border", 55)};
  background: var(--glass-1-bg);
  padding-bottom: 12px;
`

const identity = css`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 14px 12px;
  min-width: 0;
`

const iconTile = css`
  display: flex;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  border: 1px solid ${mix("--brand-gold", 28)};
  background: ${mix("--brand-gold", 8)};
`

const tileIcon = css`
  width: 16px;
  height: 16px;
  color: var(--brand-gold);
`

const identityCopy = css`
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
`

const railName = css`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: ${fontMono};
  font-size: 13px;
  font-weight: 600;
  color: var(--foreground);
`

const railMeta = css`
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  font-family: ${fontMono};
  font-size: 10.5px;
  color: var(--muted-foreground);
`

const backLink = css`
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0 8px 6px;
  border: none;
  border-radius: 0.375rem;
  background: transparent;
  padding: 7px 8px;
  font-size: 12px;
  color: var(--muted-foreground);
  text-align: left;
  cursor: pointer;

  &:hover {
    background: ${mix("--accent", 40)};
    color: var(--foreground);
  }
`

const groupLabel = css`
  padding: 12px 16px 5px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${mix("--muted-foreground", 75)};
`

const item = css`
  display: flex;
  width: calc(100% - 16px);
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 0 8px;
  border: none;
  border-radius: 0.375rem;
  background: transparent;
  padding: 7px 10px;
  text-align: left;
  font-size: 13px;
  color: var(--muted-foreground);
  cursor: pointer;

  &:hover {
    background: ${mix("--accent", 40)};
    color: var(--foreground);
  }
`

const itemActive = css`
  background: ${mix("--brand-gold", 10)};
  color: var(--foreground);
  box-shadow: inset 2px 0 0 var(--brand-gold);

  &:hover {
    background: ${mix("--brand-gold", 10)};
  }
`

const itemLabel = css`
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 9px;
`

const itemIcon = css`
  width: 14px;
  height: 14px;
  flex-shrink: 0;
`

const itemText = css`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const soonChip = css`
  flex-shrink: 0;
  font-family: ${fontMono};
  font-size: 9.5px;
  color: ${mix("--muted-foreground", 70)};
`

export interface FunctionNavRailProps {
  fn: FunctionEntity
  labels: FunctionDetailLabels
  /** Tabs this console actually offers, already capability-filtered. */
  tabs: readonly FunctionDetailTabValue[]
  /** Configuration sections this console offers, already capability-filtered. */
  sections: readonly ConfigurationSectionValue[]
  activeTab: FunctionDetailTabValue
  activeSection: ConfigurationSectionValue
  onSelectTab: (tab: FunctionDetailTabValue) => void
  onSelectSection: (section: ConfigurationSectionValue) => void
  /** Renders the "back to the list" row. Omit to leave the rail head bare. */
  onBack?: () => void
  className?: string
}

/**
 * The function's own sidebar.
 *
 * The detail page is full-bleed — the console's service sidebar steps aside for
 * it — so navigation between a function's surfaces has to live somewhere inside
 * the page. A rail rather than a tab strip because there are sixteen
 * destinations once the configuration sections join the tabs, and sixteen
 * things do not fit on one line; grouping them vertically is what lets Code sit
 * next to Environment variables without either being buried in a submenu.
 */
export function FunctionNavRail({
  fn,
  labels,
  tabs,
  sections,
  activeTab,
  activeSection,
  onSelectTab,
  onSelectSection,
  onBack,
  className,
}: Readonly<FunctionNavRailProps>) {
  const TileIcon = fn.packageType === "image" ? Container : Package
  const buildTabs = FUNCTION_DETAIL_TABS.filter(
    (tab) => tabs.includes(tab.value) && GROUP_OF_TAB[tab.value] === "build",
  )
  const releaseTabs = FUNCTION_DETAIL_TABS.filter(
    (tab) => tabs.includes(tab.value) && GROUP_OF_TAB[tab.value] === "release",
  )
  const configSections = CONFIGURATION_SECTIONS.filter((section) =>
    sections.includes(section.value),
  )
  const showConfig = tabs.includes("configuration") && configSections.length > 0

  const row = (
    key: string,
    Icon: LucideIcon,
    text: string,
    active: boolean,
    onClick: () => void,
    soon?: boolean,
  ) => (
    <button
      key={key}
      type="button"
      className={cx(item, active && itemActive)}
      aria-current={active || undefined}
      onClick={onClick}
    >
      <span className={itemLabel}>
        <Icon className={itemIcon} aria-hidden />
        <span className={itemText}>{text}</span>
      </span>
      {soon && <span className={soonChip}>{labels.configuration.soon}</span>}
    </button>
  )

  return (
    <nav className={cx(rail, className)} aria-label={labels.nav.label}>
      <div className={identity}>
        <span className={iconTile} aria-hidden>
          <TileIcon className={tileIcon} />
        </span>
        <span className={identityCopy}>
          <span className={railName} title={fn.name}>
            {fn.name}
          </span>
          <span className={railMeta}>
            <StatusBadge status={fn.state} pulse={fn.state.toLowerCase() === "active"} />
            {fn.region}
          </span>
        </span>
      </div>

      {onBack && (
        <button type="button" className={backLink} onClick={onBack}>
          <ArrowLeft size={13} />
          {labels.nav.functions}
        </button>
      )}

      {buildTabs.length > 0 && (
        <>
          <p className={groupLabel}>{labels.nav.groups.build}</p>
          {buildTabs.map((tab) =>
            row(tab.value, tab.icon, labels.tabs[tab.value], activeTab === tab.value, () => {
              onSelectTab(tab.value)
            }),
          )}
        </>
      )}

      {showConfig && (
        <>
          <p className={groupLabel}>{labels.nav.groups.configuration}</p>
          {configSections.map((section) =>
            row(
              section.value,
              section.icon,
              labels.configuration.nav[section.value],
              activeTab === "configuration" && activeSection === section.value,
              () => {
                onSelectSection(section.value)
              },
              section.soon,
            ),
          )}
        </>
      )}

      {releaseTabs.length > 0 && (
        <>
          <p className={groupLabel}>{labels.nav.groups.release}</p>
          {releaseTabs.map((tab) =>
            row(tab.value, tab.icon, labels.tabs[tab.value], activeTab === tab.value, () => {
              onSelectTab(tab.value)
            }),
          )}
        </>
      )}
    </nav>
  )
}
