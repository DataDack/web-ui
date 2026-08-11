import { useTranslation } from "react-i18next"
import { useState } from "react"

import { ExternalLink, FileCode2, Loader2, ScrollText } from "lucide-react"

import { Section } from "@/components/console"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { WorkflowPreview } from "./WorkflowPreview"
import { BuildStatusPill } from "../../../components"
import { useBuild, useBuildLogs, useProject, useProjectBuilds } from "../../../managed-apps.hooks"
import { isBuildTransitional, type ProjectSetup } from "../../../managed-apps.types"
import { buildLifecycle } from "../../project/BuildLogConsole/lifecycle"
import { LogBody } from "../../project/BuildLogConsole/LogBody"

interface SetupWorkPanelProps {
  projectId: string
  setup: ProjectSetup
}

/**
 * The right-hand panel of the setup screen: the workflow being proposed, and
 * the log of the build it produces.
 *
 * Tabbed because these are two views of one thing at two moments in time —
 * before the merge you want to read what you are approving, after it you want
 * to watch it run. Stacking both would leave whichever you are not looking at
 * taking up half the screen.
 *
 * The tab follows the project rather than the click: once a build exists the
 * log is what matters, so it selects itself. A user who then chooses Workflow
 * keeps it, because `selected` overrides the default from that point on.
 */
export function SetupWorkPanel({ projectId, setup }: Readonly<SetupWorkPanelProps>) {
  const { t } = useTranslation()
  const { data: builds = [] } = useProjectBuilds(projectId)
  const latest = builds.at(0)

  // Poll the build itself while it runs so the pill settles on its own.
  const { data: build } = useBuild(latest?.id ?? "")
  const current = build ?? latest
  const running = isBuildTransitional(current?.status)

  const { data: logs, isLoading: logsLoading } = useBuildLogs(current?.id ?? "", running)
  const logText = logs?.text ?? ""

  // The commands and branch the lifecycle lines quote come off the project.
  const { data: project } = useProject(projectId)
  const lifecycle = buildLifecycle(current, project)

  const [selected, setSelected] = useState<string | null>(null)
  const preferred = current ? "log" : "workflow"
  const active = selected ?? preferred

  let logPlaceholder = "This build produced no output."
  if (!current)
    logPlaceholder = "No build yet. Push to the tracked branch, or deploy from the project page."
  else if (logsLoading) logPlaceholder = "Loading log…"
  else if (running) logPlaceholder = "Waiting for the runner to start sending output…"

  return (
    <Section variant="panel" className="min-w-0">
      <Tabs value={active} onValueChange={setSelected}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="workflow" className="gap-1.5">
              <FileCode2 className="size-3.5" />
              Workflow
            </TabsTrigger>
            <TabsTrigger value="log" className="gap-1.5">
              <ScrollText className="size-3.5" />
              Build log
              {running && <Loader2 className="size-3 animate-spin" />}
            </TabsTrigger>
          </TabsList>

          {active === "workflow" ? (
            <span className="font-mono text-[11px] text-muted-foreground">
              {setup.workflow_path}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              {current && <BuildStatusPill status={current.status} />}
              {/* Always reachable, especially when our own log is
							    empty: if the runner died before it could stream
							    anything, GitHub's log is the only record of why. */}
              {current?.gh_run_url && (
                <a
                  href={current.gh_run_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-status-info hover:underline"
                >
                  {t("managedApps.setupWorkPanel.viewOnGithub")}
                  <ExternalLink className="size-3" />
                </a>
              )}
            </span>
          )}
        </div>

        <TabsContent value="workflow" className="min-w-0">
          <WorkflowPreview yaml={setup.workflow_yaml} />
        </TabsContent>

        <TabsContent value="log" className="min-w-0">
          <div className="flex h-[32rem] min-w-0 flex-col overflow-hidden rounded-lg border border-border/60">
            <LogBody
              text={logText}
              wrap={false}
              // Always following here: this panel exists to watch a
              // build happen. The full console on the Builds tab is
              // where a settled log gets scrolled and searched.
              following={running}
              onLeaveTail={() => {
                /* no-op: the sheet console owns the scroll guard */
              }}
              placeholder={logPlaceholder}
              leading={lifecycle.leading}
              trailing={lifecycle.trailing}
              originIso={current?.created_at}
            />
          </div>
        </TabsContent>
      </Tabs>
    </Section>
  )
}
