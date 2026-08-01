import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { DISKS_QUERY_KEYS } from "@/modules/disks/disks.constants"
import { handleQuotaGateError } from "@/modules/governance/quota-gate"
import { handleKycGateError } from "@/modules/onboarding/kyc-gate"
import { extractError } from "@/services/api/client"

import { isVmTransitional, VMS_QUERY_KEYS } from "./vms.constants"
import { vmsService } from "./vms.service"
import type { CreateInstanceRequest, InstanceAction, UpdateInstanceRequest } from "./vms.types"

export function useInstances() {
    return useQuery({
        queryKey: VMS_QUERY_KEYS.list,
        queryFn: vmsService.fetchAll,
        // Keep the list live while any instance has a lifecycle transition in
        // flight (provisioning/starting/stopping/deleting) so loaders resolve
        // on their own the moment the backend settles the row.
        refetchInterval: (query) =>
            query.state.data?.some((i) => isVmTransitional(i.status)) ? 4000 : false,
    })
}

/**
 * Aggregate compute fleet status (counts + per-zone capacity) for the overview —
 * a single account-scoped call that replaces fetching the instance/disk/LB/ASG
 * lists just to count them.
 */
export function useComputeStatus() {
    return useQuery({
        queryKey: VMS_QUERY_KEYS.status,
        queryFn: vmsService.fetchStatus,
    })
}

export function useInstance(id: string) {
    return useQuery({
        queryKey: VMS_QUERY_KEYS.detail(id),
        queryFn: () => vmsService.fetchById(id),
        enabled: !!id,
        // Auto-refresh while a lifecycle transition is in flight (provisioning,
        // starting, stopping, deleting…) so the loader resolves on its own the
        // moment the backend settles the row — no manual refresh.
        refetchInterval: (query) => {
            const s = query.state.data?.status
            return s && isVmTransitional(s) ? 4000 : false
        },
    })
}

/** Live resource series for the instance over `range`, polled every 5s. */
export function useInstanceMetrics(id: string, range: string, options?: { enabled?: boolean }) {
    const enabled = options?.enabled ?? true
    return useQuery({
        queryKey: VMS_QUERY_KEYS.metrics(id, range),
        queryFn: () => vmsService.fetchMetrics(id, range),
        enabled: !!id && enabled,
        refetchInterval: 5000,
    })
}

export function useInstanceEvents(id: string) {
    return useQuery({
        queryKey: VMS_QUERY_KEYS.events(id),
        queryFn: () => vmsService.fetchEvents(id),
        enabled: !!id,
    })
}

export function useCreateInstance() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: (payload: CreateInstanceRequest) => vmsService.create(payload),
        onSuccess: (instance) => {
            void queryClient.invalidateQueries({ queryKey: VMS_QUERY_KEYS.list })
            // Creating an instance also provisions its boot disk server-side, so
            // refresh the disks list — otherwise the Disks tab shows a stale
            // "no disks attached".
            void queryClient.invalidateQueries({ queryKey: DISKS_QUERY_KEYS.list })
            toast.success(t("vms.toasts.created", { name: instance.name }))
        },
        // Surface the server message so an insufficient-credit 402 ("please top up
        // your wallet") reaches the user instead of a generic failure.
        onError: (e) => {
            if (!handleKycGateError(e) && !handleQuotaGateError(e)) {
                toast.error(extractError(e, t("vms.toasts.createFailed")))
            }
        },
    })
}

export function useUpdateInstance() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: UpdateInstanceRequest }) =>
            vmsService.update(id, payload),
        onSuccess: (_instance, { id }) => {
            void queryClient.invalidateQueries({ queryKey: VMS_QUERY_KEYS.list })
            void queryClient.invalidateQueries({ queryKey: VMS_QUERY_KEYS.detail(id) })
            toast.success(t("vms.toasts.updated", "Instance settings updated"))
        },
        onError: (e) =>
            toast.error(extractError(e, t("vms.toasts.updateFailed", "Failed to update instance"))),
    })
}

export function useInstanceAction() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: ({ id, action }: { id: string; action: InstanceAction }) =>
            vmsService.runAction(id, action),
        onSuccess: (instance, { id, action }) => {
            void queryClient.invalidateQueries({ queryKey: VMS_QUERY_KEYS.list })
            void queryClient.invalidateQueries({ queryKey: VMS_QUERY_KEYS.detail(id) })
            void queryClient.invalidateQueries({ queryKey: VMS_QUERY_KEYS.events(id) })
            toast.success(t(`vms.toasts.${action}`, { name: instance.name }))
        },
        onError: (e) => toast.error(extractError(e, t("vms.toasts.actionFailed"))),
    })
}

export function useDeleteInstance() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: (id: string) => vmsService.remove(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: VMS_QUERY_KEYS.list })
            // The boot disk is torn down with the instance — drop it from the
            // disks cache too.
            void queryClient.invalidateQueries({ queryKey: DISKS_QUERY_KEYS.list })
            toast.success(t("vms.toasts.terminated"))
        },
        // Surface the server reason — e.g. the 409 "termination protection is
        // enabled" refusal — instead of a generic failure.
        onError: (e) => toast.error(extractError(e, t("vms.toasts.terminateFailed"))),
    })
}
