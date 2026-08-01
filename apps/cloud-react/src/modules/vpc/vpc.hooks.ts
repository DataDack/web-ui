import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import type { RegionCatalog } from "@/modules/catalog/catalog.types"
import { handleQuotaGateError } from "@/modules/governance/quota-gate"
import { handleKycGateError } from "@/modules/onboarding/kyc-gate"
import { apiGet, extractError } from "@/services/api/client"

import { VPC_QUERY_KEYS } from "./vpc.constants"
import { vpcService } from "./vpc.service"
import type {
    AddSGRuleRequest,
    CreateNetworkInterfaceRequest,
    CreateSecurityGroupRequest,
    CreateSubnetRequest,
    CreateVPCRequest,
    ReserveStaticIPRequest,
    UpdateSGRuleRequest,
} from "./vpc.types"

/* ── Regions (from the infra catalog) ──────────────────────────────────────
 * VPC region must equal an infra zone `code` (the backend resolves a PVE node
 * by matching it), so the wizard loads real regions from the catalog rather
 * than a hardcoded list. */

export interface InfraZone {
    id: string
    code: string // e.g. "noida-1" — this is the value sent as `region`
    name: string // e.g. "Noida (NCR)"
    country?: string
}

export function useRegions() {
    return useQuery({
        queryKey: ["vpc", "regions"],
        queryFn: async () => {
            const regions = await apiGet<RegionCatalog[]>("/platform/infra/catalog/regions")
            return regions.map<InfraZone>((r) => ({
                id: r.id,
                code: r.code,
                name: r.name,
                country: r.country,
            }))
        },
        staleTime: 10 * 60 * 1000,
    })
}

/* ── Networks ──────────────────────────────────────────────────────────── */

export function useVPCs() {
    return useQuery({
        queryKey: VPC_QUERY_KEYS.list,
        queryFn: vpcService.fetchAll,
    })
}

export function useVPC(id: string) {
    return useQuery({
        queryKey: VPC_QUERY_KEYS.detail(id),
        queryFn: () => vpcService.fetchById(id),
        enabled: !!id,
    })
}

export function useCreateVPC() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: (payload: CreateVPCRequest) => vpcService.create(payload),
        onSuccess: (network) => {
            void queryClient.invalidateQueries({ queryKey: VPC_QUERY_KEYS.list })
            // Subnets are created in the same request, so refresh them too.
            void queryClient.invalidateQueries({ queryKey: ["vpc", "subnets"] })
            toast.success(t("vpc.toasts.created", { name: network.name }))
        },
        onError: (e) => {
            if (!handleKycGateError(e) && !handleQuotaGateError(e)) {
                toast.error(t("vpc.toasts.createFailed"))
            }
        },
    })
}

export function useDeleteVPC() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: (id: string) => vpcService.remove(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: VPC_QUERY_KEYS.list })
            void queryClient.invalidateQueries({ queryKey: ["vpc", "subnets"] })
            toast.success(t("vpc.toasts.deleted"))
        },
        onError: () => toast.error(t("vpc.toasts.deleteFailed")),
    })
}

/* ── Subnets ───────────────────────────────────────────────────────────── */

export function useVPCSubnets(networkId: string) {
    return useQuery({
        queryKey: VPC_QUERY_KEYS.subnets(networkId),
        queryFn: () => vpcService.fetchSubnets(networkId),
        enabled: !!networkId,
    })
}

export function useAllSubnets() {
    return useQuery({
        queryKey: VPC_QUERY_KEYS.subnets("all"),
        queryFn: vpcService.fetchAllSubnets,
    })
}

export function useCreateSubnet() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: (payload: CreateSubnetRequest) => vpcService.createSubnet(payload),
        onSuccess: (subnet) => {
            void queryClient.invalidateQueries({ queryKey: ["vpc", "subnets"] })
            toast.success(t("vpc.toasts.subnetCreated", { name: subnet.name }))
        },
        onError: (e) => {
            if (!handleQuotaGateError(e)) toast.error(t("vpc.toasts.subnetCreateFailed"))
        },
    })
}

