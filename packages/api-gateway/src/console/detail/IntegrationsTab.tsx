import { useState } from "react"

import { Boxes, Cloud, Plug, Plus, Zap } from "lucide-react"

import {
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
} from "@datadack/common-ui"

import {
  DeleteButton,
  InlineError,
  ListSkeleton,
  RowList,
  TabToolbar,
  integrationIdOf,
  integrationTarget,
  targetKindOf,
} from "./shared"
import {
  useCreateIntegration,
  useDeleteIntegration,
  useIntegrations,
  useRoutes,
} from "../../data/queries"
import { uriError } from "../create/model"
import { ChoiceCards, type Choice } from "../create/parts"
import { errorMessage } from "../errorMessage"

type Kind = "HTTP" | "FUNCTION" | "MOCK"

const KINDS: Choice<Kind>[] = [
  { value: "HTTP", label: "HTTP URL", description: "Forward the request to a URL.", icon: Cloud },
  { value: "FUNCTION", label: "Function", description: "Invoke a serverless function.", icon: Zap },
  { value: "MOCK", label: "Mock", description: "Answer without calling a backend.", icon: Boxes },
]

const WIRE_TYPE: Record<Kind, string> = {
  HTTP: "HTTP_PROXY",
  FUNCTION: "AWS_PROXY",
  MOCK: "MOCK",
}

export function IntegrationsTab({ apiId }: Readonly<{ apiId: string }>) {
  const { data: integrations, isLoading } = useIntegrations(apiId)
  const { data: routes } = useRoutes(apiId)
  const remove = useDeleteIntegration(apiId)
  const [adding, setAdding] = useState(false)

  const usedBy = new Map<string, number>()
  for (const route of routes ?? []) {
    const id = integrationIdOf(route.target)
    if (id) usedBy.set(id, (usedBy.get(id) ?? 0) + 1)
  }
  const rows = integrations ?? []

  return (
    <section>
      <TabToolbar
        title="Integrations"
        count={integrations?.length}
        description="The backends your routes send requests to. One integration can serve several routes."
        action={
          <Button
            variant="gold"
            size="sm"
            onClick={() => {
              setAdding(true)
            }}
          >
            <Plus /> Add integration
          </Button>
        }
      />
      {remove.error ? (
        <InlineError>{errorMessage(remove.error, "Could not delete the integration.")}</InlineError>
      ) : null}

      {isLoading ? <ListSkeleton /> : null}
      {!isLoading && rows.length === 0 ? (
        <EmptyState
          icon={Plug}
          title="No integrations yet"
          description="Add a function, load balancer or HTTP URL, then point a route at it."
          action={{
            label: "Add integration",
            onClick: () => {
              setAdding(true)
            },
          }}
        />
      ) : null}
      {rows.length > 0 ? (
        <RowList>
          {rows.map((row) => {
            const kind = targetKindOf(row)
            const Icon = kind.icon
            const uses = usedBy.get(row.integrationId) ?? 0
            return (
              <li
                key={row.integrationId}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3"
              >
                <span className="border-border bg-muted/40 flex size-8 items-center justify-center rounded-lg border">
                  <Icon className="text-brand-gold size-4" />
                </span>
                <span className="min-w-0">
                  <span className="text-foreground block truncate font-mono text-[13px] font-medium">
                    {integrationTarget(row)}
                  </span>
                  <span className="text-muted-foreground block text-xs">
                    {kind.label} · {usageLabel(uses)}
                  </span>
                </span>
                <DeleteButton
                  label={`Delete integration ${integrationTarget(row)}`}
                  title="Delete this integration?"
                  description="Its backend is not affected. Only the connection from this API is removed."
                  disabledReason={
                    uses > 0 ? "Routes still use it. Delete or repoint them first." : undefined
                  }
                  onConfirm={() => {
                    remove.mutate(row.integrationId)
                  }}
                />
              </li>
            )
          })}
        </RowList>
      ) : null}

      <AddIntegrationDialog apiId={apiId} open={adding} onOpenChange={setAdding} />
    </section>
  )
}

function usageLabel(uses: number): string {
  if (uses === 0) return "not used by any route"
  return uses === 1 ? "used by 1 route" : `used by ${String(uses)} routes`
}

function AddIntegrationDialog({
  apiId,
  open,
  onOpenChange,
}: Readonly<{ apiId: string; open: boolean; onOpenChange: (open: boolean) => void }>) {
  const create = useCreateIntegration(apiId)
  const [kind, setKind] = useState<Kind>("HTTP")
  const [uri, setUri] = useState("")
  const [attempted, setAttempted] = useState(false)

  const error = kind === "MOCK" ? undefined : uriError(kind, uri)

  const close = (next: boolean) => {
    onOpenChange(next)
    if (!next) {
      create.reset()
      setAttempted(false)
      setKind("HTTP")
      setUri("")
    }
  }

  const submit = () => {
    setAttempted(true)
    if (error) return
    create.mutate(
      {
        integrationType: WIRE_TYPE[kind],
        integrationUri: kind === "MOCK" ? undefined : uri.trim(),
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
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add integration</DialogTitle>
          <DialogDescription>Choose where matching requests are sent.</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
        >
          <ChoiceCards
            label="Integration type"
            choices={KINDS}
            value={kind}
            onChange={setKind}
            columns={1}
          />
          {kind === "MOCK" ? null : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="integration-uri">
                {kind === "FUNCTION" ? "Function name" : "URL"}
              </Label>
              <Input
                id="integration-uri"
                value={uri}
                placeholder={kind === "FUNCTION" ? "my-function" : "https://backend.example.com"}
                aria-invalid={attempted && Boolean(error)}
                onChange={(event) => {
                  setUri(event.target.value)
                }}
                className="font-mono text-[13px]"
              />
              {attempted && error ? <InlineError>{error}</InlineError> : null}
            </div>
          )}
          {create.error ? (
            <InlineError>
              {errorMessage(create.error, "Could not add the integration.")}
            </InlineError>
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
              Add integration
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
