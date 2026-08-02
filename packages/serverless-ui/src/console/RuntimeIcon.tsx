import { css, cx } from "@datadack/common-ui"
import { Terminal } from "lucide-react"
import type { IconType } from "react-icons"
import { SiDotnet, SiGo, SiNodedotjs, SiOpenjdk, SiPython, SiRuby } from "react-icons/si"

interface FamilyBrand {
  Icon: IconType
  /** Official brand colour, so a runtime is recognisable before it is read. */
  color: string
  label: string
}

// `provided` doubles as the fallback for any family the catalog adds later, so
// a new runtime renders with a sane icon instead of crashing.
const FALLBACK: FamilyBrand = { Icon: Terminal, color: "#8A8A94", label: "Custom runtime" }

const BRANDS: Record<string, FamilyBrand> = {
  nodejs: { Icon: SiNodedotjs, color: "#5FA04E", label: "Node.js" },
  python: { Icon: SiPython, color: "#3776AB", label: "Python" },
  ruby: { Icon: SiRuby, color: "#CC342D", label: "Ruby" },
  java: { Icon: SiOpenjdk, color: "#F89820", label: "Java" },
  dotnet: { Icon: SiDotnet, color: "#512BD4", label: ".NET" },
  go: { Icon: SiGo, color: "#00ADD8", label: "Go" },
  // `provided.*` has no language of its own — the artifact brings its own
  // runtime, so a terminal reads truer than any language mark.
  provided: FALLBACK,
}

export function familyLabel(family: string): string {
  return BRANDS[family]?.label ?? family
}

const icon = css`
  width: 16px;
  height: 16px;
  flex: none;
`

export function RuntimeIcon({
  family,
  className,
  /** Brand colours are dropped on a selected/active surface that already tints. */
  monochrome = false,
}: Readonly<{ family: string; className?: string; monochrome?: boolean }>) {
  const brand = BRANDS[family] ?? FALLBACK
  const { Icon } = brand
  return (
    <Icon
      className={cx(icon, className)}
      style={monochrome ? undefined : { color: brand.color }}
      aria-hidden
    />
  )
}
