import { useState } from "react"

import { Plus } from "lucide-react"

import {
  Badge,
  Button,
  CopyButton,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Switch,
  timeAgo,
} from "@datadack/common-ui"

import {
  DEFAULT_STAGE,
  DeleteButton,
  InlineError,
  ListSkeleton,
  RowList,
  TabToolbar,
  stageUrl,
} from "./shared"
import { useCreateStage, useDeleteStage, useStages, useUpdateStage } from "../../data/queries"
import type { Stage } from "../../data/schemas"
import { stageNameError } from "../create/model"
import { errorMessage } from "../errorMessage"

/** $default first, then the rest by name: the default is the one most people call. */
export function orderStages(stages: Stage[]): Stage[] {
  return [...stages].sort((a, b) => {
    if (a.stageName === DEFAULT_STAGE) return -1
    if (b.stageName === DEFAULT_STAGE) return 1
    return a.stageName.localeCompare(b.stageName)
  })
}

/**
 * Creates the $default stage, auto-deploying, for an API that has none.
 *
 * Every API created since the wizard gets one from the control plane, but
 * older ones were created bare and serve nothing until a stage exists.
 */
export function EnableDefaultStageButton({
  apiId,
  size = "sm",
}: Readonly<{ apiId: string; size?: "sm" | "default" }>) {
  const create = useCreateStage(apiId)
  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        variant="gold"
        size={size}
        loading={create.isPending}
        onClick={() => {
          create.mutate({ stageName: DEFAULT_STAGE, autoDeploy: true })
        }}
      >
        Enable default stage
      </Button>
      {create.error ? (
        <InlineError>{errorMessage(create.error, "Could not create the stage.")}</InlineError>
      ) : null}
    </div>
  )
}

export function StagesTab({ apiId, endpoint }: Readonly<{ apiId: string; endpoint: string }>) {
  const { data: stages, isLoading } = useStages(apiId)
  const update = useUpdateStage(apiId)
  const remove = useDeleteStage(apiId)
  const [adding, setAdding] = useState(false)

  const rows = orderStages(stages ?? [])

  return (
    <section>
      <TabToolbar
        title="Stages"
        count={stages?.length}
        description="A stage is a version of the API that callers reach at its own URL. $default is served at the root of the invoke URL; any other stage is served under its name."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setAdding(true)
            }}
          >
            <Plus /> Add stage
          </Button>
        }
      />
      {update.error ? (
        <InlineError>{errorMessage(update.error, "Could not update the stage.")}</InlineError>
      ) : null}
      {remove.error ? (
        <InlineError>{errorMessage(remove.error, "Could not delete the stage.")}</InlineError>
      ) : null}

      {isLoading ? <ListSkeleton /> : null}
      {!isLoading && rows.length === 0 ? (
        <div className="border-status-warning/40 bg-status-warning-bg flex flex-col gap-3 rounded-xl border p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-foreground text-sm font-semibold">This API has no stage</p>
            <p className="text-muted-foreground mt-0.5 text-[13px]">
              Without one, nothing is served at its invoke URL. The default stage serves at the root
              and deploys every change automatically.
            </p>
          </div>
          <EnableDefaultStageButton apiId={apiId} />
        </div>
      ) : null}
      {rows.length > 0 ? (
        <RowList>
          {rows.map((stage) => {
            const isDefault = stage.stageName === DEFAULT_STAGE
            const url = endpoint ? stageUrl(endpoint, stage.stageName) : ""
            const switchId = `stage-auto-${stage.stageName}`
            let deleteBlocked: string | undefined
            if (isDefault) deleteBlocked = "The default stage cannot be deleted"
            else if (rows.length === 1) deleteBlocked = "An API needs at least one stage"
            return (
              <li
                key={stage.stageName}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto_auto]"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-foreground font-mono text-[13px] font-semibold">
                      {stage.stageName}
                    </span>
                    {isDefault ? (
                      <Badge className="bg-brand-gold/15 text-brand-gold text-[10px]">
                        Default
                      </Badge>
                    ) : null}
                  </div>
                  {url ? (
                    <CopyButton value={url} className="mt-1 text-[11px]" />
                  ) : (
                    <span className="text-muted-foreground text-xs">No invoke URL</span>
                  )}
                  <p className="text-muted-foreground mt-0.5 text-[11px]">
                    {stage.deploymentId ? `Deployment ${stage.deploymentId}` : "Not deployed yet"}
                    {stage.lastUpdatedDate ? ` · updated ${timeAgo(stage.lastUpdatedDate)}` : ""}
                  </p>
                </div>
                <div className="col-start-1 row-start-2 flex items-center gap-2 md:col-start-2 md:row-start-1">
                  <Switch
                    id={switchId}
                    checked={stage.autoDeploy}
                    disabled={update.isPending}
                    onCheckedChange={(value) => {
                      update.mutate({ stageName: stage.stageName, input: { autoDeploy: value } })
                    }}
                  />
                  <Label htmlFor={switchId} className="text-muted-foreground text-xs">
                    Auto-deploy
                  </Label>
                </div>
                <div className="col-start-2 row-span-2 row-start-1 self-center md:col-start-3 md:row-span-1">
                  <DeleteButton
                    label={`Delete stage ${stage.stageName}`}
                    title={`Delete the ${stage.stageName} stage?`}
                    description={`Callers of ${url || "this stage"} will get a 404. Routes and integrations are not affected.`}
                    disabledReason={deleteBlocked}
                    onConfirm={() => {
                      remove.mutate(stage.stageName)
                    }}
                  />
                </div>
              </li>
            )
          })}
        </RowList>
      ) : null}

      <AddStageDialog
        apiId={apiId}
        open={adding}
        onOpenChange={setAdding}
        taken={new Set(rows.map((stage) => stage.stageName))}
      />
    </section>
  )
}

