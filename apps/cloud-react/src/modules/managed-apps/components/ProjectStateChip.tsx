import { Loader2 } from "lucide-react"

import { TONE_CLASSES, TONE_DOT_CLASSES } from "@/components/console/status-config"
import { cn } from "@/lib/utils"

import { Badge } from "@datadack/common-ui"

import type { ProjectState } from "../managed-apps.state"

interface ProjectStateChipProps {
  state: ProjectState
  className?: string
}

/**
 * The one badge for a project's deployment state. Never render `project.status`
 * here — see managed-apps.state.ts for why that column cannot answer whether an
 * app is deployed.
 */
export function ProjectStateChip({ state, className }: Readonly<ProjectStateChipProps>) {
  const Icon = state.icon

  let marker
  if (state.busy) {
    marker = <Loader2 className="size-3 animate-spin" />
  } else if (state.kind === "live") {
    // Only a genuinely serving app earns the live pulse, matching the
    // console-wide convention (DetailPage.tsx:97).
    marker = (
      <span className={cn("size-1.5 animate-pulse rounded-full", TONE_DOT_CLASSES[state.tone])} />
    )
  } else {
    marker = <Icon className="size-3" />
  }

  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 font-mono text-[11px]", TONE_CLASSES[state.tone], className)}
    >
      {marker}
      {state.label}
    </Badge>
  )
}
