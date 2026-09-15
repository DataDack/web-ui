import { useMemo } from "react"

import { ROUTE_TARGET_TYPES, type NetworkRoute, type RouteTargetType } from "../../route-tables"
import { useInternetGateways, useNATGateways, usePeerings, useVPCs } from "../../vpc.hooks"

export interface RouteTargetOption {
  id: string
  label: string
  /** Secondary line: what the target is, or where it leads. */
  hint?: string
  /** For a peering, the peer VPC's CIDR — the destination such a route carries. */
  cidr?: string
}

export interface RouteTargets {
  options: Record<RouteTargetType, RouteTargetOption[]>
  /** Every offered target by id, so a stored route can be shown by name. */
  byID: Map<string, RouteTargetOption>
  isLoading: boolean
  isError: boolean
  refetch: () => void
}

/** Why a target type has nothing to offer, phrased as the thing to go do. */
export const ROUTE_TARGET_EMPTY: Record<RouteTargetType, string> = {
  internet_gateway: "No internet gateway is attached to this VPC.",
  nat_gateway: "This VPC has no NAT gateway.",
  vpc_peering: "This VPC has no active peering.",
}

/**
 * The targets a route in this VPC may point at, matched to what the API will
 * accept: the gateway or peering must belong to this VPC, because one attached
 * to another VPC sits in a different VRF and cannot carry this table's traffic.
 */
export function useRouteTargets(vpcID: string): RouteTargets {
  const {
    data: igws,
    isLoading: igwsLoading,
    isError: igwsError,
    refetch: refetchIGWs,
  } = useInternetGateways()
  const {
    data: nats,
    isLoading: natsLoading,
    isError: natsError,
    refetch: refetchNATs,
  } = useNATGateways()
  const {
    data: peerings,
    isLoading: peeringsLoading,
    isError: peeringsError,
    refetch: refetchPeerings,
  } = usePeerings()
  const { data: vpcs, isLoading: vpcsLoading, isError: vpcsError, refetch: refetchVPCs } = useVPCs()

  // Memoized on the query payloads so a poll that changes nothing hands back the
  // same object, and the columns built from it are not rebuilt every 15 seconds.
  return useMemo(() => {
    const vpcByID = new Map((vpcs ?? []).map((vpc) => [vpc.id, vpc]))
    const options: Record<RouteTargetType, RouteTargetOption[]> = {
      internet_gateway: (igws ?? [])
        .filter((igw) => igw.network_id === vpcID)
        .map((igw) => ({ id: igw.id, label: igw.name, hint: "Internet gateway" })),
      // A gateway mid-teardown still answers the ownership check the API makes,
      // but pointing a route at one buys the tenant a route to nothing.
      nat_gateway: (nats ?? [])
        .filter(
          (nat) =>
            nat.network_id === vpcID && nat.status !== "deleting" && nat.status !== "deleted",
        )
        .map((nat) => ({ id: nat.id, label: nat.name, hint: `${nat.connectivity} NAT gateway` })),
      // Only an active peering leaks routes between the two VRFs. A request still
      // awaiting acceptance would store a route that carries nothing.
      vpc_peering: (peerings ?? [])
        .filter(
          (peering) =>
            peering.status === "active" &&
            (peering.requester_vpc_id === vpcID || peering.accepter_vpc_id === vpcID),
        )
        .map((peering) => {
          const peer = vpcByID.get(
            peering.requester_vpc_id === vpcID ? peering.accepter_vpc_id : peering.requester_vpc_id,
          )
          return {
            id: peering.id,
            label: peering.name,
            hint: peer ? `${peer.name} · ${peer.cidr}` : "Peered VPC",
            cidr: peer?.cidr,
          }
        }),
    }

    const byID = new Map<string, RouteTargetOption>()
    for (const type of ROUTE_TARGET_TYPES) {
      for (const option of options[type]) byID.set(option.id, option)
    }

    return {
      options,
      byID,
      isLoading: igwsLoading || natsLoading || peeringsLoading || vpcsLoading,
      isError: igwsError || natsError || peeringsError || vpcsError,
      refetch: () => {
        void refetchIGWs()
        void refetchNATs()
        void refetchPeerings()
        void refetchVPCs()
      },
    }
  }, [
    vpcID,
    igws,
    nats,
    peerings,
    vpcs,
    igwsLoading,
    natsLoading,
    peeringsLoading,
    vpcsLoading,
    igwsError,
    natsError,
    peeringsError,
    vpcsError,
    refetchIGWs,
    refetchNATs,
    refetchPeerings,
    refetchVPCs,
  ])
}

/** How a stored route's target reads in the table: a name, else the raw id. */
export function routeTargetLabel(targets: RouteTargets, route: NetworkRoute): string {
  if (route.target_type === "local") return "local"
  if (!route.target_id) return route.target_type
  return targets.byID.get(route.target_id)?.label ?? route.target_id
}
