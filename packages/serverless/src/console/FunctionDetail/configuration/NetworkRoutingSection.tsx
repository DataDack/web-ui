import type { CSSProperties, KeyboardEvent } from "react"

import { Globe2, Link2, Network } from "lucide-react"

import { css, cx, fontMono, mix } from "@datadack/common-ui"

import type { FunctionEntity } from "../../../data/types"
import type { FunctionDetailLabels } from "../labels"
import { EdgeSection } from "./EdgeSection"
import { FunctionUrlSection } from "./FunctionUrlSection"
import { NetworkSection } from "./NetworkSection"

export type NetworkTab = "url" | "vpc" | "edge"

const tabs = [
  { value: "url", label: "URL routing", detail: "Endpoint", icon: Link2 },
  { value: "vpc", label: "VPC connectivity", detail: "Private", icon: Network },
  { value: "edge", label: "Edge distribution", detail: "Global", icon: Globe2 },
] as const

const tabViewport = css`
  max-width: 100%;
  overflow-x: auto;
  border: 1px solid ${mix("--border", 58)};
  border-radius: 0.625rem;
  background: ${mix("--background", 72)};
  padding: 0 7px;
`

const tabList = css`
  --network-tab-index: 0;
  position: relative;
  display: grid;
  min-width: 444px;
  align-items: stretch;
  grid-template-columns: repeat(3, minmax(148px, 1fr));
`

const selector = css`
  position: absolute;
  z-index: 0;
  top: 0;
  bottom: 0;
  left: 0;
  width: 33.3333%;
  border-bottom: 2px solid var(--brand-gold);
  background: ${mix("--brand-gold", 8)};
  pointer-events: none;
  transform: translateX(calc(var(--network-tab-index) * 100%));
  transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const tab = css`
  position: relative;
  z-index: 1;
  display: grid;
  min-width: 148px;
  min-height: 58px;
  align-items: center;
  grid-template-columns: 30px minmax(0, 1fr);
  gap: 10px;
  border: 0;
  border-right: 1px solid ${mix("--border", 45)};
  border-radius: 0;
  background: transparent;
  padding: 9px 14px;
  text-align: left;
  white-space: nowrap;
  color: var(--muted-foreground);
  cursor: pointer;
  transition:
    background-color 140ms ease,
    color 140ms ease;

  &:last-child {
    border-right: 0;
  }

  &:hover {
    background: ${mix("--foreground", 4)};
    color: var(--foreground);
  }

  &:focus-visible {
    outline: none;
    z-index: 1;
    box-shadow: inset 0 0 0 2px ${mix("--ring", 55)};
  }
`

const activeTab = css`
  color: var(--foreground);
`

const iconTile = css`
  display: flex;
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
  border: 1px solid ${mix("--border", 62)};
  border-radius: 0.375rem;
  background: ${mix("--foreground", 4)};
  color: var(--muted-foreground);
`

const activeIcon = css`
  border-color: ${mix("--brand-gold", 32)};
  background: ${mix("--brand-gold", 10)};
  color: var(--brand-gold);
`

const tabCopy = css`
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
`

const tabLabel = css`
  font-size: 11.5px;
  font-weight: 600;
  color: inherit;
`

const tabDetail = css`
  font-family: ${fontMono};
  font-size: 8.5px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: ${mix("--muted-foreground", 72)};
`

export interface NetworkRoutingSectionProps {
  fn: FunctionEntity
  scope?: string
  labels: FunctionDetailLabels
  selected: NetworkTab
}

export function NetworkRoutingTabs({
  selected,
  onSelect,
}: Readonly<{ selected: NetworkTab; onSelect: (tab: NetworkTab) => void }>) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = tabs.findIndex((tab_) => tab_.value === selected)
    let next: number
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length
    else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length
    else if (event.key === "Home") next = 0
    else if (event.key === "End") next = tabs.length - 1
    else return

    event.preventDefault()
    const nextTab = tabs[next]
    if (nextTab) {
      onSelect(nextTab.value)
      document.getElementById(`network-tab-${nextTab.value}`)?.focus()
    }
  }

  const selectedIndex = tabs.findIndex((tab_) => tab_.value === selected)

  return (
    <div className={tabViewport}>
      <div
        className={tabList}
        role="tablist"
        aria-label="Network configuration"
        tabIndex={-1}
        onKeyDown={onKeyDown}
        style={{ "--network-tab-index": selectedIndex } as CSSProperties}
      >
        <span className={selector} aria-hidden />
        {tabs.map((tab_) => {
          const active = tab_.value === selected
          const Icon = tab_.icon
          return (
            <button
              key={tab_.value}
              type="button"
              role="tab"
              id={`network-tab-${tab_.value}`}
              aria-selected={active}
              aria-controls={`network-panel-${tab_.value}`}
              tabIndex={active ? 0 : -1}
              className={cx(tab, active && activeTab)}
              onClick={() => {
                onSelect(tab_.value)
              }}
            >
              <span className={cx(iconTile, active && activeIcon)}>
                <Icon size={14} aria-hidden />
              </span>
              <span className={tabCopy}>
                <span className={tabLabel}>{tab_.label}</span>
                <span className={tabDetail}>{tab_.detail}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function NetworkRoutingSection({
  fn,
  scope,
  labels,
  selected,
}: Readonly<NetworkRoutingSectionProps>) {
  return (
    <section
      aria-label="Network routing"
      role="tabpanel"
      id={`network-panel-${selected}`}
      aria-labelledby={`network-tab-${selected}`}
    >
      {selected === "url" && <FunctionUrlSection fn={fn} scope={scope} labels={labels} />}
      {selected === "vpc" && <NetworkSection fn={fn} />}
      {selected === "edge" && <EdgeSection fn={fn} />}
    </section>
  )
}
