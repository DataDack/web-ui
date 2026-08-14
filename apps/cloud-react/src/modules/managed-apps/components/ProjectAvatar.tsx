import type { CSSProperties } from "react"

import { cn } from "@datadack/common-ui"

import type { ProjectType } from "../managed-apps.types"
import { FRAMEWORK_MARKS } from "./project-type"

/**
 * Two projects on the same repository, with the same branch and the same last
 * commit, are otherwise indistinguishable at a glance — which is exactly what
 * the overview showed. A mark per project fixes that, and brings colour to a
 * page whose only other colour is status.
 *
 * When the project type is known the mark is the framework's own logo: it says
 * "this is a Next.js app" before the type label is read, and it is what every
 * other deploy console shows in this slot. The initial below is the fallback
 * for a type with no brand mark — its hue is derived from the id, so it is
 * stable forever and needs no storage.
 */
function hueOf(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 360
  }
  return hash
}

interface ProjectAvatarProps {
  /** Stable identity — the project id, never the name (names change). */
  seed: string
  /** Rendered inside the mark when there is no logo; the project's first character. */
  label: string
  /** Which framework's logo to show. Omitted falls back to the initial. */
  type?: ProjectType
  className?: string
}

export function ProjectAvatar({ seed, label, type, className }: Readonly<ProjectAvatarProps>) {
  const mark = type ? FRAMEWORK_MARKS[type] : undefined

  if (mark) {
    const Icon = mark.icon
    return (
      <span
        aria-hidden
        className={cn(
          // Background and edge are mixed from the mark's own colour, so the
          // tile is tinted by the framework rather than by a second palette.
          "grid size-9 shrink-0 place-items-center rounded-lg",
          "bg-[color-mix(in_srgb,currentColor_10%,transparent)]",
          "ring-1 ring-[color-mix(in_srgb,currentColor_22%,transparent)]",
          "text-[var(--fw-mark)] dark:text-[var(--fw-mark-dark)]",
          className,
        )}
        style={
          {
            "--fw-mark": mark.color,
            "--fw-mark-dark": mark.colorDark ?? mark.color,
          } as CSSProperties
        }
      >
        <Icon className="size-[55%]" />
      </span>
    )
  }

  const hue = hueOf(seed)

  return (
    <span
      aria-hidden
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-lg text-[13px] font-semibold text-white/95 ring-1 ring-black/5",
        className,
      )}
      style={{
        backgroundImage: `linear-gradient(135deg, hsl(${String(hue)} 70% 52%), hsl(${String((hue + 38) % 360)} 68% 42%))`,
      }}
    >
      {label.slice(0, 1).toUpperCase()}
    </span>
  )
}
