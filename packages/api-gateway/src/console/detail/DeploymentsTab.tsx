import { useState } from "react"

import { Rocket } from "lucide-react"

import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
  timeAgo,
} from "@datadack/common-ui"

import { InlineError, ListSkeleton, RowList, TabToolbar } from "./shared"
import { orderStages } from "./StagesTab"
import { useCreateDeployment, useDeployments, useStages } from "../../data/queries"
import type { Stage } from "../../data/schemas"
import { errorMessage } from "../errorMessage"

const STATUS_TONE: Record<string, string> = {
  DEPLOYED: "text-status-success border-status-success/40",
  FAILED: "text-status-danger border-status-danger/40",
  PENDING: "text-status-warning border-status-warning/40",
}

export function DeploymentsTab({ apiId }: Readonly<{ apiId: string }>) {
  const { data: deployments, isLoading } = useDeployments(apiId)
  const { data: stages } = useStages(apiId)
  const [deploying, setDeploying] = useState(false)

  // Newest first: the one at the top is the one a stage most likely points at.
  const rows = [...(deployments ?? [])].sort((a, b) => b.createdDate.localeCompare(a.createdDate))
  const liveOn = new Map<string, string[]>()
  for (const stage of stages ?? []) {
    if (!stage.deploymentId) continue
    liveOn.set(stage.deploymentId, [...(liveOn.get(stage.deploymentId) ?? []), stage.stageName])
  }

  return (
    <section>
      <TabToolbar
        title="Deployments"
        count={deployments?.length}
        description="A deployment is a snapshot of the routes and integrations, published to a stage. Stages with auto-deploy on get one on every change."
        action={
          <Button
            variant="gold"
            size="sm"
            onClick={() => {
              setDeploying(true)
            }}
          >
            <Rocket /> Deploy
          </Button>
        }
      />

      {isLoading ? <ListSkeleton /> : null}
      {!isLoading && rows.length === 0 ? (
        <EmptyState
          icon={Rocket}
          title="Nothing deployed yet"
          description="Deploy to publish the current routes and integrations to a stage."
          action={{
            label: "Deploy",
            onClick: () => {
              setDeploying(true)
            },
          }}
        />
      ) : null}
      {rows.length > 0 ? (
        <RowList>
          {rows.map((deployment) => {
            const live = liveOn.get(deployment.deploymentId) ?? []
            const status = deployment.deploymentStatus.toUpperCase()
            return (
              <li
                key={deployment.deploymentId}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-foreground font-mono text-[13px] font-medium">
                      {deployment.deploymentId}
                    </span>
                    {live.map((name) => (
                      <Badge
                        key={name}
                        className="bg-brand-gold/15 text-brand-gold font-mono text-[10px]"
                      >
                        live on {name}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-muted-foreground mt-0.5 truncate text-xs">
                    {deployment.autoDeployed ? "Auto-deployed" : "Deployed manually"}
                    {deployment.createdDate ? ` · ${timeAgo(deployment.createdDate)}` : ""}
                    {deployment.description ? ` · ${deployment.description}` : ""}
                  </p>
                </div>
                {status ? (
                  <Badge
                    variant="outline"
                    className={cn("text-[10px] capitalize", STATUS_TONE[status])}
                    title={deployment.deploymentStatusMessage || undefined}
                  >
                    {status.toLowerCase()}
                  </Badge>
                ) : null}
              </li>
            )
          })}
        </RowList>
      ) : null}

      <DeployDialog
        apiId={apiId}
        open={deploying}
        onOpenChange={setDeploying}
        stages={orderStages(stages ?? [])}
      />
    </section>
  )
}

function DeployDialog({
  apiId,
  open,
  onOpenChange,
  stages,
}: Readonly<{
  apiId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  stages: Stage[]
}>) {
  const create = useCreateDeployment(apiId)
  const [stageName, setStageName] = useState("")
  const [description, setDescription] = useState("")
  // Default to the first stage — $default when it exists — rather than to none.
  const chosen = stageName || stages[0]?.stageName || ""

  const close = (next: boolean) => {
    onOpenChange(next)
    if (!next) {
      create.reset()
      setStageName("")
      setDescription("")
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Deploy API</DialogTitle>
          <DialogDescription>
            Publish the current routes and integrations to a stage.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            create.mutate(
              { stageName: chosen || undefined, description: description.trim() || undefined },
              {
                onSuccess: () => {
                  close(false)
                },
              },
            )
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="deploy-stage">Stage</Label>
            {stages.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                This API has no stage, so the deployment will not be served. Enable the default
                stage on the Stages tab first.
              </p>
            ) : (
              <Select value={chosen} onValueChange={setStageName}>
                <SelectTrigger id="deploy-stage" className="w-full font-mono text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((stage) => (
                    <SelectItem
                      key={stage.stageName}
                      value={stage.stageName}
                      className="font-mono text-[13px]"
                    >
                      {stage.stageName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="deploy-description">
              Description{" "}
              <span className="text-muted-foreground font-normal italic">– optional</span>
            </Label>
            <Input
              id="deploy-description"
              value={description}
              maxLength={1024}
              placeholder="Adds GET /orders"
              onChange={(event) => {
                setDescription(event.target.value)
              }}
            />
          </div>
          {create.error ? (
            <InlineError>{errorMessage(create.error, "Could not deploy.")}</InlineError>
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
              Deploy
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
