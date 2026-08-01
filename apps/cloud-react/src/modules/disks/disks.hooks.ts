import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { handleQuotaGateError } from "@/modules/governance/quota-gate"
import { handleKycGateError } from "@/modules/onboarding/kyc-gate"
import { extractError } from "@/services/api/client"

import { DISKS_QUERY_KEYS } from "./disks.constants"
import { disksService } from "./disks.service"
import type { CreateDiskRequest } from "./disks.types"

export function useDisks() {
  return useQuery({
    queryKey: DISKS_QUERY_KEYS.list,
    queryFn: disksService.fetchAll,
  })
}

export function useCreateDisk() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (payload: CreateDiskRequest) => disksService.create(payload),
    onSuccess: (disk) => {
      void queryClient.invalidateQueries({ queryKey: DISKS_QUERY_KEYS.list })
      toast.success(t("disks.toasts.created", { name: disk.name }))
    },
    onError: (e) => {
      if (!handleKycGateError(e) && !handleQuotaGateError(e)) {
        toast.error(t("disks.toasts.createFailed"))
      }
    },
  })
}

export function useAttachDisk() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: ({ id, instanceId }: { id: string; instanceId: string }) =>
      disksService.attach(id, instanceId),
    onSuccess: (disk) => {
      void queryClient.invalidateQueries({ queryKey: DISKS_QUERY_KEYS.list })
      toast.success(t("disks.toasts.attached", { name: disk.name }))
    },
    onError: () => toast.error(t("disks.toasts.attachFailed")),
  })
}

export function useDetachDisk() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (id: string) => disksService.detach(id),
    onSuccess: (disk) => {
      void queryClient.invalidateQueries({ queryKey: DISKS_QUERY_KEYS.list })
      toast.success(t("disks.toasts.detached", { name: disk.name }))
    },
    onError: (e) => toast.error(extractError(e, t("disks.toasts.detachFailed"))),
  })
}

export function useDeleteDisk() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (id: string) => disksService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: DISKS_QUERY_KEYS.list })
      toast.success(t("disks.toasts.deleted"))
    },
    onError: (e) => toast.error(extractError(e, t("disks.toasts.deleteFailed"))),
  })
}
