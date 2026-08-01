import { Badge } from "@datadack/common-ui"

import { cn } from "@/lib/utils"

import type { ProjectType } from "../managed-apps.types"
import { PROJECT_TYPE_META, projectTypeLabel } from "./project-type"

interface ProjectTypeIconProps {
  type: ProjectType
  className?: string
}

/** Bare glyph for a project type (table cells, headers). */
export function ProjectTypeIcon({ type, className }: Readonly<ProjectTypeIconProps>) {
  const Icon = PROJECT_TYPE_META[type].icon
  return <Icon className={cn("size-4", className)} />
}

interface ProjectTypeBadgeProps {
  type: ProjectType
  className?: string
}

/** Icon + label pill for a project type. */
export function ProjectTypeBadge({ type, className }: Readonly<ProjectTypeBadgeProps>) {
  return (
    <Badge variant="outline" className={cn("gap-1.5 text-[11px]", className)}>
      <ProjectTypeIcon type={type} className="size-3" />
      {projectTypeLabel(type)}
    </Badge>
  )
}
