import { useTranslation } from "react-i18next"
import { KeyValueGrid, Section } from "@/components/console"

import type { Project } from "../../managed-apps.types"

/**
 * The runtime container a project is served from.
 *
 * Every field here is written by the container provisioner, which does not
 * exist yet — so the panel says "waiting for the runtime fleet" rather than
 * rendering three em-dashes and letting the user wonder whether something
 * broke. An honest absence beats an ambiguous one.
 */
export function RuntimePanel({ project }: Readonly<{ project: Project }>) {
  const { t } = useTranslation()
  const provisioned = project.served || project.proxmox_ct_id !== 0

  return (
    <Section
      variant="panel"
      title="Runtime"
      description={provisioned ? "The container this project is served from." : undefined}
    >
      {provisioned ? (
        <KeyValueGrid
          columns={2}
          items={[
            {
              label: "Container ID",
              value: project.proxmox_ct_id ? String(project.proxmox_ct_id) : "—",
              mono: true,
            },
            {
              // The container's address is deliberately absent: it sits on a
              // private fabric only the edge gateway can reach, so there is
              // nothing here a customer could connect to.
              label: "Networking",
              value: project.vpc_id ? "VPC bound" : "Private, behind the edge",
            },
          ]}
        />
      ) : (
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            {t("managedApps.runtimePanel.noRuntimeContainerYet")}
          </p>
          <p className="text-[12px] text-muted-foreground/80">
            Builds run and artifacts are stored, but the runtime fleet is not provisioned in this
            region — so nothing serves the public address yet.
            {project.vpc_id
              ? " The VPC binding you chose is stored and will be applied when it is."
              : ""}
          </p>
        </div>
      )}
    </Section>
  )
}
