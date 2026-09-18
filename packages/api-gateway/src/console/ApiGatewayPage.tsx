import { useMemo } from "react"

import type { ColumnDef } from "@tanstack/react-table"
import { FileInput, Network, Plus, Router } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"

import {
  Badge,
  Button,
  CopyButton,
  DataTable,
  EmptyState,
  PageHeader,
  cellText,
  timeAgo,
} from "@datadack/common-ui"

import { errorMessage } from "./errorMessage"
import { useApis } from "../data/queries"
import type { Api } from "../data/schemas"

/**
 * Every HTTP API this account has.
 *
 * The ids are the ten-character public ones the API itself uses, not the
 * platform's internal UUIDs — the same id an operator sees here is the one that
 * appears in a customer's Terraform state and in `aws apigatewayv2 get-apis`
 * against this endpoint. Copyable for exactly that reason.
 *
 * The invoke URL is the column people come for: it is what they paste into a
 * client. Protocol is not a column because every API this console creates is
 * HTTP.
 */
export function ApiGatewayPage() {
  const navigate = useNavigate()
  const { data, error, isFetching, isLoading, refetch } = useApis()
  const apis = data ?? []

  const columns = useMemo<ColumnDef<Api>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <div className="min-w-0">
            <Link
              to={encodeURIComponent(row.original.apiId)}
              className="text-foreground hover:text-brand-gold text-[13px] font-semibold underline-offset-4 hover:underline"
            >
              {row.original.name || row.original.apiId}
            </Link>
            {row.original.description ? (
              <p className="text-muted-foreground max-w-xs truncate text-xs">
                {row.original.description}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "apiEndpoint",
        header: "Invoke URL",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.disableExecuteApiEndpoint || !row.original.apiEndpoint ? (
            <Badge variant="outline" className="text-[11px]">
              Custom domain only
            </Badge>
          ) : (
            <CopyButton value={row.original.apiEndpoint} className="max-w-sm text-[12px]" />
          ),
      },
      {
        accessorKey: "apiId",
        header: "API ID",
        cell: ({ row }) => <CopyButton value={row.original.apiId} />,
      },
      {
        id: "cors",
        header: "CORS",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.corsConfiguration ? (
            <Badge variant="secondary" className="text-[11px]">
              On
            </Badge>
          ) : (
            cellText("Off")
          ),
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
        description="HTTP APIs that route requests to your functions, load balancers and HTTP backends."
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

      <DataTable
        data={apis}
        columns={columns}
        loading={isLoading}
        searchable
        searchPlaceholder="Filter APIs…"
        empty={
          <EmptyState
            icon={Router}
            title="No APIs yet"
            description="Create an HTTP API to give your functions and services one public URL, with routes for each path."
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
