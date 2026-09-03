import { useMemo, useState } from "react"

import {
  Badge,
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Skeleton,
} from "@datadack/common-ui"
import { GitBranch, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react"

import { ConfirmDialog, Section } from "@/components/console"

import { branchLabel, kindMeta, tracksABranch } from "./environment-meta"
import { EnvironmentDialog } from "./EnvironmentDialog"
import { useDeleteEnvironment, useProjectEnvironments } from "../../../managed-apps.hooks"
import type { ProjectEnvironment, Project } from "../../../managed-apps.types"

/**
 * The project's environments: what each one tracks, what it carries, and
 * whether it deploys.
 *
 * A SETTINGS SECTION, not a tab. Defining an environment — its name, the branch
 * it tracks — is something done once and then rarely; editing the VARIABLES
 * inside one is the daily job, and that is what earned the tab. Filing the
 * definition beside the other things you configure once, and promoting the
 * thing you open every day, is the split that matches how the two are used.
 *
 * The DEPLOYS column is the one that keeps this honest. A project has one
 * running container and one public address, so exactly one environment is
 * released and the rest are built and stored. Stating it per row is the
 * difference between a feature somebody can use and one they discover by
 * pushing to a branch and waiting for a site that never changes.
 */
export function EnvironmentsPanel({ project }: Readonly<{ project: Project }>) {
  const { data: environments = [], isLoading } = useProjectEnvironments(project.id)
  const remove = useDeleteEnvironment(project.id)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ProjectEnvironment | null>(null)
  const [toDelete, setToDelete] = useState<ProjectEnvironment | null>(null)

  // A project whose rows have not been created yet — one that predates the
  // migration, or an n8n project that never gets preview or development. The
  // page still renders whatever is there rather than an error.
  const rows = useMemo(() => environments, [environments])

  return (
    <div className="space-y-5">
      <Section
        variant="panel"
        title="Environments"
        description="Where this project's configuration lives. Each one carries its own variables and its own access rules."
        actions={
          <Button
            size="sm"
            variant="gold"
            className="gap-1.5"
            onClick={() => {
              setEditing(null)
              setDialogOpen(true)
            }}
          >
            <Plus className="size-3.5" />
            Create environment
          </Button>
        }
      >
        {isLoading ? (
          <div className="space-y-2">
            {["a", "b", "c"].map((key) => (
              <Skeleton key={key} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border/60">
            {rows.map((environment) => (
              <EnvironmentRow
                key={environment.id}
                environment={environment}
                onEdit={() => {
                  setEditing(environment)
                  setDialogOpen(true)
                }}
                onDelete={() => {
                  setToDelete(environment)
                }}
              />
            ))}
            {rows.length === 0 && (
              <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">
                This project has no environments yet.
              </p>
            )}
          </div>
        )}
      </Section>

      <EnvironmentDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditing(null)
        }}
        projectId={project.id}
        environments={rows}
        editing={editing}
      />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null)
        }}
        title={`Delete ${toDelete?.name ?? ""}?`}
        description={
          // Names what is lost, because the variables are the part nobody can
          // get back: the values are write-only and this console never had them.
          `Its ${String(toDelete?.var_count ?? 0)} variables and its access rules are deleted with it. Builds that ran for it are kept.`
        }
        confirmLabel="Delete environment"
        destructive
        loading={remove.isPending}
        onConfirm={() => {
          if (!toDelete) return
          remove.mutate(toDelete.name, {
            onSuccess: () => {
              setToDelete(null)
            },
          })
        }}
      />
    </div>
  )
}

function EnvironmentRow({
  environment,
  onEdit,
  onDelete,
}: Readonly<{
  environment: ProjectEnvironment
  onEdit: () => void
  onDelete: () => void
}>) {
  const meta = kindMeta(environment.kind)
  const Icon = meta.icon
  const tracked = tracksABranch(environment.branch_mode)

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
      <span className="flex min-w-44 shrink-0 items-center gap-2.5">
        <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0">
          <span className="block truncate font-mono text-[13px] font-medium text-foreground">
            {environment.name}
          </span>
          {environment.description !== "" && (
            <span className="block truncate text-[11px] text-muted-foreground">
              {environment.description}
            </span>
          )}
        </span>
      </span>

      <span className="flex min-w-48 flex-1 items-center gap-1.5 text-[12px] text-muted-foreground">
        {/* Only a real branch gets the git glyph — one beside "Accessible via
            CLI" would be a small lie about what the row tracks. */}
        {tracked && <GitBranch className="size-3.5 shrink-0" aria-hidden />}
        <span className={cn("truncate", tracked && "font-mono")}>{branchLabel(environment)}</span>
      </span>

      <span className="shrink-0 text-[12px] text-muted-foreground tabular-nums">
        {environment.var_count} {environment.var_count === 1 ? "variable" : "variables"}
      </span>

      {/* The honest half of the page. Exactly one environment is released; the
          rest build and store an artifact you can roll back to. */}
      <Badge
        variant="outline"
        className={cn(
          "shrink-0 text-[10px]",
          environment.deploys
            ? "border-status-success/30 text-status-success"
            : "text-muted-foreground",
        )}
        title={
          environment.deploys
            ? "Builds of this environment are released to the public address."
            : "Builds of this environment are stored, not released. This project serves one deployment, and it is production's."
        }
      >
        {environment.deploys ? "Deploys" : "Builds only"}
      </Badge>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for ${environment.name}`}
            className="shrink-0 text-muted-foreground"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil className="size-3.5" />
            {environment.editable ? "Edit" : "Edit branch rule"}
          </DropdownMenuItem>
          {/* Production is absent rather than disabled: it is the environment
              the public address serves, and deleting it would leave a live site
              whose variables had no home. A greyed-out row invites a hover for
              an explanation the tooltip cannot give in four words. */}
          {environment.editable && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                <Trash2 className="size-3.5" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
