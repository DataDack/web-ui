import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { handleQuotaGateError } from "@/modules/governance/quota-gate"
import { handleKycGateError } from "@/modules/onboarding/kyc-gate"
import { extractError } from "@/services/api/client"

import { isTargetTransitional, TG_QUERY_KEYS } from "./target-groups.constants"
import { targetGroupsService } from "./target-groups.service"
import type {
  CreateTargetGroupRequest,
  RegisterTargetRequest,
  Target,
  UpdateTargetGroupRequest,
} from "./target-groups.types"

export function useTargetGroups() {
  return useQuery({
    queryKey: TG_QUERY_KEYS.list,
    queryFn: targetGroupsService.fetchAll,
  })
}

export function useTargetGroup(id: string) {
  return useQuery({
    queryKey: TG_QUERY_KEYS.detail(id),
    queryFn: () => targetGroupsService.fetchById(id),
    enabled: !!id,
  })
}

/**
 * Targets, with their live health.
 *
 * Health is written by the backend's poller, which scrapes HAProxy every 30s —
 * so this refetches on the same cadence to stay in step. It polls faster while a
 * target is still "initial" (registered, not yet checked), because that state
 * resolves within one health-check interval and the user is watching for it.
 */
/**
 * How often to re-read targets.
 *
 *   no targets      — nothing to watch, so do not poll at all (0 = off)
 *   any "initial"   — still being checked for the first time. The user is
 *                     watching for it to resolve, and it will within one
 *                     health-check interval.
 *   steady state    — match the backend poller's own 30s cadence; anything
 *                     faster just re-reads the same row.
 */
function targetPollInterval(targets: Target[] | undefined): number {
  if (!targets?.length) return 0
  if (targets.some((t) => isTargetTransitional(t.health_status))) return 5000
  return 30000
}

export function useTargets(id: string) {
  return useQuery({
    queryKey: TG_QUERY_KEYS.targets(id),
    queryFn: () => targetGroupsService.fetchTargets(id),
    enabled: !!id,
    refetchInterval: (query) => targetPollInterval(query.state.data) || false,
  })
}

export function useCreateTargetGroup() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (payload: CreateTargetGroupRequest) => targetGroupsService.create(payload),
    onSuccess: (tg) => {
      void queryClient.invalidateQueries({ queryKey: TG_QUERY_KEYS.list })
      toast.success(t("targetGroups.toasts.created", { name: tg.name }))
    },
    onError: (e) => {
      if (!handleKycGateError(e) && !handleQuotaGateError(e)) {
        toast.error(extractError(e, t("targetGroups.toasts.createFailed")))
      }
    },
  })
}

export function useUpdateTargetGroup(id: string) {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (payload: UpdateTargetGroupRequest) => targetGroupsService.update(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TG_QUERY_KEYS.detail(id) })
      void queryClient.invalidateQueries({ queryKey: TG_QUERY_KEYS.list })
      // Health-check settings and the algorithm are rendered into
      // haproxy.cfg, so saving them re-pushes config to every load
      // balancer using this group.
      toast.success(t("targetGroups.toasts.updated"))
    },
    onError: (e) => toast.error(extractError(e, t("targetGroups.toasts.updateFailed"))),
  })
}

export function useDeleteTargetGroup() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (id: string) => targetGroupsService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TG_QUERY_KEYS.list })
      toast.success(t("targetGroups.toasts.deleted"))
    },
    // A group still referenced by a listener returns 409 with a precise
    // message — deleting it would leave that listener pointing at nothing.
    onError: (e) => toast.error(extractError(e, t("targetGroups.toasts.deleteFailed"))),
  })
}

export function useRegisterTarget(tgId: string) {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (payload: RegisterTargetRequest) =>
      targetGroupsService.registerTarget(tgId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TG_QUERY_KEYS.targets(tgId) })
      toast.success(t("targetGroups.targets.toasts.registered"))
    },
    onError: (e) => toast.error(extractError(e, t("targetGroups.targets.toasts.registerFailed"))),
  })
}

export function useDeregisterTarget(tgId: string) {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (targetId: string) => targetGroupsService.deregisterTarget(tgId, targetId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TG_QUERY_KEYS.targets(tgId) })
      toast.success(t("targetGroups.targets.toasts.deregistered"))
    },
    onError: (e) => toast.error(extractError(e, t("targetGroups.targets.toasts.deregisterFailed"))),
  })
}
