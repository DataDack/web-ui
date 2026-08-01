import { MoreHorizontal } from "lucide-react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@datadack/common-ui"
import { cn } from "@/lib/utils"

import { MANAGED_APPS_ROUTES } from "../../managed-apps.constants"
import type { ProjectEntry } from "../../managed-apps.state"
import type { Project } from "../../managed-apps.types"

interface ProjectActionsMenuProps {
  entry: ProjectEntry
  deploying: boolean
  onDeploy: (project: Project) => void
  onDelete: (project: Project) => void
  className?: string
}

/**
 * Every action a project has, in one menu shared by the card and the table row.
 *
 * Shared rather than written twice because the two views are the same project
 * seen two ways: a menu that offered "Finish setup" on a card and not in the
 * table would be a bug the user experiences as the product forgetting what it
 * told them a moment ago.
 *
 * Navigation items are `asChild` links, not `onClick` handlers, so middle-click
 * and open-in-new-tab keep working — which is why this does not use the console's
 * generic `actionsColumn`, whose items are click handlers.
 *
 * The trigger is always visible. `opacity-0 group-hover:opacity-100` hid the only
 * actions menu behind a hover state that does not exist on a touch screen.
 */
export function ProjectActionsMenu({
  entry,
  deploying,
  onDeploy,
  onDelete,
  className,
}: Readonly<ProjectActionsMenuProps>) {
  const { project, state } = entry

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Actions for ${project.name}`}
          className={cn("shrink-0 text-muted-foreground", className)}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {state.kind === "awaiting_setup" && (
          <DropdownMenuItem asChild>
            <Link to={MANAGED_APPS_ROUTES.setup(project.id)}>Finish setup</Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          disabled={!state.canDeploy || deploying}
          onSelect={() => {
            onDeploy(project)
          }}
        >
          {state.kind === "awaiting_build" ? "Deploy now" : "Rebuild"}
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={`${MANAGED_APPS_ROUTES.project(project.id)}?tab=builds`}>View builds</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={`${MANAGED_APPS_ROUTES.project(project.id)}?tab=settings`}>Settings</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => {
            onDelete(project)
          }}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
