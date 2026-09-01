import { type CSSProperties, useState } from "react"

import { Button, CopyButton, Input } from "@datadack/common-ui"
import { ExternalLink, Lock, Tag } from "lucide-react"
import { useTranslation } from "react-i18next"

import { FieldRow, Section } from "@/components/console"

import { PROJECT_TYPE_META } from "../../../components"
import { markFor } from "../../../components/framework-marks"
import { useUpdateProject } from "../../../managed-apps.hooks"
import type { Project } from "../../../managed-apps.types"

const NAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/

/**
 * Name, address and runtime.
 *
 * Renaming does NOT move the public address: the subdomain was allocated at
 * creation and the customer may already have shared it. That used to be a
 * sentence under the name field; it is a row of its own now, with the address
 * copyable, because the fastest way to stop someone worrying about a rename is
 * to show them the thing that will not change.
 *
 * The runtime is shown but NOT editable. It is not a label: it decides the build
 * workflow that was committed to the customer's repository — the install and
 * build commands, the directory that gets packed, and how the output is turned
 * into a container image. Switching it here would leave that repository running
 * a workflow for the other runtime, so every build in between would fail on a
 * mismatch nothing on this page could explain. A different runtime is a
 * different project.
 *
 * Both immutable rows carry a lock. They were dashed boxes with no glyph, which
 * reads as a disabled input — as something broken rather than something decided.
 */
export function GeneralSection({ project }: Readonly<{ project: Project }>) {
  const { t } = useTranslation()
  const isN8n = project.project_type === "n8n"
  const [name, setName] = useState(project.name)
  const update = useUpdateProject(project.id)

  let nameError: string | undefined
  if (name.trim() === "") nameError = "Name is required"
  else if (!NAME_PATTERN.test(name)) nameError = "Lowercase letters, digits and hyphens only"

  const dirty = name !== project.name

  const runtime = PROJECT_TYPE_META[project.project_type]
  // The framework's OWN logo, not lucide's stand-in. A runtime row that shows
  // the Next.js mark says what it is before the word is read, and the same map
  // already colours every project tile in the list.
  // Keyed on the catalogue framework, falling back to the legacy type. Reading
  // project_type alone only ever answered OpenNext or React, so this row showed
  // the React atom next to "Astro", "Hugo" and every other framework.
  const mark = markFor(project.framework?.trim() || project.project_type)
  const MarkIcon = mark.icon

  return (
    <Section
      variant="panel"
      icon={Tag}
      tone="neutral"
      title="General"
      description={t("managedApps.generalSection.howThisProjectIsIdentifiedInTheConsole")}
    >
      <div className="space-y-5">
        <FieldRow
          label="Name"
          htmlFor="settings-name"
          error={nameError}
          description="Lowercase letters, digits and hyphens. Shown in the console and on your builds."
        >
          <Input
            id="settings-name"
            value={name}
            className="font-mono sm:w-80"
            onChange={(event) => {
              setName(event.target.value)
            }}
          />
        </FieldRow>

        <FieldRow
          label="Public address"
          description="Allocated when the project was created. A rename does not move it, so links already shared keep working."
          aside={
            <a
              href={project.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-status-info hover:underline"
            >
              Visit
              <ExternalLink className="size-3" />
            </a>
          }
        >
          <div className="flex h-9 items-center gap-2 rounded-md border border-dashed border-border glass-1-bg-raised px-3 sm:w-80">
            <Lock className="size-3.5 shrink-0 text-muted-foreground" />
            <CopyButton value={project.subdomain} className="min-w-0 flex-1 text-[13px]" />
          </div>
        </FieldRow>

        {!isN8n && (
          <FieldRow
            label="Runtime"
            description="Set when the project was created. It determines the build workflow in your repository, so it cannot be changed here — create a new project to build this repository a different way."
          >
            <div className="flex h-9 items-center gap-2 rounded-md border border-dashed border-border glass-1-bg-raised px-3 sm:w-80">
              <MarkIcon
                aria-hidden
                className="size-4 shrink-0 text-[var(--fw-mark)] dark:text-[var(--fw-mark-dark)]"
                style={
                  {
                    "--fw-mark": mark.color,
                    "--fw-mark-dark": mark.colorDark ?? mark.color,
                  } as CSSProperties
                }
              />
              <span className="text-sm">{runtime.label}</span>
              <Lock className="ml-auto size-3.5 shrink-0 text-muted-foreground" />
            </div>
          </FieldRow>
        )}

        <Button
          size="sm"
          className="gap-1.5"
          disabled={!dirty || Boolean(nameError) || update.isPending}
          onClick={() => {
            update.mutate({ name })
          }}
          loading={update.isPending}
        >
          Save changes
        </Button>
      </div>
    </Section>
  )
}
