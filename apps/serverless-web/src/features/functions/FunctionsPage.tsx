import { useMemo, useState } from "react"

import type { ColumnDef } from "@tanstack/react-table"
import { Boxes, Container, Cpu, Package, Plus, Workflow, Zap } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"

import { apiErrorMessage } from "@/lib/api"
import { useWorkloads } from "@/lib/queries"
import { workloadKinds, type Workload, type WorkloadKind } from "@/lib/schemas"

import {
  Badge,
  Button,
  PageHeader,
  DataTable,
  EmptyState,
  StatCard,
  StatGrid,
  StatusBadge,
  Tabs,
  TabsList,
  TabsTrigger,
  cellMono,
  cellText,
} from "@datadack/common-ui"

/**
 * This page reads the OPERATOR listing, not the tenant function surface.
 *
 * The two differ in one important way: the function surface hides managed apps
 * and must keep hiding them, because it can delete what it lists and deleting an
 * app takes a customer's site down. An operator needs to SEE all three kinds
 * without those verbs being pointed at them, which is why there are two
 * endpoints rather than one with a query parameter.
 *
 * The kind filter exists only here for the same reason. A tenant has functions
 * and workflows and no concept of a managed app, so on the cloud console there
 * is nothing to filter between — and a control offering one meaningful choice
 * teaches someone the platform has something they cannot see.
 */
const KIND_LABELS: Record<WorkloadKind, string> = {
  function: "Functions",
  workflow: "Workflows",
  app: "Apps",
}

const KIND_TABS: { value: WorkloadKind | "all"; label: string }[] = [
  { value: "all", label: "All" },
  ...workloadKinds.map((kind) => ({ value: kind, label: KIND_LABELS[kind] })),
]

/** A workflow's handler is generated from its graph; editing it is a change the
 *  next deploy discards. That is worth marking, and only for the rows it is true
 *  of — a badge on every row would be noise. */
function KindBadge({ kind }: Readonly<{ kind: string }>) {
  if (kind === "workflow") {
    return (
      <Badge variant="outline" className="gap-1 text-[10px]">
        <Workflow className="size-3" /> workflow
      </Badge>
    )
  }
  if (kind === "app") {
    return (
      <Badge variant="outline" className="gap-1 text-[10px]">
        <Boxes className="size-3" /> app
      </Badge>
    )
  }
  return null
}

export function FunctionsPage() {
  const navigate = useNavigate()
  const [kind, setKind] = useState<WorkloadKind | "all">("all")
  const { data, error, isFetching, isLoading, refetch } = useWorkloads(kind)

  const rows = data?.workloads ?? []
  // Counted BEFORE the filter by the control plane, so a tab's badge keeps
  // describing the fleet once that tab is selected rather than collapsing to
  // the number of rows on screen.
  const counts = data?.counts ?? {}
  const total = data?.total ?? 0

  const columns = useMemo<ColumnDef<Workload>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {/* Managed apps are not addressable on the function detail page —
                it is the tenant surface, and an app is not on it. Linking there
                would 404 on a row the operator can plainly see. */}
            {row.original.kind === "app" ? (
              <span className="font-mono text-[13px] font-medium">{row.original.name}</span>
            ) : (
              <Link
                to={`/functions/${encodeURIComponent(row.original.name)}`}
                className="text-foreground hover:text-brand-gold font-mono text-[13px] font-medium underline-offset-4 hover:underline"
              >
                {row.original.name}
              </Link>
            )}
            <KindBadge kind={row.original.kind} />
          </div>
        ),
      },
      {
        accessorKey: "state",
        header: "State",
        cell: ({ row }) => (
          <StatusBadge
            status={row.original.state ?? "unknown"}
            pulse={(row.original.state ?? "").toLowerCase() === "active"}
          />
        ),
      },
      {
        accessorKey: "packageType",
        header: "Package",
        cell: ({ row }) => {
          const type = row.original.packageType
          if (!type) return cellText()
          const isImage = type === "image"
          return (
            <Badge variant="outline" className="gap-1 font-mono text-[11px]">
              {isImage ? <Container className="size-3" /> : <Package className="size-3" />}
              {type}
            </Badge>
          )
        },
      },
      {
        accessorKey: "runtime",
        header: "Runtime",
        cell: ({ row }) => cellText(row.original.runtime ?? row.original.runtimeMode),
      },
      {
        accessorKey: "version",
        header: "Version",
        // $LATEST is the working copy every unreleased workload sits on. It is
        // shown as it comes back rather than blanked, because "no version yet"
        // and "released v3" are different states an operator acts on.
        cell: ({ row }) => cellMono(row.original.version),
      },
      {
        accessorKey: "memorySizeMb",
        header: "Memory",
        cell: ({ row }) =>
          cellMono(
            row.original.memorySizeMb ? `${String(row.original.memorySizeMb)} MB` : undefined,
          ),
      },
      {
        accessorKey: "timeoutSec",
        header: "Timeout",
        cell: ({ row }) =>
          cellMono(row.original.timeoutSec ? `${String(row.original.timeoutSec)}s` : undefined),
      },
      {
        accessorKey: "accountId",
        header: "Account",
        cell: ({ row }) => cellMono(row.original.accountId),
      },
      {
        accessorKey: "resourceGroupId",
        header: "Resource group",
        cell: ({ row }) => cellText(row.original.resourceGroupId),
      },
    ],
    [],
  )

  return (
    <>
      <PageHeader
        title="Workloads"
        icon={Zap}
        description="Every workload this control plane runs — functions, workflows and managed apps — across all resource groups."
        actions={
          <Button
            variant="gold"
            onClick={() => {
              void navigate("/functions/new")
            }}
          >
            <Plus /> Create function
          </Button>
        }
      />

      <StatGrid className="mb-6">
        <StatCard label="Workloads" value={total} icon={Zap} loading={isLoading} />
        <StatCard
          label="Functions"
          value={counts.function ?? 0}
          icon={Cpu}
          loading={isLoading}
        />
        <StatCard
          label="Workflows"
          value={counts.workflow ?? 0}
          icon={Workflow}
          loading={isLoading}
        />
        <StatCard label="Managed apps" value={counts.app ?? 0} icon={Boxes} loading={isLoading} />
      </StatGrid>

      <Tabs
        value={kind}
        onValueChange={(next) => {
          setKind(next as WorkloadKind | "all")
        }}
        className="mb-4"
      >
        <TabsList>
          {KIND_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
              <Badge variant="secondary" className="ml-2 text-[10px] tabular-nums">
                {tab.value === "all" ? total : (counts[tab.value] ?? 0)}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <DataTable
        data={rows}
        columns={columns}
        loading={isLoading}
        searchable
        searchPlaceholder="Filter workloads…"
        empty={
          <EmptyState
            icon={Boxes}
            title={kind === "all" ? "No workloads deployed" : `No ${kind}s deployed`}
            description="Deploy one with POST /v1/functions and it will appear here."
          />
        }
        onRefresh={() => void refetch()}
        refreshing={isFetching}
        error={error ? apiErrorMessage(error) : undefined}
        onRetry={() => void refetch()}
      />
    </>
  )
}
