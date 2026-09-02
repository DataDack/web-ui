import { useState } from "react"

import { ResourceDomainsTab } from "@/modules/domains/partials/ResourceDomainsTab"

import { AppAddressDialog } from "./AppAddressDialog"
import type { Project } from "../../managed-apps.types"

/**
 * The project's Domains tab: the shared registry table, plus the one thing only
 * this product can do with a row in it — move the platform-provided address.
 *
 * The table itself is generic and stays that way. It knows a row is
 * platform-minted; it does not know that a managed app's minted name is stored
 * on the project and is editable there, which is why the action is handed in
 * from here rather than built into the table for every resource type.
 */
export function ProjectDomainsTab({ project }: Readonly<{ project: Project }>) {
  const [editing, setEditing] = useState(false)

  return (
    <>
      <ResourceDomainsTab
        // "mgd_app_project" is the registry's resource_type for a project — the
        // registry keys attachments by its own identifiers, not by routes.
        resourceType="mgd_app_project"
        resourceId={project.id}
        onEditManaged={() => {
          setEditing(true)
        }}
      />
      <AppAddressDialog project={project} open={editing} onOpenChange={setEditing} />
    </>
  )
}
