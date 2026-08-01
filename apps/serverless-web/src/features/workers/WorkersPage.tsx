import { useMemo } from "react"

import type { ColumnDef } from "@tanstack/react-table"
import { Cpu, HardDrive, Server, ServerOff } from "lucide-react"

import { useDashboard } from "@/lib/queries"
import type { Worker } from "@/lib/schemas"

import {
  Badge,
  PageHeader,
  ResourceTable,
  StatCard,
  StatGrid,
  StatusBadge,
  cellMono,
  cellText,
  timeAgo,
} from "@DataDack/common-ui"
const LIVE_STATES = ["ready", "active"]

export function WorkersPage() {
  const { data, isLoading } = useDashboard()
  const workers = data?.detail.workers ?? []

  const columns = useMemo<ColumnDef<Worker>[]>(
    () => [
      {
        accessorKey: "hostname",
        header: "Hostname",
        cell: ({ row }) => (
          <span className="font-mono text-[13px] font-medium">{row.original.hostname}</span>
        ),
      },
      {
        accessorKey: "state",
        header: "State",
        cell: ({ row }) => (
          <StatusBadge
            status={row.original.state}
            pulse={LIVE_STATES.includes(row.original.state.toLowerCase())}
          />
        ),
      },
      {
        accessorKey: "region",
        header: "Region",
        cell: ({ row }) =>
          cellText(
            row.original.zone
              ? `${row.original.region} / ${row.original.zone}`
              : row.original.region,
          ),
      },
      {
        accessorKey: "internalIp",
        header: "Internal IP",
        cell: ({ row }) => cellMono(row.original.internalIp),
      },
      {
        accessorKey: "backend",
        header: "Backend",
        cell: ({ row }) =>
          row.original.backend ? (
            <Badge variant="outline" className="font-mono text-[11px]">
              {row.original.backend}
            </Badge>
          ) : (
            cellText()
          ),
      },
      {
        accessorKey: "capacityMemoryMb",
        header: "Memory",
        cell: ({ row }) =>
          cellMono(
            row.original.capacityMemoryMb
              ? `${String(row.original.capacityMemoryMb)} MB`
              : undefined,
          ),
      },
      {
        accessorKey: "capacityMaxSandboxes",
        header: "Slots",
        cell: ({ row }) => cellMono(row.original.capacityMaxSandboxes),
      },
      {
        accessorKey: "lastHeartbeatAt",
        header: "Heartbeat",
        cell: ({ row }) => cellMono(timeAgo(row.original.lastHeartbeatAt)),
      },
    ],
    [],
  )

  const ready = workers.filter((w) => LIVE_STATES.includes(w.state.toLowerCase())).length
  const memory = workers.reduce((sum, w) => sum + (w.capacityMemoryMb ?? 0), 0)
  const slots = workers.reduce((sum, w) => sum + (w.capacityMaxSandboxes ?? 0), 0)

  return (
    <>
      <PageHeader
        title="Workers"
        icon={Server}
        description="Enrolled worker nodes and the capacity each one reports."
      />

      <StatGrid className="mb-6">
        <StatCard label="Workers" value={workers.length} icon={Server} loading={isLoading} />
        <StatCard label="Ready" value={ready} icon={Cpu} color="success" loading={isLoading} />
        <StatCard
          label="Total memory"
          value={memory ? `${String(memory)} MB` : 0}
          icon={HardDrive}
          loading={isLoading}
        />
        <StatCard label="Sandbox slots" value={slots} icon={Cpu} loading={isLoading} />
      </StatGrid>

      <ResourceTable
        data={workers}
        columns={columns}
        loading={isLoading}
        searchPlaceholder="Filter workers…"
        emptyIcon={ServerOff}
        emptyTitle="No workers enrolled"
        emptyDescription="Functions cannot be placed until a worker joins. Enrol one with a worker token."
      />
    </>
  )
}