export function useDeleteSubnet() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: (id: string) => vpcService.removeSubnet(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["vpc", "subnets"] })
            toast.success(t("vpc.toasts.subnetDeleted"))
        },
        onError: () => toast.error(t("vpc.toasts.subnetDeleteFailed")),
    })
}

/* ── Security groups ───────────────────────────────────────────────────── */

export function useSecurityGroups(networkId: string) {
    return useQuery({
        queryKey: VPC_QUERY_KEYS.securityGroups(networkId),
        queryFn: () => vpcService.fetchSecurityGroups(networkId),
        enabled: !!networkId,
    })
}

export function useAllSecurityGroups() {
    return useQuery({
        queryKey: VPC_QUERY_KEYS.securityGroups("all"),
        queryFn: vpcService.fetchAllSecurityGroups,
    })
}

export function useCreateSecurityGroup() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: (payload: CreateSecurityGroupRequest) =>
            vpcService.createSecurityGroup(payload),
        onSuccess: (group) => {
            void queryClient.invalidateQueries({ queryKey: ["vpc", "sgs"] })
            toast.success(t("vpc.toasts.sgCreated", { name: group.name }))
        },
        onError: (e) => {
            if (!handleQuotaGateError(e)) toast.error(t("vpc.toasts.sgCreateFailed"))
        },
    })
}

export function useSecurityGroup(id: string) {
    return useQuery({
        queryKey: VPC_QUERY_KEYS.securityGroupDetail(id),
        queryFn: () => vpcService.fetchSecurityGroup(id),
        enabled: !!id,
    })
}

/** Idempotent quick action: get-or-create the account's "default" SG (SSH/HTTP/
 *  HTTPS inbound). Optionally scoped to a VPC. */
export function useCreateDefaultSecurityGroup() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: (networkId?: string) => vpcService.createDefaultSecurityGroup(networkId),
        onSuccess: (group) => {
            void queryClient.invalidateQueries({ queryKey: ["vpc", "sgs"] })
            toast.success(t("vpc.toasts.sgDefaultCreated", { name: group.name }))
        },
        onError: (e) => toast.error(extractError(e, t("vpc.toasts.sgDefaultCreateFailed"))),
    })
}

export function useDeleteSecurityGroup() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: (id: string) => vpcService.removeSecurityGroup(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["vpc", "sgs"] })
            toast.success(t("vpc.toasts.sgDeleted"))
        },
        // Surfaces the backend message — notably the 409 when the group is still
        // attached to instances.
        onError: (e) => toast.error(extractError(e, t("vpc.toasts.sgDeleteFailed"))),
    })
}

export function useSGRules(sgId: string) {
    return useQuery({
        queryKey: VPC_QUERY_KEYS.sgRules(sgId),
        queryFn: () => vpcService.fetchSGRules(sgId),
        enabled: !!sgId,
    })
}

export function useAddSGRule() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: ({ sgId, payload }: { sgId: string; payload: AddSGRuleRequest }) =>
            vpcService.addSGRule(sgId, payload),
        onSuccess: (_rule, { sgId }) => {
            void queryClient.invalidateQueries({ queryKey: VPC_QUERY_KEYS.sgRules(sgId) })
            void queryClient.invalidateQueries({
                queryKey: VPC_QUERY_KEYS.securityGroupDetail(sgId),
            })
            toast.success(t("vpc.toasts.ruleAdded"))
        },
        onError: (e) => toast.error(extractError(e, t("vpc.toasts.ruleAddFailed"))),
    })
}

export function useUpdateSGRule() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: ({
            sgId,
            ruleId,
            payload,
        }: {
            sgId: string
            ruleId: string
            payload: UpdateSGRuleRequest
        }) => vpcService.updateSGRule(sgId, ruleId, payload),
        onSuccess: (_rule, { sgId }) => {
            void queryClient.invalidateQueries({ queryKey: VPC_QUERY_KEYS.sgRules(sgId) })
            void queryClient.invalidateQueries({
                queryKey: VPC_QUERY_KEYS.securityGroupDetail(sgId),
            })
            toast.success(t("vpc.toasts.ruleUpdated"))
        },
        onError: (e) => toast.error(extractError(e, t("vpc.toasts.ruleUpdateFailed"))),
    })
}

