import { useEffect } from "react"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { handleQuotaGateError } from "@/modules/governance/quota-gate"
import { useResourceGroup } from "@/modules/resource-groups/resource-group.context"

import { RG_QUERY_KEYS } from "./resource-groups.constants"
import { resourceGroupsService } from "./resource-groups.service"
import type {
    CreateResourceGroupPayload,
    ResourceGroup,
    UpdateResourceGroupPayload,
} from "./resource-groups.types"

export function useResourceGroups() {
    const { activeRG, setActiveRG } = useResourceGroup()

    const query = useQuery({
        queryKey: RG_QUERY_KEYS.list,
        queryFn: resourceGroupsService.fetchAll,
    })

    // Reconcile the persisted selection against the live list. The active RG is
    // a localStorage snapshot, so it can point at a group that was deleted, never
    // existed for this account, or was renamed since it was cached.
    useEffect(() => {
        const groups = query.data
        if (!groups) return // not loaded yet — keep whatever's persisted

        if (groups.length === 0) {
            // No groups exist — drop any stale selection.
            if (activeRG) setActiveRG(null)
            return
        }

        const fallback = groups.find((rg) => rg.isDefault) ?? groups[0]
        if (!activeRG) {
            setActiveRG(fallback)
            return
        }

        const live = groups.find((rg) => rg.id === activeRG.id)
        if (!live) {
            // Persisted RG no longer exists — fall back instead of showing a ghost.
            setActiveRG(fallback)
        } else if (JSON.stringify(live) !== JSON.stringify(activeRG)) {
            // Still exists but the cached snapshot is stale (e.g. renamed) — refresh it.
            setActiveRG(live)
        }
    }, [activeRG, query.data, setActiveRG])

    return query
}

export function useResourceGroup$(id: string) {
    return useQuery({
        queryKey: RG_QUERY_KEYS.detail(id),
        queryFn: () => resourceGroupsService.fetchById(id),
        enabled: !!id,
    })
}

// Members of a group, fanned out across every domain by the backend.
export function useResourceGroupResources$(id: string) {
    return useQuery({
        queryKey: RG_QUERY_KEYS.resources(id),
        queryFn: () => resourceGroupsService.fetchResources(id),
        enabled: !!id,
    })
}

export function useCreateResourceGroup() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (payload: CreateResourceGroupPayload) => resourceGroupsService.create(payload),
        onSuccess: (newRG) => {
            void queryClient.invalidateQueries({ queryKey: RG_QUERY_KEYS.list })
            toast.success(`"${newRG.displayName ?? newRG.name}" created`)
        },
        onError: (err: Error) => {
            if (!handleQuotaGateError(err)) toast.error(err.message)
        },
    })
}

export function useUpdateResourceGroup() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: UpdateResourceGroupPayload }) =>
            resourceGroupsService.update(id, payload),
        onSuccess: (_data, { id }) => {
            void queryClient.invalidateQueries({ queryKey: RG_QUERY_KEYS.list })
            void queryClient.invalidateQueries({ queryKey: RG_QUERY_KEYS.detail(id) })
            toast.success("Resource group updated")
        },
        onError: () => toast.error("Failed to update resource group"),
    })
}

export function useDeleteResourceGroup() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => resourceGroupsService.remove(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: RG_QUERY_KEYS.list })
            toast.success("Resource group deleted")
        },
        onError: (err: Error) => toast.error(err.message),
    })
}

export function useSwitchResourceGroup() {
    const { setActiveRG } = useResourceGroup()
    return useMutation({
        mutationFn: (rg: ResourceGroup) => Promise.resolve(rg),
        onSuccess: (rg) => {
            setActiveRG(rg)
            toast.success(`Switched to "${rg.displayName ?? rg.name}"`)
        },
    })
}
