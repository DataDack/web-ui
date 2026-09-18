import { useState } from "react"

import { Plus, Route as RouteIcon } from "lucide-react"

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
} from "@datadack/common-ui"

import {
  DeleteButton,
  InlineError,
  ListSkeleton,
  MethodTag,
  RowList,
  TabToolbar,
  integrationIdOf,
  integrationTarget,
  splitRouteKey,
  targetKindOf,
} from "./shared"
import { useCreateRoute, useDeleteRoute, useIntegrations, useRoutes } from "../../data/queries"
import type { Integration } from "../../data/schemas"
import { DEFAULT_ROUTE_KEY, HTTP_METHODS, routePathError } from "../create/model"
import { errorMessage } from "../errorMessage"

export function RoutesTab({ apiId }: Readonly<{ apiId: string }>) {
  const { data: routes, isLoading } = useRoutes(apiId)
  const { data: integrations } = useIntegrations(apiId)
  const remove = useDeleteRoute(apiId)
  const [adding, setAdding] = useState(false)

  const byId = new Map((integrations ?? []).map((row) => [row.integrationId, row]))
  const rows = [...(routes ?? [])].sort((a, b) =>
    splitRouteKey(a.routeKey)[1].localeCompare(splitRouteKey(b.routeKey)[1]),
  )

  return (
    <section>
      <TabToolbar
        title="Routes"
        count={routes?.length}
        description="Each route matches a method and path and sends the request to an integration. $default catches anything no other route matches."
        action={
          <Button
            variant="gold"
            size="sm"
            onClick={() => {
              setAdding(true)
            }}
          >
            <Plus /> Add route
          </Button>
        }
      />
      {remove.error ? (
        <InlineError>{errorMessage(remove.error, "Could not delete the route.")}</InlineError>
      ) : null}

      {isLoading ? <ListSkeleton /> : null}
      {!isLoading && rows.length === 0 ? (
        <EmptyState
          icon={RouteIcon}
          title="No routes yet"
          description="Without a route, every request to this API gets a 404. Add one to send traffic to a backend."
          action={{
            label: "Add route",
            onClick: () => {
              setAdding(true)
            },
          }}
        />
      ) : null}
      {rows.length > 0 ? (
        <RowList>
          {rows.map((route) => {
            const [method, path] = splitRouteKey(route.routeKey)
            const integration = byId.get(integrationIdOf(route.target))
            const kind = integration ? targetKindOf(integration) : undefined
            const KindIcon = kind?.icon
            return (
              <li
                key={route.routeId}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-3 md:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto]"
              >
                <MethodTag method={method} />
                <span className="text-foreground truncate font-mono text-[13px] font-medium">
                  {path}
                </span>
                <span className="text-muted-foreground col-span-3 col-start-1 row-start-2 flex min-w-0 items-center gap-1.5 text-xs md:col-span-1 md:col-start-3 md:row-start-1">
                  {integration && KindIcon ? (
                    <>
                      <KindIcon className="size-3.5 shrink-0" />
                      <span className="truncate font-mono">{integrationTarget(integration)}</span>
                    </>
                  ) : (
                    <span className="text-status-warning">No integration — returns 404</span>
                  )}
                </span>
                <span className="flex items-center gap-1.5 justify-self-end">
                  {route.apiGatewayManaged ? (
                    <Badge variant="outline" className="text-[10px]">
                      Managed
                    </Badge>
                  ) : null}
                  <DeleteButton
                    label={`Delete route ${route.routeKey}`}
                    title={`Delete ${route.routeKey}?`}
                    description="Requests that matched this route will fall through to $default, or get a 404 if there is none. The integration it used is kept."
                    disabledReason={
                      route.apiGatewayManaged
                        ? "Created by API Gateway, so it cannot be deleted"
                        : undefined
                    }
                    onConfirm={() => {
                      remove.mutate(route.routeId)
                    }}
                  />
                </span>
              </li>
            )
          })}
        </RowList>
      ) : null}

      <AddRouteDialog
        apiId={apiId}
        open={adding}
        onOpenChange={setAdding}
        integrations={integrations ?? []}
      />
    </section>
  )
}

function AddRouteDialog({
  apiId,
  open,
  onOpenChange,
  integrations,
}: Readonly<{
  apiId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  integrations: Integration[]
}>) {
  const create = useCreateRoute(apiId)
  const [method, setMethod] = useState("GET")
  const [path, setPath] = useState("/")
  const [target, setTarget] = useState("none")
  const [attempted, setAttempted] = useState(false)

  const catchAll = path.trim() === DEFAULT_ROUTE_KEY
  const pathError = attempted ? routePathError(path) : undefined

  const close = (next: boolean) => {
    onOpenChange(next)
    if (!next) {
      create.reset()
      setAttempted(false)
      setMethod("GET")
      setPath("/")
      setTarget("none")
    }
  }

  const submit = () => {
    setAttempted(true)
    if (routePathError(path)) return
    create.mutate(
      {
        routeKey: catchAll ? DEFAULT_ROUTE_KEY : `${method} ${path.trim()}`,
        target: target === "none" ? undefined : `integrations/${target}`,
      },
      {
        onSuccess: () => {
          close(false)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add route</DialogTitle>
          <DialogDescription>
            Use a path like <code className="font-mono">/orders/&#123;id&#125;</code>, or{" "}
            <code className="font-mono">$default</code> to catch every request.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
        >
          <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="route-method">Method</Label>
              <Select
                value={catchAll ? "ANY" : method}
                onValueChange={setMethod}
                disabled={catchAll}
              >
                <SelectTrigger id="route-method" className="w-full font-mono text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HTTP_METHODS.map((m) => (
                    <SelectItem key={m} value={m} className="font-mono text-[13px]">
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="route-path">Path</Label>
              <Input
                id="route-path"
                value={path}
                placeholder="/orders/{id}"
                aria-invalid={Boolean(pathError)}
                onChange={(event) => {
                  setPath(event.target.value)
                }}
                className="font-mono text-[13px]"
              />
            </div>
          </div>
          {pathError ? <InlineError>{pathError}</InlineError> : null}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="route-integration">Integration</Label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger id="route-integration" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None — attach one later</SelectItem>
                {integrations.map((row) => (
                  <SelectItem key={row.integrationId} value={row.integrationId}>
                    {targetKindOf(row).label} · {integrationTarget(row)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {integrations.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                This API has no integrations yet. Add one on the Integrations tab first.
              </p>
            ) : null}
          </div>

          {create.error ? (
            <InlineError>{errorMessage(create.error, "Could not add the route.")}</InlineError>
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
              Add route
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