function AddStageDialog({
  apiId,
  open,
  onOpenChange,
  taken,
}: Readonly<{
  apiId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  taken: Set<string>
}>) {
  const create = useCreateStage(apiId)
  const [name, setName] = useState("")
  const [autoDeploy, setAutoDeploy] = useState(true)
  const [attempted, setAttempted] = useState(false)

  const trimmed = name.trim()
  const error =
    stageNameError(name) ??
    (taken.has(trimmed) ? "This API already has a stage with that name." : undefined)

  const close = (next: boolean) => {
    onOpenChange(next)
    if (!next) {
      create.reset()
      setAttempted(false)
      setName("")
      setAutoDeploy(true)
    }
  }

  const submit = () => {
    setAttempted(true)
    if (error) return
    create.mutate(
      { stageName: trimmed, autoDeploy },
      {
        onSuccess: () => {
          close(false)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add stage</DialogTitle>
          <DialogDescription>
            The stage is served under its name, for example{" "}
            <code className="font-mono">…/{trimmed || "staging"}/orders</code>.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="stage-name">Stage name</Label>
            <Input
              id="stage-name"
              value={name}
              maxLength={128}
              placeholder="staging"
              aria-invalid={attempted && Boolean(error)}
              onChange={(event) => {
                setName(event.target.value)
              }}
              className="font-mono text-[13px]"
            />
            {attempted && error ? <InlineError>{error}</InlineError> : null}
          </div>
          <div className="flex items-start gap-3">
            <Switch id="stage-auto" checked={autoDeploy} onCheckedChange={setAutoDeploy} />
            <div>
              <Label htmlFor="stage-auto" className="text-foreground text-[13px] font-semibold">
                Auto-deploy
              </Label>
              <p className="text-muted-foreground text-xs">
                Deploy every change to this stage as soon as it is saved.
              </p>
            </div>
          </div>
          {create.error ? (
            <InlineError>{errorMessage(create.error, "Could not add the stage.")}</InlineError>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                close(false)
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="gold" loading={create.isPending}>
              Add stage
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
