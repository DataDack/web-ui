import { useState } from "react"

import { Loader2 } from "lucide-react"

import { FieldRow, Section } from "@/components/console"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { PROJECT_TYPE_META } from "../../../components"
import { useUpdateProject } from "../../../managed-apps.hooks"
import type { Project } from "../../../managed-apps.types"

const NAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/

/**
 * Name and runtime.
 *
 * Renaming does NOT move the public address: the subdomain was allocated at
 * creation and the customer may already have shared it. The copy says so,
 * because "rename" implying "new URL" is exactly the assumption that breaks
 * someone's links.
 *
 * The runtime is shown but NOT editable. It is not a label: it decides the build
 * workflow that was committed to the customer's repository — the install and
 * build commands, the directory that gets packed, and how the output is turned
 * into a container image. Switching it here would leave that repository running
 * a workflow for the other runtime, so every build in between would fail on a
 * mismatch nothing on this page could explain. A different runtime is a
 * different project.
 */
export function GeneralSection({ project }: Readonly<{ project: Project }>) {
    const isN8n = project.project_type === "n8n"
    const [name, setName] = useState(project.name)
    const update = useUpdateProject(project.id)

    let nameError: string | undefined
    if (name.trim() === "") nameError = "Name is required"
    else if (!NAME_PATTERN.test(name)) nameError = "Lowercase letters, digits and hyphens only"

    const dirty = name !== project.name

    const runtime = PROJECT_TYPE_META[project.project_type]
    const RuntimeIcon = runtime.icon

    return (
        <Section
            variant="panel"
            title="General"
            description="How this project is identified in the console."
        >
            <div className="space-y-5">
                <FieldRow
                    label="Name"
                    htmlFor="settings-name"
                    error={nameError}
                    description={`The public address stays ${project.subdomain} — it was allocated when the project was created and does not follow a rename.`}
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

                {!isN8n && (
                    <FieldRow
                        label="Runtime"
                        description="Set when the project was created. It determines the build workflow in your repository, so it cannot be changed here — create a new project to build this repository a different way."
                    >
                        <div className="flex h-9 items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 sm:w-80">
                            <RuntimeIcon className="size-4 shrink-0 text-muted-foreground" />
                            <span className="text-sm">{runtime.label}</span>
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
                >
                    {update.isPending && <Loader2 className="size-3.5 animate-spin" />}
                    Save changes
                </Button>
            </div>
        </Section>
    )
}