export function useRemoveSGRule() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: ({ ruleId, sgId }: { ruleId: string; sgId: string }) =>
            vpcService.removeSGRule(sgId, ruleId),
        onSuccess: (_void, { sgId }) => {
            void queryClient.invalidateQueries({ queryKey: VPC_QUERY_KEYS.sgRules(sgId) })
            void queryClient.invalidateQueries({
                queryKey: VPC_QUERY_KEYS.securityGroupDetail(sgId),
            })
            toast.success(t("vpc.toasts.ruleRemoved"))
        },
        onError: () => toast.error(t("vpc.toasts.ruleRemoveFailed")),
    })
}

/* ── Instance ↔ security-group attachments ─────────────────────────────── */

export function useInstanceSecurityGroups(instanceId: string) {
    return useQuery({
        queryKey: VPC_QUERY_KEYS.instanceSecurityGroups(instanceId),
        queryFn: () => vpcService.fetchInstanceSecurityGroups(instanceId),
        enabled: !!instanceId,
    })
}

export function useAttachInstanceSG() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: ({ instanceId, sgId }: { instanceId: string; sgId: string }) =>
            vpcService.attachInstanceSecurityGroup(instanceId, sgId),
        onSuccess: (_void, { instanceId }) => {
            void queryClient.invalidateQueries({
                queryKey: VPC_QUERY_KEYS.instanceSecurityGroups(instanceId),
            })
            toast.success(t("vpc.toasts.sgAttached"))
        },
        onError: (e) => toast.error(extractError(e, t("vpc.toasts.sgAttachFailed"))),
    })
}

export function useDetachInstanceSG() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: ({ instanceId, sgId }: { instanceId: string; sgId: string }) =>
            vpcService.detachInstanceSecurityGroup(instanceId, sgId),
        onSuccess: (_void, { instanceId }) => {
            void queryClient.invalidateQueries({
                queryKey: VPC_QUERY_KEYS.instanceSecurityGroups(instanceId),
            })
            toast.success(t("vpc.toasts.sgDetached"))
        },
        onError: (e) => toast.error(extractError(e, t("vpc.toasts.sgDetachFailed"))),
    })
}

/* ── Static IPs ────────────────────────────────────────────────────────── */

export function useStaticIPs() {
    return useQuery({
        queryKey: VPC_QUERY_KEYS.staticIps,
        queryFn: vpcService.fetchStaticIPs,
    })
}

export function useReserveStaticIP() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: (payload: ReserveStaticIPRequest) => vpcService.reserveStaticIP(payload),
        onSuccess: (ip) => {
            void queryClient.invalidateQueries({ queryKey: VPC_QUERY_KEYS.staticIps })
            toast.success(t("staticIps.toasts.reserved", { name: ip.name }))
        },
        onError: (e) => {
            if (!handleQuotaGateError(e)) toast.error(t("staticIps.toasts.reserveFailed"))
        },
    })
}

export function useAssignStaticIP() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: ({ id, instanceId }: { id: string; instanceId: string }) =>
            vpcService.assignStaticIP(id, instanceId),
        onSuccess: (ip) => {
            void queryClient.invalidateQueries({ queryKey: VPC_QUERY_KEYS.staticIps })
            toast.success(t("staticIps.toasts.assigned", { name: ip.name }))
        },
        onError: () => toast.error(t("staticIps.toasts.assignFailed")),
    })
}

export function useUnassignStaticIP() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: (id: string) => vpcService.unassignStaticIP(id),
        onSuccess: (ip) => {
            void queryClient.invalidateQueries({ queryKey: VPC_QUERY_KEYS.staticIps })
            toast.success(t("staticIps.toasts.unassigned", { name: ip.name }))
        },
        onError: () => toast.error(t("staticIps.toasts.unassignFailed")),
    })
}

export function useReleaseStaticIP() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: (id: string) => vpcService.releaseStaticIP(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: VPC_QUERY_KEYS.staticIps })
            toast.success(t("staticIps.toasts.released"))
        },
        onError: () => toast.error(t("staticIps.toasts.releaseFailed")),
    })
}

