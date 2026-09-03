import { useState } from "react"

import { Button, Input } from "@datadack/common-ui"
import { Boxes, Plus, Trash2 } from "lucide-react"

import { Section } from "@/components/console"

import { useUpdateProject } from "../../../managed-apps.hooks"
import type { Project } from "../../../managed-apps.types"

export function EnvironmentsSection({ project }: Readonly<{ project: Project }>) {
  const update = useUpdateProject(project.id)
  const environments = project.environments?.length ? project.environments : ["production"]
  const [name, setName] = useState("")
  const normalized = name.trim().toLowerCase()
  const valid = /^[a-z][a-z0-9-]{0,30}$/.test(normalized)

  const save = (next: string[]) => {
    update.mutate({ environments: next })
  }

  return (
    <Section
      variant="panel"
      icon={Boxes}
      title="Environments"
      description="Organize configuration by environment. Production is created automatically; builds and deployments are unchanged for now."
    >
      <div className="space-y-4">
        <div className="divide-y divide-border/60 rounded-lg border border-border/70">
          {environments.map((environment) => (
            <div key={environment} className="flex items-center gap-3 px-3 py-2.5">
              <span className="size-2 rounded-full bg-status-success" aria-hidden />
              <span className="font-mono text-[13px] font-medium capitalize">{environment}</span>
              {environment === "production" ? (
                <span className="ml-auto text-[11px] text-muted-foreground">Default</span>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto size-7 text-muted-foreground hover:text-destructive"
                  aria-label={`Delete ${environment}`}
                  disabled={update.isPending}
                  onClick={() => {
                    save(environments.filter((item) => item !== environment))
                  }}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="flex max-w-md gap-2">
          <Input
            value={name}
            placeholder="dev, staging, qa…"
            aria-label="New environment name"
            onChange={(event) => {
              setName(event.target.value)
            }}
          />
          <Button
            size="sm"
            className="shrink-0 gap-1.5"
            disabled={!valid || environments.includes(normalized) || update.isPending}
            loading={update.isPending}
            onClick={() => {
              save([...environments, normalized])
              setName("")
            }}
          >
            <Plus className="size-3.5" />
            Add environment
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Use lowercase letters, numbers and hyphens. Environment names currently scope
          configuration only.
        </p>
      </div>
    </Section>
  )
}
