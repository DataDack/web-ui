import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { handleQuotaGateError } from "@/modules/governance/quota-gate"
import { handleKycGateError } from "@/modules/onboarding/kyc-gate"
import { extractError } from "@/services/api/client"

import { isLbTransitional, LB_QUERY_KEYS } from "./load-balancers.constants"
import { lbService } from "./load-balancers.service"
import type {
  CreateListenerRequest,
  CreateLoadBalancerRequest,
  UpdateListenerRequest,
  UpdateLoadBalancerRequest,
} from "./load-balancers.types"

export function useLoadBalancers() {
  return useQuery({
    queryKey: LB_QUERY_KEYS.list,
    queryFn: lbService.fetchAll,
    // Keep the list live while any load balancer is still being realized on
    // Proxmox (clone the container, configure, boot, push haproxy.cfg), so
    // the row settles on its own once the backend finishes.
    refetchInterval: (query) =>
      query.state.data?.some((lb) => isLbTransitional(lb.status)) ? 4000 : false,
  })
}

export function useLoadBalancer(id: string) {
  return useQuery({
    queryKey: LB_QUERY_KEYS.detail(id),
    queryFn: () => lbService.fetchById(id),
    enabled: !!id,
    refetchInterval: (query) =>
      query.state.data && isLbTransitional(query.state.data.status) ? 4000 : false,
  })
}

/**
 * The subnets a load balancer is attached to (one private IP + NIC per subnet).
 *
 * Per-subnet private IPs are assigned by Proxmox while the container is being
 * realized, so poll on the same transitional cadence as the LB row until they
 * settle. `poll` mirrors `isLbTransitional(lb.status)` from the caller, which
 * already holds the live LB.
 */
export function useLBSubnets(id: string, poll = false) {
  return useQuery({
    queryKey: LB_QUERY_KEYS.subnets(id),
    queryFn: () => lbService.fetchSubnets(id),
    enabled: !!id,
    refetchInterval: poll ? 4000 : false,
  })
}

export function useLBListeners(id: string) {
  return useQuery({
    queryKey: LB_QUERY_KEYS.listeners(id),
    queryFn: () => lbService.fetchListeners(id),
    enabled: !!id,
  })
}

export function useCreateLoadBalancer() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (payload: CreateLoadBalancerRequest) => lbService.create(payload),
    onSuccess: (lb) => {
      void queryClient.invalidateQueries({ queryKey: LB_QUERY_KEYS.list })
      toast.success(t("loadBalancers.toasts.created", { name: lb.name }))
    },
    onError: (e) => {
      if (!handleKycGateError(e) && !handleQuotaGateError(e)) {
        toast.error(extractError(e, t("loadBalancers.toasts.createFailed")))
      }
    },
  })
}

export function useUpdateLoadBalancer(id: string) {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (payload: UpdateLoadBalancerRequest) => lbService.update(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: LB_QUERY_KEYS.detail(id) })
      void queryClient.invalidateQueries({ queryKey: LB_QUERY_KEYS.list })
      toast.success(t("loadBalancers.toasts.updated"))
    },
    onError: (e) => toast.error(extractError(e, t("loadBalancers.toasts.updateFailed"))),
  })
}

export function useDeleteLoadBalancer() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (id: string) => lbService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: LB_QUERY_KEYS.list })
      toast.success(t("loadBalancers.toasts.deleted"))
    },
    onError: (e) => toast.error(extractError(e, t("loadBalancers.toasts.deleteFailed"))),
  })
}

export function useCreateListener(lbId: string) {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (payload: CreateListenerRequest) => lbService.createListener(lbId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: LB_QUERY_KEYS.listeners(lbId) })
      toast.success(t("loadBalancers.listeners.toasts.created"))
    },
    // The backend rejects a duplicate port (409) and a protocol that
    // contradicts the LB type (400) with a precise message — surface that,
    // not a generic failure.
    onError: (e) => toast.error(extractError(e, t("loadBalancers.listeners.toasts.createFailed"))),
  })
}

/**
 * Change where a listener forwards, or who may reach it, without dropping it.
 * Deleting and recreating takes the port out of both haproxy.cfg and the
 * hypervisor firewall, so traffic stops for the round trip — and stays stopped
 * if the recreate fails.
 */
export function useUpdateListener(lbId: string) {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: ({ listenerId, payload }: { listenerId: string; payload: UpdateListenerRequest }) =>
      lbService.updateListener(lbId, listenerId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: LB_QUERY_KEYS.listeners(lbId) })
      toast.success(t("loadBalancers.listeners.toasts.updated"))
    },
    onError: (e) => toast.error(extractError(e, t("loadBalancers.listeners.toasts.updateFailed"))),
  })
}

export function useDeleteListener(lbId: string) {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (listenerId: string) => lbService.removeListener(lbId, listenerId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: LB_QUERY_KEYS.listeners(lbId) })
      toast.success(t("loadBalancers.listeners.toasts.deleted"))
    },
    onError: (e) => toast.error(extractError(e, t("loadBalancers.listeners.toasts.deleteFailed"))),
  })
}
