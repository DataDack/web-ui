import { useMemo } from "react"

import type { ColumnDef } from "@tanstack/react-table"
import { FileInput, Globe2, Network, Plus, Router, ShieldCheck } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"

import {
  Badge,
  Button,
  CopyButton,
  DataTable,
  EmptyState,
  PageHeader,
  StatCard,
  StatGrid,
  cellText,
  timeAgo,
} from "@datadack/common-ui"

import { errorMessage } from "./errorMessage"
import { useApis } from "../data/queries"
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
            to={encodeURIComponent(row.original.apiId)}
            className="text-foreground hover:text-brand-gold font-mono text-[13px] font-medium underline-offset-4 hover:underline"
          >
            {row.original.name || row.original.apiId}
          </Link>
        ),
      },
      {
        accessorKey: "apiId",
        header: "API ID",
        cell: ({ row }) => <CopyButton value={row.original.apiId} />,
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
          <>
            <Button
              variant="outline"
              onClick={() => {
                void navigate("create/import")
              }}
            >
              <FileInput /> Import OpenAPI
            </Button>
            <Button
              variant="gold"
              onClick={() => {
                // Relative: this console is mounted at /apigateway in one app and
                // at .../api-gateway in the other.
                void navigate("create")
              }}
            >
              <Plus /> Create API
            </Button>
          </>
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
            action={{
              label: "Create API",
              onClick: () => {
                void navigate("create")
              },
            }}
          />
        }
        onRefresh={() => void refetch()}
        refreshing={isFetching}
        error={error ? errorMessage(error, "Could not load") : undefined}
        onRetry={() => void refetch()}
      />
    </>
  )
}
