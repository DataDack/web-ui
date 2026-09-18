import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import type { RegionCatalog } from "@/modules/catalog/catalog.types"
import { handleQuotaGateError } from "@/modules/governance/quota-gate"
import { handleKycGateError } from "@/modules/onboarding/kyc-gate"
import { apiGet, extractError } from "@/services/api/client"

import { isVpcGatewayTransitional, VPC_QUERY_KEYS } from "./vpc.constants"
import { vpcService } from "./vpc.service"
import type {
  AddSGRuleRequest,
  CreateInternetGatewayRequest,
  AddIpSetEntriesRequest,
  CreateIpSetRequest,
  CreateNATGatewayRequest,
  UpdateIpSetRequest,
  UpdateNATGatewayRequest,
  CreateNetworkInterfaceRequest,
  CreateSecurityGroupRequest,
  CreateSubnetRequest,
  CreateVPCRequest,
  CreateVpcPeeringRequest,
  ReachabilityQuery,
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
    // Surfaces the backend message — notably the 409 while instances, load
    // balancers or managed apps are still on the VPC.
    onError: (e) => toast.error(extractError(e, t("vpc.toasts.deleteFailed"))),
  })
}

/* ── Subnets ───────────────────────────────────────────────────────────── */

export function useVPCSubnets(networkId: string) {
  return useQuery({
    queryKey: VPC_QUERY_KEYS.subnets(networkId),
    queryFn: () => vpcService.fetchSubnets(networkId),
    enabled: !!networkId,
    // A subnet added to an existing VPC is realized asynchronously; poll until
    // it settles so "pending" does not sit on screen until a manual refresh.
    refetchInterval: (query) =>
      query.state.data?.some((s) => isVpcGatewayTransitional(s.status)) ? 4000 : false,
  })
}

export function useAllSubnets() {
  return useQuery({
    queryKey: VPC_QUERY_KEYS.subnets("all"),
    queryFn: vpcService.fetchAllSubnets,
    refetchInterval: (query) =>
      query.state.data?.some((s) => isVpcGatewayTransitional(s.status)) ? 4000 : false,
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
    // Surfaces the backend message: a CIDR outside the VPC or overlapping a
    // sibling, a zone in another region, a VPC that is being deleted.
    onError: (e) => {
      if (!handleQuotaGateError(e)) toast.error(extractError(e, t("vpc.toasts.subnetCreateFailed")))
    },
  })
}

export function useRenameSubnet() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => vpcService.renameSubnet(id, name),
    onSuccess: (_subnet, { name }) => {
      void queryClient.invalidateQueries({ queryKey: ["vpc", "subnets"] })
      toast.success(t("vpc.toasts.subnetRenamed", { name }))
    },
    onError: (e) => toast.error(extractError(e, t("vpc.toasts.subnetRenameFailed"))),
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
    // Surfaces the backend message — notably the refusal while instances or
    // network interfaces are still on the subnet.
    onError: (e) => toast.error(extractError(e, t("vpc.toasts.subnetDeleteFailed"))),
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
    mutationFn: (payload: CreateSecurityGroupRequest) => vpcService.createSecurityGroup(payload),
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
      if (!handleQuotaGateError(e)) {
        toast.error(extractError(e, t("networkInterfaces.toasts.createFailed")))
      }
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
    // The backend's refusals say what to do ("detach it first"); show them.
    onError: (e) => toast.error(extractError(e, t("networkInterfaces.toasts.deleteFailed"))),
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
    onError: (e) => toast.error(extractError(e, t("networkInterfaces.toasts.attachFailed"))),
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
    onError: (e) => toast.error(extractError(e, t("networkInterfaces.toasts.detachFailed"))),
  })
}

/* ── Routers / gateways / VPN ──────────────────────────────────────────── */

export function useRouters() {
  return useQuery({
    queryKey: VPC_QUERY_KEYS.routers,
    queryFn: vpcService.fetchRouters,
    // Router provisioning runs through pending → provisioning → booting →
    // configuring before settling, so poll while any row is still mid-flight.
    refetchInterval: (query) =>
      query.state.data?.some((r) => isVpcGatewayTransitional(r.status)) ? 4000 : false,
  })
}

export function useUpdateRouter() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: ({ id, enableSNAT }: { id: string; enableSNAT: boolean }) =>
      vpcService.updateRouter(id, enableSNAT),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: VPC_QUERY_KEYS.routers })
      toast.success(t("routers.toasts.updated"))
    },
    onError: (e) => toast.error(extractError(e, t("routers.toasts.updateFailed"))),
  })
}

export function useDeleteRouter() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (id: string) => vpcService.removeRouter(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: VPC_QUERY_KEYS.routers })
      toast.success(t("routers.toasts.deleted"))
    },
    onError: (e) => toast.error(extractError(e, t("routers.toasts.deleteFailed"))),
  })
}

export function useNATGateways() {
  return useQuery({
    queryKey: VPC_QUERY_KEYS.nat,
    queryFn: vpcService.fetchNATGateways,
    refetchInterval: (query) =>
      query.state.data?.some((n) => isVpcGatewayTransitional(n.status)) ? 4000 : false,
  })
}

