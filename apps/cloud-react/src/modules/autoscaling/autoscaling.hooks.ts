import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { handleQuotaGateError } from "@/modules/governance/quota-gate"
import { handleKycGateError } from "@/modules/onboarding/kyc-gate"

import { ASG_QUERY_KEYS } from "./autoscaling.constants"
import { asgService } from "./autoscaling.service"
import type { CreateASGRequest } from "./autoscaling.types"

export function useASGs() {
  return useQuery({
    queryKey: ASG_QUERY_KEYS.list,
    queryFn: asgService.fetchAll,
  })
}

export function useASG(id: string) {
  return useQuery({
    queryKey: ASG_QUERY_KEYS.detail(id),
    queryFn: () => asgService.fetchById(id),
    enabled: !!id,
  })
}

export function useCreateASG() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (payload: CreateASGRequest) => asgService.create(payload),
    onSuccess: (asg) => {
      void queryClient.invalidateQueries({ queryKey: ASG_QUERY_KEYS.list })
      toast.success(t("autoscaling.toasts.created", { name: asg.name }))
    },
    onError: (e) => {
      if (!handleKycGateError(e) && !handleQuotaGateError(e)) {
        toast.error(t("autoscaling.toasts.createFailed"))
      }
    },
  })
}

export function useSetASGCapacity() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: ({ id, desiredSize }: { id: string; desiredSize: number }) =>
      asgService.setCapacity(id, desiredSize),
    onSuccess: (asg) => {
      void queryClient.invalidateQueries({ queryKey: ASG_QUERY_KEYS.list })
      void queryClient.invalidateQueries({ queryKey: ASG_QUERY_KEYS.detail(asg.id) })
      toast.success(t("autoscaling.toasts.capacitySet", { name: asg.name }))
    },
    onError: () => toast.error(t("autoscaling.toasts.capacityFailed")),
  })
}

export function useDeleteASG() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (id: string) => asgService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ASG_QUERY_KEYS.list })
      toast.success(t("autoscaling.toasts.deleted"))
    },
    onError: () => toast.error(t("autoscaling.toasts.deleteFailed")),
  })
}
