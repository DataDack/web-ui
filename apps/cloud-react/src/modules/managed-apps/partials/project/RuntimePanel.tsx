import { useTranslation } from "react-i18next"

import { Section } from "@/components/console"

import type { Project } from "../../managed-apps.types"

/**
 * The one runtime case that needs a paragraph: a container project with no
 * container.
 *
 * Runtime and networking for everything else — every serverless project, every
 * provisioned container — are two facts in the deployment card's grid now,
 * beside the branch and the commit that produced them. Two fields did not
 * justify a titled card of their own three screens further down.
 *
 * What is left is the case a fact grid would lie about. A project whose builds
 * land and whose artifacts are stored, but whose region has no runtime fleet,
 * has to be told that in words: two em-dashes would leave the reader wondering
 * whether something broke. An honest absence beats an ambiguous one.
 */
export function RuntimePanel({ project }: Readonly<{ project: Project }>) {
  const { t } = useTranslation()
  const serverless = project.runtime_target === "serverless"
  const provisioned = project.served || project.proxmox_ct_id !== 0

  // Said in the deployment card instead, where it is one line rather than a box.
  if (serverless || provisioned) return null

  return (
    <Section variant="panel" title="Runtime">
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
    </Section>
  )
}
