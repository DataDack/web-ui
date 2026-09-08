import { useMemo, useState } from "react"

import type { ColumnDef } from "@tanstack/react-table"
import { Globe2, Network, Plus, Router, ShieldCheck } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"

import {
  Badge,
  Button,
  CopyButton,
  DataTable,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Label,
  PageHeader,
  StatCard,
  StatGrid,
  cellMono,
  cellText,
  timeAgo,
} from "@datadack/common-ui"

import { errorMessage } from "./errorMessage"
import { useApis, useCreateApi } from "../data/queries"
import type { Api } from "../data/schemas"



/**
 * Every HTTP API this account has configured.
 *
 * The ids are the ten-character public ones the API itself uses, not the
 * platform's internal UUIDs — the same id an operator sees here is the one that
 * appears in a customer's Terraform state and in `aws apigatewayv2 get-apis`
 * against this endpoint. Copyable for exactly that reason: pasting it into a
 * CLI is what an operator does with it next.
 *
 * This is configuration. Nothing here is serving traffic yet: the edge
 * (apps/api_gateway) does not read these tables, so an API listed here
 * describes what a gateway would do rather than what one is doing. The page
 * says so once, at the top, rather than implying uptime it cannot report.
 */
export function ApiGatewayPage() {
  const navigate = useNavigate()
  const { data, error, isFetching, isLoading, refetch } = useApis()
  const [creating, setCreating] = useState(false)

  const apis = data ?? []
  const withCors = apis.filter((api) => api.corsConfiguration).length
  const custom = apis.filter((api) => api.disableExecuteApiEndpoint).length

  const columns = useMemo<ColumnDef<Api>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <Link
            to={`/apigateway/${encodeURIComponent(row.original.apiId)}`}
            className="text-foreground hover:text-brand-gold font-mono text-[13px] font-medium underline-offset-4 hover:underline"
          >
            {row.original.name || row.original.apiId}
          </Link>
        ),
      },
      {
        accessorKey: "apiId",
        header: "API ID",
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            {cellMono(row.original.apiId)}
            <CopyButton value={row.original.apiId} />
          </div>
        ),
      },
      {
        accessorKey: "protocolType",
        header: "Protocol",
        cell: ({ row }) => (
          <Badge variant="outline" className="font-mono text-[11px]">
            {row.original.protocolType}
          </Badge>
        ),
      },
      {
        id: "cors",
        header: "CORS",
        // Absent and empty are different: absent is off, empty is on and
        // allowing nothing. The badge reports the origins so the difference is
        // visible without opening the API.
        cell: ({ row }) => {
          const cors = row.original.corsConfiguration
          if (!cors) return cellText()
          const origins = cors.allowOrigins
          return (
            <Badge variant="secondary" className="font-mono text-[11px]">
              {origins.length === 0 ? "no origins" : origins.join(", ")}
            </Badge>
          )
        },
      },
      {
        accessorKey: "version",
        header: "Version",
        cell: ({ row }) => cellText(row.original.version),
      },
      {
        accessorKey: "createdDate",
        header: "Created",
        cell: ({ row }) => cellText(timeAgo(row.original.createdDate)),
      },
    ],
    [],
  )

  return (
    <>
      <PageHeader
        title="API Gateway"
        icon={Network}
        description="HTTP APIs, their routes, integrations, stages and custom domains. Configuration only — the edge does not serve from these tables yet."
        actions={
          <Button
            variant="gold"
            onClick={() => {
              setCreating(true)
            }}
          >
            <Plus /> Create API
          </Button>
        }
      />

      <StatGrid className="mb-6">
        <StatCard label="APIs" value={apis.length} icon={Network} loading={isLoading} />
        <StatCard label="With CORS" value={withCors} icon={ShieldCheck} loading={isLoading} />
        <StatCard label="Custom domain only" value={custom} icon={Globe2} loading={isLoading} />
      </StatGrid>

      <DataTable
        data={apis}
        columns={columns}
        loading={isLoading}
        searchable
        searchPlaceholder="Filter APIs…"
        empty={
          <EmptyState
            icon={Router}
            title="No APIs configured"
            description="Create one here, or with `aws apigatewayv2 create-api` pointed at this control plane."
          />
        }
        onRefresh={() => void refetch()}
        refreshing={isFetching}
        error={error ? errorMessage(error, "Could not load") : undefined}
        onRetry={() => void refetch()}
      />

      <CreateApiDialog
        open={creating}
        onOpenChange={setCreating}
        onCreated={(apiId) => {
          setCreating(false)
          void navigate(`/apigateway/${encodeURIComponent(apiId)}`)
        }}
      />
    </>
  )
}

/**
 * Create, with the quick-create backend inline.
 *
 * A target URL is optional and does a lot when given: the control plane builds
 * the API, a $default route and an integration pointing at it in one call, so a
 * new API can serve something immediately instead of being an empty shell the
 * operator then has to furnish. That is the same behaviour as
 * `create-api --target`, which is why it is one field rather than a wizard.
 */
function CreateApiDialog({
  open,
  onOpenChange,
  onCreated,
}: Readonly<{
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (apiId: string) => void
}>) {
  const [name, setName] = useState("")
  const [target, setTarget] = useState("")
  const create = useCreateApi()

  const submit = () => {
    create.mutate(
      { name, target: target.trim() || undefined },
      {
        onSuccess: (api) => {
          onCreated(api.apiId)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create HTTP API</DialogTitle>
          <DialogDescription>
            A backend URL is optional. Give one and the API is created with a $default route already
            pointing at it.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="api-name">Name</Label>
            <Input
              id="api-name"
              value={name}
              placeholder="checkout-api"
              onChange={(event) => {
                setName(event.target.value)
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="api-target">Backend URL (optional)</Label>
            <Input
              id="api-target"
              value={target}
              placeholder="https://backend.internal"
              onChange={(event) => {
                setTarget(event.target.value)
              }}
            />
          </div>
          {create.error ? (
            <p className="text-status-danger text-xs">{errorMessage(create.error, "Could not create")}</p>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            Cancel
          </Button>
          <Button variant="gold" disabled={!name.trim() || create.isPending} onClick={submit}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
