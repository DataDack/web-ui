import { useEffect } from "react"

import { Badge, Skeleton } from "@DataDack/common-ui"
import { CheckCircle2, Loader2, Plus, Unlink } from "lucide-react"
import { useWatch, type UseFormReturn } from "react-hook-form"
import { SiJira } from "react-icons/si"

import { Button } from "@/components/ui/button"
import { ComboboxInput } from "@/components/ui/combobox-input"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@datadack/common-ui"
import { cn } from "@/lib/utils"
import {
  useDisconnectJira,
  useJiraConnections,
  useJiraIssueTypes,
  useJiraLabels,
  useJiraProjects,
  useStartJiraOAuth,
} from "@/modules/monitoring/monitoring.hooks"

import type { JiraConnection } from "../../../monitoring.types"
import { splitJiraLabels, type ChannelFormValues } from "../../channels.form"
import { FieldError, FieldLabel } from "../../components/FormFields"

const EMPTY_CONNECTIONS: JiraConnection[] = []

function JiraOAuthConnect({
  selectedCloudId,
  onSelectCloudId,
}: Readonly<{
  selectedCloudId: string | undefined
  onSelectCloudId: (cloudId: string) => void
}>) {
  const jiraConnections = useJiraConnections()
  const startJiraOAuth = useStartJiraOAuth()
  const disconnectJira = useDisconnectJira()
  const connections = jiraConnections.data ?? EMPTY_CONNECTIONS

  const beginJiraOAuth = () => {
    startJiraOAuth.mutate(undefined, {
      onSuccess: ({ url }) => {
        window.location.href = url
      },
    })
  }

  if (jiraConnections.isLoading) {
    return <Skeleton className="h-16 w-full" />
  }

  if (connections.length === 0) {
    return (
      <div className="space-y-2 rounded-md border border-dashed border-[#0052CC]/40 bg-[#0052CC]/5 p-3">
        <p className="text-[13px] text-muted-foreground">
          Authorize DataDack to create, comment on, and resolve issues in your Jira site.
        </p>
        <Button
          type="button"
          className="w-full gap-2 border-[#0052CC] bg-[#0052CC] text-white hover:bg-[#0747A6]"
          disabled={startJiraOAuth.isPending}
          onClick={beginJiraOAuth}
        >
          {startJiraOAuth.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <SiJira className="size-4" />
          )}
          Continue with Jira
        </Button>
      </div>
    )
  }

  const activeCloudId = selectedCloudId ?? connections[0]?.cloud_id
  return (
    <div className="space-y-2">
      {connections.length > 1 ? (
        <div className="space-y-1.5">
          <FieldLabel required={false}>Site</FieldLabel>
          <Select value={activeCloudId} onValueChange={onSelectCloudId}>
            <SelectTrigger className="w-full font-mono text-[13px]">
              <SelectValue placeholder="Choose a site" />
            </SelectTrigger>
            <SelectContent>
              {connections.map((conn) => (
                <SelectItem
                  key={conn.cloud_id}
                  value={conn.cloud_id}
                  className="font-mono text-[13px]"
                >
                  {conn.site_url}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-[13px] text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-4 shrink-0" />
          <span className="truncate font-mono">{connections[0]?.site_url}</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={startJiraOAuth.isPending}
          onClick={beginJiraOAuth}
        >
          {startJiraOAuth.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Plus className="size-3.5" />
          )}
          Connect another site
        </Button>
        {activeCloudId && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground hover:text-destructive"
            disabled={disconnectJira.isPending && disconnectJira.variables === activeCloudId}
            onClick={() => {
              disconnectJira.mutate(activeCloudId)
            }}
          >
            {disconnectJira.isPending && disconnectJira.variables === activeCloudId ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Unlink className="size-3.5" />
            )}
            Disconnect
          </Button>
        )}
      </div>
    </div>
  )
}

export function JiraFields({ form }: Readonly<{ form: UseFormReturn<ChannelFormValues> }>) {
  const {
    register,
    setValue,
    control,
    formState: { errors },
  } = form

  const jiraConnections = useJiraConnections()
  const connections = jiraConnections.data ?? EMPTY_CONNECTIONS
  const jiraAuthMode = useWatch({ control, name: "jiraAuthMode" }) ?? "oauth"
  const jiraCloudId = useWatch({ control, name: "jiraCloudId" })
  const projectKeyRaw = useWatch({ control, name: "jiraProjectKey" }) ?? ""
  const issueTypeRaw = useWatch({ control, name: "jiraIssueType" }) ?? ""
  const projectKey = projectKeyRaw.trim()
  const labelsValue = useWatch({ control, name: "jiraLabels" })
  const activeCloudId = jiraCloudId?.trim() ? jiraCloudId : connections[0]?.cloud_id

  const projects = useJiraProjects(
    activeCloudId,
    jiraAuthMode === "oauth" && connections.length > 0,
  )
  const issueTypes = useJiraIssueTypes(
    activeCloudId,
    projectKey,
    jiraAuthMode === "oauth" && connections.length > 0,
  )
  const labels = useJiraLabels(
    activeCloudId,
    projectKey,
    jiraAuthMode === "oauth" && connections.length > 0,
  )

  useEffect(() => {
    if (jiraAuthMode === "oauth" && !jiraCloudId && connections[0]?.cloud_id) {
      setValue("jiraCloudId", connections[0].cloud_id, { shouldValidate: false })
    }
  }, [connections, jiraAuthMode, jiraCloudId, setValue])

  const selectedLabels = splitJiraLabels(labelsValue)
  const selectedLabelSet = new Set(selectedLabels)
  const addLabel = (label: string) => {
    const next = splitJiraLabels(`${selectedLabels.join(",")},${label}`)
    setValue("jiraLabels", next.join(", "), { shouldValidate: false })
  }

  return (
    <>
      <div className="space-y-1.5">
        <FieldLabel>Authentication</FieldLabel>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["oauth", "Continue with Jira"],
              ["token", "API token"],
            ] as const
          ).map(([mode, label]) => {
            const active = jiraAuthMode === mode
            return (
              <Button
                key={mode}
                type="button"
                variant="outline"
                className={cn(
                  "h-9 gap-1.5 px-2 text-[12px] sm:text-[13px]",
                  active &&
                    (mode === "oauth"
                      ? "border-[#0052CC] bg-[#0052CC] text-white hover:bg-[#0747A6]"
                      : "border-primary/60 bg-primary/10 text-primary"),
                )}
                aria-pressed={active}
                onClick={() => {
                  setValue("jiraAuthMode", mode, { shouldValidate: false })
                }}
              >
                {mode === "oauth" && <SiJira className="size-3.5" />}
                {label}
              </Button>
            )
          })}
        </div>
      </div>

      {jiraAuthMode === "oauth" && (
        <JiraOAuthConnect
          selectedCloudId={jiraCloudId}
          onSelectCloudId={(id) => {
            setValue("jiraCloudId", id, { shouldValidate: false })
          }}
        />
      )}

      {jiraAuthMode === "token" && (
        <>
          <div className="space-y-1.5">
            <FieldLabel>Base URL</FieldLabel>
            <Input
              {...register("jiraBaseUrl")}
              placeholder="https://your-team.atlassian.net"
              className="font-mono text-[13px]"
              autoComplete="off"
            />
            <FieldError message={errors.jiraBaseUrl?.message} />
          </div>
          <div className="space-y-1.5">
            <FieldLabel>Email</FieldLabel>
            <Input
              {...register("jiraEmail")}
              placeholder="ops@company.com"
              className="font-mono text-[13px]"
              autoComplete="off"
            />
            <FieldError message={errors.jiraEmail?.message} />
          </div>
          <div className="space-y-1.5">
            <FieldLabel>API token</FieldLabel>
            <Input
              {...register("jiraApiToken")}
              type="password"
              placeholder="••••••••"
              autoComplete="off"
            />
            <FieldError message={errors.jiraApiToken?.message} />
          </div>
        </>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <FieldLabel>Project</FieldLabel>
          <ComboboxInput
            value={projectKeyRaw}
            onValueChange={(next) => {
              setValue("jiraProjectKey", next, { shouldValidate: false })
            }}
            transform={(raw) => raw.toUpperCase()}
            options={
              projects.data?.map((project) => ({
                value: project.key,
                label: project.name,
                hint: project.key,
              })) ?? []
            }
            placeholder="OPS"
            loading={projects.isFetching}
            loadingText="Loading Jira projects…"
            emptyText="No matching projects"
            invalid={!!errors.jiraProjectKey}
            className="font-mono text-[13px]"
          />
          <FieldError message={errors.jiraProjectKey?.message} />
        </div>
        <div className="space-y-1.5">
          <FieldLabel required={false}>Issue type</FieldLabel>
          <ComboboxInput
            value={issueTypeRaw}
            onValueChange={(next) => {
              setValue("jiraIssueType", next, { shouldValidate: false })
            }}
            options={
              issueTypes.data
                // Sub-tasks need a parent issue, so Jira rejects them
                // for standalone alert issues — don't offer them.
                ?.filter((issueType) => !issueType.subtask)
                .map((issueType) => ({
                  value: issueType.name,
                  label: issueType.name,
                })) ?? []
            }
            placeholder="Task"
            loading={issueTypes.isFetching}
            loadingText="Loading issue types…"
            emptyText="No matching issue types"
            className="font-mono text-[13px]"
          />
          {!issueTypes.isFetching && (
            <p className="text-[11px] text-muted-foreground">
              Standard issue types only — sub-tasks need a parent issue, so Jira can’t use them for
              alerts.
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <FieldLabel required={false}>Labels</FieldLabel>
        <Input
          {...register("jiraLabels")}
          placeholder="datadack-monitoring, ops"
          className="font-mono text-[13px]"
          autoComplete="off"
        />
        <p className="text-[11px] text-muted-foreground">
          Comma-separated Jira labels. Leave empty to use datadack-monitoring.
        </p>
        {labels.data && labels.data.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {labels.data
              .filter((label) => !selectedLabelSet.has(label.name))
              .slice(0, 10)
              .map((label) => (
                <button
                  key={label.name}
                  type="button"
                  onClick={() => {
                    addLabel(label.name)
                  }}
                >
                  <Badge
                    variant="outline"
                    className="cursor-pointer font-mono text-[11px] hover:border-[#0052CC]/60 hover:text-[#0052CC]"
                  >
                    {label.name}
                  </Badge>
                </button>
              ))}
          </div>
        )}
      </div>
    </>
  )
}
