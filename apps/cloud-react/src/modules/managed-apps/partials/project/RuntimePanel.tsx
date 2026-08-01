import { CopyButton, KeyValueGrid, Section } from "@/components/console"

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
    const provisioned = project.container_ip !== "" || project.proxmox_ct_id !== 0

    return (
        <Section
            variant="panel"
            title="Runtime"
            description={provisioned ? "The container this project is served from." : undefined}
        >
            {provisioned ? (
                <KeyValueGrid
                    columns={3}
                    items={[
                        {
                            label: "Container IP",
                            value: project.container_ip ? (
                                <CopyButton value={project.container_ip} />
                            ) : (
                                <span className="text-muted-foreground">Not assigned</span>
                            ),
                        },
                        {
                            label: "Container ID",
                            value: project.proxmox_ct_id ? String(project.proxmox_ct_id) : "—",
                            mono: true,
                        },
                        {
                            label: "Private networking",
                            value: project.vpc_id ? "VPC bound" : "Public only",
                        },
                    ]}
                />
            ) : (
                <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">No runtime container yet.</p>
                    <p className="text-[12px] text-muted-foreground/80">
                        Builds run and artifacts are stored, but the runtime fleet is not
                        provisioned in this region — so nothing serves the public address yet.
                        {project.vpc_id
                            ? " The private-networking binding you chose is stored and will be applied when it is."
                            : ""}
                    </p>
                </div>
            )}
        </Section>
    )
}
