import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { handleQuotaGateError } from "@/modules/governance/quota-gate"

import { SSH_KEYS_QUERY_KEYS } from "./ssh-keys.constants"
import { sshKeysService } from "./ssh-keys.service"
import type { CreateSSHKeyRequest } from "./ssh-keys.types"

export function useSSHKeys() {
  return useQuery({
    queryKey: SSH_KEYS_QUERY_KEYS.list,
    queryFn: sshKeysService.fetchAll,
  })
}

export function useCreateSSHKey() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (payload: CreateSSHKeyRequest) => sshKeysService.create(payload),
    onSuccess: (key) => {
      void queryClient.invalidateQueries({ queryKey: SSH_KEYS_QUERY_KEYS.list })
      toast.success(t("sshKeys.toasts.created", { name: key.name }))
    },
    onError: (e) => {
      if (!handleQuotaGateError(e)) toast.error(t("sshKeys.toasts.createFailed"))
    },
  })
}

export function useDeleteSSHKey() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (id: string) => sshKeysService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SSH_KEYS_QUERY_KEYS.list })
      toast.success(t("sshKeys.toasts.deleted"))
    },
    onError: () => toast.error(t("sshKeys.toasts.deleteFailed")),
  })
}
