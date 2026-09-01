import type { ReactNode } from "react"

import { Button, cn } from "@datadack/common-ui"
import { GitBranch, Settings2 } from "lucide-react"


import type { RepoProjectType } from "./ProjectTypePicker"
import { GitHubMark } from "../../../components/GitHubMark"

interface ImportSummaryAsideProps {
  repository: string
  branch: string
  projectType: RepoProjectType | undefined
  detecting: boolean
  issue: string | undefined
  onContinue: () => void
}

function SummaryRow({
  icon,
  label,
  value,
  accent = false,
}: Readonly<{
  icon: ReactNode
  label: string
  value: string
  accent?: boolean
}>) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 px-3 py-2.5">
      <span className="flex min-w-0 items-center gap-2 text-[12px] text-muted-foreground">
        {icon}
        {label}
      </span>
      <span
        className={cn(
          "min-w-0 truncate font-mono text-[12px] font-medium",
          accent ? "text-brand-gold-ink" : "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  )
}

/**
 * The import step’s persistent context and action.
 *
 * The reference layout keeps the current repository, detected framework and
 * branch visible while the left column changes. That prevents the Continue
 * action from becoming detached from the choices it confirms.
 */
export function ImportSummaryAside({
  repository,
  branch,
  projectType,
  detecting,
  issue,
  onContinue,
}: Readonly<ImportSummaryAsideProps>) {
  const ready = repository !== "" && projectType != null && issue == null && !detecting
  let framework = "Auto-detect"
  if (detecting) framework = "Detecting…"
  else if (projectType === "opennext") framework = "Next.js"
  else if (projectType === "react") framework = "React"
  else if (projectType === "custom") framework = "Custom"

  let guidance = "Select a repository to continue."
  if (repository && detecting) guidance = "Inspecting the repository…"
  else if (repository && !projectType) guidance = "Choose a compatible framework to continue."
  else if (issue) guidance = issue
  else if (ready) guidance = "Repository and framework are ready."

  return (
    <aside className="flex h-fit flex-col overflow-hidden rounded-xl border border-border/60 glass-1-bg lg:sticky lg:top-4">
      <div className="border-b border-border/60 px-4 py-3.5">
        <h2 className="text-balance text-[15px] font-semibold">Deployment summary</h2>
        <p className="mt-0.5 text-pretty text-[11.5px] text-muted-foreground">
          Review what DataDack detected before configuring the build.
        </p>
      </div>

      <div className="flex-1 space-y-4 px-4 py-4">
        <section className="space-y-2">
          <p className="managed-kicker font-mono text-[10px] font-semibold uppercase text-muted-foreground">
            Repository
          </p>
          <div className="flex min-h-11 items-center gap-2.5 rounded-lg border border-border/60 glass-1-bg-raised px-3 py-2.5">
            <GitHubMark className="size-4 shrink-0" />
            <span className="min-w-0 truncate font-mono text-[12px] font-medium">
              {repository || "No repository selected"}
            </span>
          </div>
        </section>

        <section className="space-y-2">
          <p className="managed-kicker font-mono text-[10px] font-semibold uppercase text-muted-foreground">
            Configuration
          </p>
          <div className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border/60 glass-1-bg-raised">
            <SummaryRow
              icon={<Settings2 className="size-3.5 shrink-0" />}
              label="Framework"
              value={framework}
              accent={projectType != null}
            />
            <SummaryRow
              icon={<GitBranch className="size-3.5 shrink-0" />}
              label="Branch"
              value={branch || "—"}
            />
          </div>
        </section>
      </div>

      <div className="border-t border-border/60 glass-1-bg-raised p-4">
        <Button type="button" className="w-full" disabled={!ready} onClick={onContinue}>
          Continue to configure
        </Button>
        <p
          className={cn(
            "mt-2 text-pretty text-center text-[11px]",
            issue ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {guidance}
        </p>
      </div>
    </aside>
  )
}