export function useCreateNATGateway() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (payload: CreateNATGatewayRequest) => vpcService.createNATGateway(payload),
    onSuccess: (nat) => {
      void queryClient.invalidateQueries({ queryKey: VPC_QUERY_KEYS.nat })
      toast.success(t("natGateways.toasts.created", { name: nat.name }))
    },
    onError: (e) => {
      if (!handleQuotaGateError(e)) toast.error(t("natGateways.toasts.createFailed"))
    },
  })
}

/** Rename, or stop/resume outbound translation. `enabled` is only sent when it
 *  is passed, so a rename never reads as a request to disable the gateway. */
export function useUpdateNATGateway() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateNATGatewayRequest & { id: string }) =>
      vpcService.updateNATGateway(id, payload),
    onSuccess: (nat) => {
      void queryClient.invalidateQueries({ queryKey: VPC_QUERY_KEYS.nat })
      toast.success(
        nat.enabled
          ? t("natGateways.toasts.enabled", { name: nat.name })
          : t("natGateways.toasts.disabled", { name: nat.name }),
      )
    },
    onError: (e) => toast.error(extractError(e, t("natGateways.toasts.updateFailed"))),
  })
}

/* ── IP sets ───────────────────────────────────────────────────────────── */

export function useIPSets() {
  return useQuery({ queryKey: VPC_QUERY_KEYS.ipSets, queryFn: vpcService.fetchIPSets })
}

export function useIPSet(id: string) {
  return useQuery({
    queryKey: VPC_QUERY_KEYS.ipSetDetail(id),
    queryFn: () => vpcService.fetchIPSet(id),
    enabled: !!id,
  })
}

export function useCreateIPSet() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (payload: CreateIpSetRequest) => vpcService.createIPSet(payload),
    onSuccess: (set) => {
      void queryClient.invalidateQueries({ queryKey: VPC_QUERY_KEYS.ipSets })
      toast.success(t("ipSets.toasts.created", { name: set.name }))
    },
    onError: (e) => {
      if (!handleQuotaGateError(e)) toast.error(t("ipSets.toasts.createFailed"))
    },
  })
}

export function useUpdateIPSet() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateIpSetRequest & { id: string }) =>
      vpcService.updateIPSet(id, payload),
    onSuccess: (set) => {
      void queryClient.invalidateQueries({ queryKey: VPC_QUERY_KEYS.ipSets })
      void queryClient.invalidateQueries({ queryKey: VPC_QUERY_KEYS.ipSetDetail(set.id) })
      toast.success(t("ipSets.toasts.updated"))
    },
    onError: (e) => toast.error(extractError(e, t("ipSets.toasts.updateFailed"))),
  })
}

export function useDeleteIPSet() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (id: string) => vpcService.removeIPSet(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: VPC_QUERY_KEYS.ipSets })
      toast.success(t("ipSets.toasts.deleted"))
    },
    // A set still referenced by a security group rule is refused with a 409;
    // surfacing the server's message names the rule, which "delete failed"
    // would not.
    onError: (e) => toast.error(extractError(e, t("ipSets.toasts.deleteFailed"))),
  })
}

/** A bulk add is normally a PARTIAL success: duplicates are skipped and bad
 *  CIDRs are reported rather than failing the call, so the toast reports all
 *  three outcomes instead of a flat "saved". */
export function useAddIPSetEntries() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: ({ id, entries }: AddIpSetEntriesRequest & { id: string }) =>
      vpcService.addIPSetEntries(id, { entries }),
    onSuccess: (result, { id }) => {
      void queryClient.invalidateQueries({ queryKey: VPC_QUERY_KEYS.ipSetDetail(id) })
      void queryClient.invalidateQueries({ queryKey: VPC_QUERY_KEYS.ipSets })
      if (result.invalid?.length) {
        toast.warning(
          t("ipSets.toasts.addedWithInvalid", {
            added: result.added,
            invalid: result.invalid.join(", "),
          }),
        )
        return
      }
      toast.success(
        result.skipped > 0
          ? t("ipSets.toasts.addedWithSkipped", { added: result.added, skipped: result.skipped })
          : t("ipSets.toasts.added", { added: result.added }),
      )
    },
    onError: (e) => toast.error(extractError(e, t("ipSets.toasts.addFailed"))),
  })
}

export function useRemoveIPSetEntry() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: ({ id, entryId }: { id: string; entryId: string }) =>
      vpcService.removeIPSetEntry(id, entryId),
    onSuccess: (_r, { id }) => {
      void queryClient.invalidateQueries({ queryKey: VPC_QUERY_KEYS.ipSetDetail(id) })
      void queryClient.invalidateQueries({ queryKey: VPC_QUERY_KEYS.ipSets })
      toast.success(t("ipSets.toasts.entryRemoved"))
    },
    onError: (e) => toast.error(extractError(e, t("ipSets.toasts.entryRemoveFailed"))),
  })
}

export function useDeleteNATGateway() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (id: string) => vpcService.removeNATGateway(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: VPC_QUERY_KEYS.nat })
      toast.success(t("natGateways.toasts.deleted"))
    },
    onError: (e) => toast.error(extractError(e, t("natGateways.toasts.deleteFailed"))),
  })
}