/* ── Network interfaces (ENI) ──────────────────────────────────────────── */

export function useNetworkInterfaces() {
    return useQuery({
        queryKey: VPC_QUERY_KEYS.networkInterfaces,
        queryFn: vpcService.fetchNetworkInterfaces,
    })
}

export function useNetworkInterface(id: string) {
    return useQuery({
        queryKey: VPC_QUERY_KEYS.networkInterfaceDetail(id),
        queryFn: () => vpcService.fetchNetworkInterface(id),
        enabled: !!id,
    })
}

export function useCreateNetworkInterface() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: (payload: CreateNetworkInterfaceRequest) =>
            vpcService.createNetworkInterface(payload),
        onSuccess: (nic) => {
            void queryClient.invalidateQueries({ queryKey: VPC_QUERY_KEYS.networkInterfaces })
            toast.success(t("networkInterfaces.toasts.created", { name: nic.name }))
        },
        onError: (e) => {
            if (!handleQuotaGateError(e)) toast.error(t("networkInterfaces.toasts.createFailed"))
        },
    })
}

export function useDeleteNetworkInterface() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: (id: string) => vpcService.removeNetworkInterface(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: VPC_QUERY_KEYS.networkInterfaces })
            toast.success(t("networkInterfaces.toasts.deleted"))
        },
        onError: () => toast.error(t("networkInterfaces.toasts.deleteFailed")),
    })
}

export function useAttachNetworkInterface() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: ({ id, instanceId }: { id: string; instanceId: string }) =>
            vpcService.attachNetworkInterface(id, instanceId),
        onSuccess: (nic) => {
            void queryClient.invalidateQueries({ queryKey: VPC_QUERY_KEYS.networkInterfaces })
            toast.success(t("networkInterfaces.toasts.attached", { name: nic.name }))
        },
        onError: () => toast.error(t("networkInterfaces.toasts.attachFailed")),
    })
}

export function useDetachNetworkInterface() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: (id: string) => vpcService.detachNetworkInterface(id),
        onSuccess: (nic) => {
            void queryClient.invalidateQueries({ queryKey: VPC_QUERY_KEYS.networkInterfaces })
            toast.success(t("networkInterfaces.toasts.detached", { name: nic.name }))
        },
        onError: () => toast.error(t("networkInterfaces.toasts.detachFailed")),
    })
}

/* ── Routers / gateways / VPN ──────────────────────────────────────────── */

export function useRouters() {
    return useQuery({
        queryKey: VPC_QUERY_KEYS.routers,
        queryFn: vpcService.fetchRouters,
    })
}

export function useNATGateways() {
    return useQuery({
        queryKey: VPC_QUERY_KEYS.nat,
        queryFn: vpcService.fetchNATGateways,
    })
}

export function useInternetGateways() {
    return useQuery({
        queryKey: VPC_QUERY_KEYS.igw,
        queryFn: vpcService.fetchInternetGateways,
    })
}

export function useAttachIGW() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: ({ id, networkId }: { id: string; networkId: string }) =>
            vpcService.attachIGW(id, networkId),
        onSuccess: (igw) => {
            void queryClient.invalidateQueries({ queryKey: VPC_QUERY_KEYS.igw })
            toast.success(t("vpc.toasts.igwAttached", { name: igw.name }))
        },
        onError: () => toast.error(t("vpc.toasts.igwActionFailed")),
    })
}

export function useDetachIGW() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: (id: string) => vpcService.detachIGW(id),
        onSuccess: (igw) => {
            void queryClient.invalidateQueries({ queryKey: VPC_QUERY_KEYS.igw })
            toast.success(t("vpc.toasts.igwDetached", { name: igw.name }))
        },
        onError: () => toast.error(t("vpc.toasts.igwActionFailed")),
    })
}

export function useVPNConnections() {
    return useQuery({
        queryKey: VPC_QUERY_KEYS.vpn,
        queryFn: vpcService.fetchVPNConnections,
    })
}
