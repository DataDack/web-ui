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
const base = "/vpc/routers/tables"
const key = ["vpc", "route-tables"] as const
export const routeTablePath = (id: string) => `/networking/route-tables/${id}`
export function useRouteTables() {
  return useQuery({ queryKey: key, queryFn: () => apiGet<RouteTable[]>(base), refetchInterval: 15000 })
}
export function useRouteTable(id: string) {
  return useQuery({ queryKey: [...key, id], queryFn: () => apiGet<RouteTable>(`${base}/${id}`), enabled: !!id, refetchInterval: 15000 })
}
export function useRouteTableActions() {
  const client = useQueryClient()
  const refresh = () => { void client.invalidateQueries({ queryKey: ["vpc"] }) }
  const onError = (error: unknown) => toast.error(extractError(error))
  const create = useMutation({
    mutationFn: (body: { name: string; vpc_id: string }) => apiPost<RouteTable>(base, body),
    onSuccess: () => { refresh(); toast.success("Route table created") }, onError,
  })
  const remove = useMutation({ mutationFn: (id: string) => apiDelete(`${base}/${id}`), onSuccess: () => { refresh(); toast.success("Route table deleted") }, onError })
  const associate = useMutation({ mutationFn: ({ id, subnet_ids }: { id: string; subnet_ids: string[] }) => apiPut(`${base}/${id}/associations`, { subnet_ids }), onSuccess: () => { refresh(); toast.success("Subnet associations saved") }, onError })
  return { create, remove, associate }
}