export function useInternetGateways() {
  return useQuery({
    queryKey: VPC_QUERY_KEYS.igw,
    queryFn: vpcService.fetchInternetGateways,
    refetchInterval: (query) =>
      query.state.data?.some((g) => isVpcGatewayTransitional(g.status)) ? 4000 : false,
  })
}

export function useCreateInternetGateway() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (payload: CreateInternetGatewayRequest) =>
      vpcService.createInternetGateway(payload),
    onSuccess: (igw) => {
      void queryClient.invalidateQueries({ queryKey: VPC_QUERY_KEYS.igw })
      toast.success(t("internetGateways.toasts.created", { name: igw.name }))
    },
    onError: (e) => {
      if (!handleQuotaGateError(e)) toast.error(t("internetGateways.toasts.createFailed"))
    },
  })
}

export function useDeleteInternetGateway() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (id: string) => vpcService.removeInternetGateway(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: VPC_QUERY_KEYS.igw })
      toast.success(t("internetGateways.toasts.deleted"))
    },
    onError: (e) => toast.error(extractError(e, t("internetGateways.toasts.deleteFailed"))),
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
    refetchInterval: (query) =>
      query.state.data?.some((c) => isVpcGatewayTransitional(c.status)) ? 4000 : false,
  })
}

export function useDeleteVPNConnection() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (id: string) => vpcService.removeVPNConnection(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: VPC_QUERY_KEYS.vpn })
      toast.success(t("vpn.toasts.deleted"))
    },
    onError: (e) => toast.error(extractError(e, t("vpn.toasts.deleteFailed"))),
  })
}

/* ── VPC peering ────────────────────────────────────────────────────────── */

export function usePeerings() {
  return useQuery({
    queryKey: VPC_QUERY_KEYS.peerings,
    queryFn: vpcService.fetchPeerings,
    // An accepted peering reconciles both VPCs on the fabric, so the row keeps
    // moving after the click; poll while anything is mid-transition.
    refetchInterval: (query) =>
      query.state.data?.some((p) => p.status === "deleting") ? 4000 : false,
  })
}

export function useCreatePeering() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (payload: CreateVpcPeeringRequest) => vpcService.createPeering(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: VPC_QUERY_KEYS.peerings })
      toast.success(t("peerings.toasts.requested"))
    },
    // The backend refuses overlapping CIDRs, self-peering and duplicates with a
    // specific message; surfacing it beats a generic failure, because every one
    // of them tells the user exactly what to change.
    onError: (e) => toast.error(extractError(e, t("peerings.toasts.requestFailed"))),
  })
}

export function useAcceptPeering() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (id: string) => vpcService.acceptPeering(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: VPC_QUERY_KEYS.peerings })
      toast.success(t("peerings.toasts.accepted"))
    },
    onError: (e) => toast.error(extractError(e, t("peerings.toasts.acceptFailed"))),
  })
}

export function useRejectPeering() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (id: string) => vpcService.rejectPeering(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: VPC_QUERY_KEYS.peerings })
      toast.success(t("peerings.toasts.rejected"))
    },
    onError: (e) => toast.error(extractError(e, t("peerings.toasts.rejectFailed"))),
  })
}

export function useDeletePeering() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (id: string) => vpcService.removePeering(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: VPC_QUERY_KEYS.peerings })
      toast.success(t("peerings.toasts.deleted"))
    },
    onError: (e) => toast.error(extractError(e, t("peerings.toasts.deleteFailed"))),
  })
}

/* ── Security group scoping ─────────────────────────────────────────────── */

export function useSGScoping(vpcId: string) {
  return useQuery({
    queryKey: VPC_QUERY_KEYS.sgScoping(vpcId),
    queryFn: () => vpcService.fetchSGScoping(vpcId),
    enabled: Boolean(vpcId),
  })
}

export function useSetSGScoping(vpcId: string) {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: ({ enabled, acknowledge }: { enabled: boolean; acknowledge: boolean }) =>
      vpcService.setSGScoping(vpcId, enabled, acknowledge),
    onSuccess: (state) => {
      void queryClient.invalidateQueries({ queryKey: VPC_QUERY_KEYS.sgScoping(vpcId) })
      toast.success(state.enabled ? t("sgScoping.toasts.enabled") : t("sgScoping.toasts.disabled"))
    },
    // The backend refuses an unacknowledged enable with a message naming the
    // reason; showing it verbatim is what tells the user to read the report.
    onError: (e) => toast.error(extractError(e, t("sgScoping.toasts.failed"))),
  })
}

/* ── Reachability ───────────────────────────────────────────────────────── */

/**
 * A mutation rather than a query: this is a question the user asks on demand,
 * and re-running it should be an explicit act. Silently refetching would give a
 * different answer from the one on screen the moment someone edits a rule.
 */
export function useAnalyzeReachability() {
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (q: ReachabilityQuery) => vpcService.analyzeReachability(q),
    onError: (e) => toast.error(extractError(e, t("reachability.toasts.failed"))),
  })
}
