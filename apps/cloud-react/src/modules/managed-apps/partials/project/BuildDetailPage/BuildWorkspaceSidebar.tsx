import {
  Box,
  Clock3,
  ExternalLink,
  GitBranch,
  GitCommitHorizontal,
  Play,
  Timer,
} from "lucide-react"

import { Button } from "@datadack/common-ui"

import { BuildWaterfall } from "./BuildWaterfall"
import type { Build, Project } from "../../../managed-apps.types"
import { formatDuration, isTimeSet, shortDateTime, shortSha, triggerLabel } from "../build-format"

interface BuildWorkspaceSidebarProps {
  build: Build
  project?: Project
  artifactSize: string
  serving: boolean
}

function DetailRow({
  icon: Icon,
  label,
  children,
}: Readonly<{
  icon: typeof GitBranch
  label: string
  children: React.ReactNode
}>) {
  return (
    <div className="grid grid-cols-[20px_minmax(0,1fr)] gap-2.5 py-2.5">
      <Icon className="mt-0.5 size-3.5 text-muted-foreground/65" aria-hidden />
      <div className="min-w-0">
        <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
        <div className="mt-0.5 min-w-0 text-[12px] text-foreground/90">{children}</div>
      </div>
    </div>
  )
}

/** Build identity stays visible while the log scrolls, like a debugger watch pane. */
export function BuildWorkspaceSidebar({
  build,
  project,
  artifactSize,
  serving,
}: Readonly<BuildWorkspaceSidebarProps>) {
  const duration = formatDuration(build.started_at, build.finished_at)

  return (
    <aside className="hidden min-h-0 w-72 shrink-0 flex-col border-r border-border/60 glass-1-bg lg:flex">
      <div className="border-b border-border/60 px-5 py-5">
        {serving && (
          <div className="flex items-center gap-2 text-[11px] text-status-success">
            <span className="size-1.5 rounded-full bg-status-success" aria-hidden />
            Serving production traffic
          </div>
        )}

        <BuildWaterfall build={build} className={serving ? "mt-3" : undefined} />

        {project?.url && (
          <Button asChild size="sm" variant="outline" className="mt-4 w-full gap-2 rounded-sm">
            <a href={project.url} target="_blank" rel="noreferrer">
              <ExternalLink className="size-3.5" />
              Visit deployment
            </a>
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
        <p className="mb-1 text-[11px] font-semibold text-foreground">Build details</p>

        <DetailRow icon={GitBranch} label="Branch">
          <span className="block truncate font-mono">{project?.branch ?? "—"}</span>
        </DetailRow>
        <DetailRow icon={GitCommitHorizontal} label="Commit">
          <span className="block truncate font-mono" title={build.commit_message}>
            {build.commit_message || shortSha(build.commit_sha) || "Commit unavailable"}
          </span>
          {build.commit_sha && (
            <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">
              {shortSha(build.commit_sha)}
            </span>
          )}
        </DetailRow>
        <DetailRow icon={Play} label="Triggered by">
          {triggerLabel(build.triggered_by)}
        </DetailRow>
        <DetailRow icon={Clock3} label="Started">
          {isTimeSet(build.started_at) ? shortDateTime(build.started_at) : "Waiting to start"}
        </DetailRow>
        <DetailRow icon={Timer} label="Duration">
          <span className="font-mono tabular-nums">{duration}</span>
        </DetailRow>
        {artifactSize && (
          <DetailRow icon={Box} label="Artifact">
            <span className="font-mono tabular-nums">{artifactSize}</span>
          </DetailRow>
        )}
      </div>
    </aside>
  )
}
