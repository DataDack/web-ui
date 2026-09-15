import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { apiDelete, apiGet, apiPost, apiPut, extractError } from "@/services/api/client"

export interface NetworkRoute {
  id: string
  destination_cidr: string
  target_type: string
  target_id?: string
  status: string
  provision_error?: string
}
export interface RouteTable {
  id: string
  name: string
  vpc_id: string
  vpc_name: string
  cidr: string
  region: string
  is_main: boolean
  account_id: string
  created_at: string
  network_status: string
  provision_error?: string
  zone_type: string
  routes: NetworkRoute[]
  associations: { subnet_id: string; route_table_id: string }[]
}
/**
 * Target types a tenant may write. The API refuses everything else, and says so:
 * `local` is derived from the VPC's own CIDR, while `instance` and `vpn_gateway`
 * have no next-hop knob in the SDN fabric to install them into — Proxmox routes a
 * tenant VRF by route-target import (peering) and exit nodes (egress) only.
 */
export const ROUTE_TARGET_TYPES = ["internet_gateway", "nat_gateway", "vpc_peering"] as const
export type RouteTargetType = (typeof ROUTE_TARGET_TYPES)[number]

export const ROUTE_TARGET_LABELS: Record<string, string> = {
  local: "Local",
  internet_gateway: "Internet gateway",
  nat_gateway: "NAT gateway",
  vpc_peering: "VPC peering",
  instance: "Instance",
  vpn_gateway: "VPN gateway",
}

export interface RouteInput {
  destination_cidr: string
  target_type: RouteTargetType
  target_id: string
}

const base = "/vpc/routers/tables"
const key = ["vpc", "route-tables"] as const
export const routeTablePath = (id: string) => `/networking/route-tables/${id}`
export function useRouteTables() {
  return useQuery({
    queryKey: key,
    queryFn: () => apiGet<RouteTable[]>(base),
    refetchInterval: 15000,
  })
}
export function useRouteTable(id: string) {
  return useQuery({
    queryKey: [...key, id],
    queryFn: () => apiGet<RouteTable>(`${base}/${id}`),
    enabled: !!id,
    refetchInterval: 15000,
  })
}
export function useRouteTableActions() {
  const client = useQueryClient()
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ["vpc"] })
  }
  const onError = (error: unknown) =>
    toast.error(extractError(error, "The route-table operation failed. Please try again."))
  const create = useMutation({
    mutationFn: (body: { name: string; vpc_id: string }) => apiPost<RouteTable>(base, body),
    onSuccess: () => {
      refresh()
      toast.success("Route table created")
    },
    onError,
  })
  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`${base}/${id}`),
    onSuccess: () => {
      refresh()
      toast.success("Route table deleted")
    },
    onError,
  })
  const associate = useMutation({
    mutationFn: ({ id, subnet_ids }: { id: string; subnet_ids: string[] }) =>
      apiPut(`${base}/${id}/associations`, { subnet_ids }),
    onSuccess: () => {
      refresh()
      toast.success("Subnet associations saved")
    },
    onError,
  })
  // Every refusal the route API returns names what to change: an unrealizable
  // target type, a destination that overlaps the VPC CIDR, a prefix the table
  // already routes. A generic message would throw all of that away.
  const routeError = (fallback: string) => (error: unknown) => {
    toast.error(extractError(error, fallback))
  }
  const createRoute = useMutation({
    mutationFn: ({ tableID, ...body }: RouteInput & { tableID: string }) =>
      apiPost<NetworkRoute>(`${base}/${tableID}/routes`, body),
    onSuccess: () => {
      refresh()
      toast.success("Route added")
    },
    onError: routeError("The route could not be added."),
  })
  const updateRoute = useMutation({
    mutationFn: ({
      tableID,
      routeID,
      ...body
    }: RouteInput & { tableID: string; routeID: string }) =>
      apiPut<NetworkRoute>(`${base}/${tableID}/routes/${routeID}`, body),
    onSuccess: () => {
      refresh()
      toast.success("Route updated")
    },
    onError: routeError("The route could not be updated."),
  })
  const deleteRoute = useMutation({
    mutationFn: ({ tableID, routeID }: { tableID: string; routeID: string }) =>
      apiDelete(`${base}/${tableID}/routes/${routeID}`),
    onSuccess: () => {
      refresh()
      toast.success("Route deleted")
    },
    onError: routeError("The route could not be deleted."),
  })
  return { create, remove, associate, createRoute, updateRoute, deleteRoute }
}
