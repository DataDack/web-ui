import { useMemo } from "react"

import type { ColumnDef } from "@tanstack/react-table"
import { ArrowLeft, Container, GitBranch, History, Package, Settings2 } from "lucide-react"
import { Link, useParams, useSearchParams } from "react-router-dom"

import {
  Badge,
  EmptyState,
  KeyValueGrid,
  ResourceTable,
  Skeleton,
  StatusBadge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  cellMono,
  cellText,
  timeAgo,
} from "@datadack/common-ui"

import { useFunctionAliases, useFunctionVersions, useServerlessFunction } from "../serverless.hooks"
import type { FunctionAlias, FunctionVersion } from "../serverless.types"

const TABS = [
  { value: "configuration", label: "Configuration", icon: Settings2 },
  { value: "versions", label: "Versions", icon: History },
  { value: "aliases", label: "Aliases", icon: GitBranch },
]

/**
 * A function's home, Lambda-style: identity and state in the header,
 * everything else behind URL-persisted tabs. Same layout as the
 * serverless-web console's detail page, rendered from the shared kit.
 */
export function ServerlessFunctionDetailPage() {
  const { name = "" } = useParams()
  const { data: fn, isLoading } = useServerlessFunction(name)

  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get("tab") ?? "configuration"
  const activeTab = TABS.some((tab) => tab.value === requested) ? requested : "configuration"

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    )
  }

  if (!fn) {
    return (
      <>
        <BackLink />
        <EmptyState
          icon={Package}
          title={`No function named ${name}`}
          description="It may have been deleted, or it belongs to another account."
        />
      </>
    )
  }

  const isImage = fn.packageType === "image"

  return (
    <>
      <BackLink />

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="glass-1 flex size-10 shrink-0 items-center justify-center rounded-xl">
              {isImage ? (
                <Container className="text-muted-foreground size-4.5" />
              ) : (
                <Package className="text-muted-foreground size-4.5" />
              )}
            </div>
            <h1 className="truncate font-mono text-xl font-bold tracking-tight">{fn.name}</h1>
            <StatusBadge status={fn.state} pulse />
          </div>
          <p className="text-muted-foreground mt-1.5 text-sm">
            {isImage ? (fn.imageUri ?? "container image") : (fn.runtime ?? "zip package")}
            {fn.updatedAt ? ` · updated ${timeAgo(fn.updatedAt)}` : ""}
          </p>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(tab) => {
          setSearchParams(tab === "configuration" ? {} : { tab }, { replace: true })
        }}
      >
        <TabsList>
          {TABS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value}>
              <Icon className="size-3.5" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="configuration">
          <div className="glass-2 p-5">
            <KeyValueGrid
              items={[
                { label: "Package type", value: fn.packageType, mono: true },
                { label: "Runtime", value: fn.runtime, mono: true },
                { label: "Handler", value: fn.handler, mono: true },
                { label: "Architecture", value: fn.architecture, mono: true },
                {
                  label: "Memory",
                  value: fn.memorySize ? `${String(fn.memorySize)} MB` : undefined,
                },
                {
                  label: "Timeout",
                  value: fn.timeout ? `${String(fn.timeout)}s` : undefined,
                },
                { label: "Region", value: fn.region, mono: true },
                {
                  label: "Layers",
                  value: fn.layers?.length
                    ? fn.layers.map((layer) => `${layer.name}:${String(layer.version)}`).join(", ")
                    : undefined,
                  mono: true,
                },
                { label: "Created", value: timeAgo(fn.createdAt) },
              ]}
            />
          </div>
        </TabsContent>

        <TabsContent value="versions">
          <FunctionVersions name={fn.name} />
        </TabsContent>

        <TabsContent value="aliases">
          <FunctionAliases name={fn.name} />
        </TabsContent>
      </Tabs>
    </>
  )
}

function FunctionVersions({ name }: Readonly<{ name: string }>) {
  const { data, isLoading } = useFunctionVersions(name)
  const columns = useMemo<ColumnDef<FunctionVersion>[]>(
    () => [
      {
        accessorKey: "version",
        header: "Version",
        cell: ({ row }) => (
          <Badge variant="outline" className="font-mono text-[11px]">
            v{row.original.version}
          </Badge>
        ),
      },
      {
        accessorKey: "codeSha256",
        header: "Code SHA-256",
        cell: ({ row }) => cellMono(row.original.codeSha256?.slice(0, 16)),
      },
      {
        accessorKey: "createdAt",
        header: "Published",
        cell: ({ row }) => cellText(timeAgo(row.original.createdAt)),
      },
    ],
    [],
  )
  return (
    <ResourceTable
      data={data ?? []}
      columns={columns}
      loading={isLoading}
      emptyIcon={History}
      emptyTitle="No published versions"
      emptyDescription="Publishing a version freezes the current code and configuration."
    />
  )
}

function FunctionAliases({ name }: Readonly<{ name: string }>) {
  const { data, isLoading } = useFunctionAliases(name)
  const columns = useMemo<ColumnDef<FunctionAlias>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Alias",
        cell: ({ row }) => cellMono(row.original.name),
      },
      {
        accessorKey: "functionVersion",
        header: "Version",
        cell: ({ row }) => (
          <Badge variant="outline" className="font-mono text-[11px]">
            v{row.original.functionVersion}
          </Badge>
        ),
      },
      {
        id: "weights",
        header: "Canary",
        cell: ({ row }) => {
          const weights = row.original.additionalVersionWeights
          if (!weights || Object.keys(weights).length === 0) return cellText()
          return cellMono(
            Object.entries(weights)
              .map(([version, weight]) => `v${version}: ${String(weight)}%`)
              .join(", "),
          )
        },
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => cellText(row.original.description),
      },
    ],
    [],
  )
  return (
    <ResourceTable
      data={data ?? []}
      columns={columns}
      loading={isLoading}
      emptyIcon={GitBranch}
      emptyTitle="No aliases"
      emptyDescription="Aliases give a stable name (prod, staging) to a published version."
    />
  )
}

function BackLink() {
  return (
    <Link
      to="/serverless"
      className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1.5 text-[13px] transition-colors"
    >
      <ArrowLeft className="size-3.5" />
      Functions
    </Link>
  )
}
