import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { IAM_QUERY_KEYS } from "./iam.constants"
import { iamService } from "./iam.service"
import type {
    CreateAPIKeyRequest,
    CreateGroupRequest,
    CreateInvitationRequest,
    CreatePolicyRequest,
    CreateRoleRequest,
    CreateUserRequest,
    SimulateRequest,
} from "./iam.types"

/* ── Users ─────────────────────────────────────────────────────────────── */

export function useIAMUsers() {
    return useQuery({ queryKey: IAM_QUERY_KEYS.users, queryFn: iamService.fetchUsers })
}

export function useIAMUser(id: string) {
    return useQuery({
        queryKey: IAM_QUERY_KEYS.user(id),
        queryFn: () => iamService.fetchUser(id),
        enabled: !!id,
    })
}

export function useCreateIAMUser() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: (payload: CreateUserRequest) => iamService.createUser(payload),
        onSuccess: (user) => {
            void queryClient.invalidateQueries({ queryKey: IAM_QUERY_KEYS.users })
            toast.success(t("iam.toasts.userCreated", { name: user.name }))
        },
        onError: () => toast.error(t("iam.toasts.userCreateFailed")),
    })
}

export function useDeleteIAMUser() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: (id: string) => iamService.removeUser(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: IAM_QUERY_KEYS.users })
            toast.success(t("iam.toasts.userDeleted"))
        },
        onError: () => toast.error(t("iam.toasts.userDeleteFailed")),
    })
}

/* ── Roles ─────────────────────────────────────────────────────────────── */

export function useIAMRoles() {
    return useQuery({ queryKey: IAM_QUERY_KEYS.roles, queryFn: iamService.fetchRoles })
}

export function useIAMRole(id: string) {
    return useQuery({
        queryKey: IAM_QUERY_KEYS.role(id),
        queryFn: () => iamService.fetchRole(id),
        enabled: !!id,
    })
}

export function useCreateIAMRole() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: (payload: CreateRoleRequest) => iamService.createRole(payload),
        onSuccess: (role) => {
            void queryClient.invalidateQueries({ queryKey: IAM_QUERY_KEYS.roles })
            toast.success(t("iam.toasts.roleCreated", { name: role.name }))
        },
        onError: () => toast.error(t("iam.toasts.roleCreateFailed")),
    })
}

export function useDeleteIAMRole() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: (id: string) => iamService.removeRole(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: IAM_QUERY_KEYS.roles })
            toast.success(t("iam.toasts.roleDeleted"))
        },
        onError: () => toast.error(t("iam.toasts.roleDeleteFailed")),
    })
}

/* ── User ↔ role bindings ──────────────────────────────────────────────── */

export function useUserRoles(userId: string) {
    return useQuery({
        queryKey: IAM_QUERY_KEYS.userRoles(userId),
        queryFn: () => iamService.fetchUserRoles(userId),
        enabled: !!userId,
    })
}

/** Members of a role, via the backend reverse-lookup endpoint. */
export function useRoleMembers(roleId: string) {
    return useQuery({
        queryKey: IAM_QUERY_KEYS.roleMembers(roleId),
        queryFn: () => iamService.fetchRoleMembers(roleId),
        enabled: !!roleId,
    })
}

export function useAssignRole() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
            iamService.assignRole(userId, roleId),
        onSuccess: (_data, { userId }) => {
            void queryClient.invalidateQueries({ queryKey: IAM_QUERY_KEYS.userRoles(userId) })
            toast.success(t("iam.toasts.roleAssigned"))
        },
        onError: () => toast.error(t("iam.toasts.roleAssignFailed")),
    })
}

export function useRevokeRole() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
            iamService.revokeRole(userId, roleId),
        onSuccess: (_void, { userId }) => {
            void queryClient.invalidateQueries({ queryKey: IAM_QUERY_KEYS.userRoles(userId) })
            toast.success(t("iam.toasts.roleRevoked"))
        },
        onError: () => toast.error(t("iam.toasts.roleRevokeFailed")),
    })
}

/** Groups a user belongs to (reverse lookup). */
export function useUserGroups(userId: string) {
    return useQuery({
        queryKey: IAM_QUERY_KEYS.userGroups(userId),
        queryFn: () => iamService.fetchUserGroups(userId),
        enabled: !!userId,
    })
}

/** Policies attached directly to a user. */
export function useUserPolicies(userId: string) {
    return useQuery({
        queryKey: IAM_QUERY_KEYS.userPolicies(userId),
        queryFn: () => iamService.fetchPrincipalPolicies("user", userId),
        enabled: !!userId,
    })
}

export function useAttachUserPolicy() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: ({ userId, policyId }: { userId: string; policyId: string }) =>
            iamService.attachPolicy("user", userId, policyId),
        onSuccess: (_data, { userId }) => {
            void queryClient.invalidateQueries({ queryKey: IAM_QUERY_KEYS.userPolicies(userId) })
            toast.success(t("iam.toasts.policyAttached"))
        },
        onError: () => toast.error(t("iam.toasts.policyAttachFailed")),
    })
}

export function useDetachUserPolicy() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: ({ userId, policyId }: { userId: string; policyId: string }) =>
            iamService.detachPolicy("user", userId, policyId),
        onSuccess: (_void, { userId }) => {
            void queryClient.invalidateQueries({ queryKey: IAM_QUERY_KEYS.userPolicies(userId) })
            toast.success(t("iam.toasts.policyDetached"))
        },
        onError: () => toast.error(t("iam.toasts.policyDetachFailed")),
    })
}

/* ── Policies ──────────────────────────────────────────────────────────── */

export function useIAMPolicies() {
    return useQuery({ queryKey: IAM_QUERY_KEYS.policies, queryFn: iamService.fetchPolicies })
}

export function useIAMPolicy(id: string) {
    return useQuery({
        queryKey: IAM_QUERY_KEYS.policy(id),
        queryFn: () => iamService.fetchPolicy(id),
        enabled: !!id,
    })
}

export function useCreateIAMPolicy() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: (payload: CreatePolicyRequest) => iamService.createPolicy(payload),
        onSuccess: (policy) => {
            void queryClient.invalidateQueries({ queryKey: IAM_QUERY_KEYS.policies })
            toast.success(t("iam.toasts.policyCreated", { name: policy.name }))
        },
        onError: () => toast.error(t("iam.toasts.policyCreateFailed")),
    })
}

export function useDeleteIAMPolicy() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: (id: string) => iamService.removePolicy(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: IAM_QUERY_KEYS.policies })
            toast.success(t("iam.toasts.policyDeleted"))
        },
        onError: () => toast.error(t("iam.toasts.policyDeleteFailed")),
    })
}

/* ── Role ↔ policy bindings ────────────────────────────────────────────── */

export function useRolePolicies(roleId: string) {
    return useQuery({
        queryKey: IAM_QUERY_KEYS.rolePolicies(roleId),
        queryFn: () => iamService.fetchPrincipalPolicies("role", roleId),
        enabled: !!roleId,
    })
}

export function useAttachPolicy() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: ({ roleId, policyId }: { roleId: string; policyId: string }) =>
            iamService.attachPolicy("role", roleId, policyId),
        onSuccess: (_data, { roleId }) => {
            void queryClient.invalidateQueries({ queryKey: IAM_QUERY_KEYS.rolePolicies(roleId) })
            toast.success(t("iam.toasts.policyAttached"))
        },
        onError: () => toast.error(t("iam.toasts.policyAttachFailed")),
    })
}

export function useDetachPolicy() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: ({ roleId, policyId }: { roleId: string; policyId: string }) =>
            iamService.detachPolicy("role", roleId, policyId),
        onSuccess: (_void, { roleId }) => {
            void queryClient.invalidateQueries({ queryKey: IAM_QUERY_KEYS.rolePolicies(roleId) })
            toast.success(t("iam.toasts.policyDetached"))
        },
        onError: () => toast.error(t("iam.toasts.policyDetachFailed")),
    })
}

/* ── Groups ────────────────────────────────────────────────────────────── */

export function useIAMGroups() {
    return useQuery({ queryKey: IAM_QUERY_KEYS.groups, queryFn: iamService.fetchGroups })
}

export function useIAMGroup(id: string) {
    return useQuery({
        queryKey: IAM_QUERY_KEYS.group(id),
        queryFn: () => iamService.fetchGroup(id),
        enabled: !!id,
    })
}

export function useCreateIAMGroup() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: (payload: CreateGroupRequest) => iamService.createGroup(payload),
        onSuccess: (group) => {
            void queryClient.invalidateQueries({ queryKey: IAM_QUERY_KEYS.groups })
            toast.success(t("iam.toasts.groupCreated", { name: group.name }))
        },
        onError: () => toast.error(t("iam.toasts.groupCreateFailed")),
    })
}

export function useDeleteIAMGroup() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: (id: string) => iamService.removeGroup(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: IAM_QUERY_KEYS.groups })
            toast.success(t("iam.toasts.groupDeleted"))
        },
        onError: () => toast.error(t("iam.toasts.groupDeleteFailed")),
    })
}

export function useGroupMembers(groupId: string) {
    return useQuery({
        queryKey: IAM_QUERY_KEYS.groupMembers(groupId),
        queryFn: () => iamService.fetchGroupMembers(groupId),
        enabled: !!groupId,
    })
}

export function useAddGroupMember() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
            iamService.addGroupMember(groupId, userId),
        onSuccess: (_data, { groupId }) => {
            void queryClient.invalidateQueries({ queryKey: IAM_QUERY_KEYS.groupMembers(groupId) })
            toast.success(t("iam.toasts.memberAdded"))
        },
        onError: () => toast.error(t("iam.toasts.memberAddFailed")),
    })
}

export function useRemoveGroupMember() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
            iamService.removeGroupMember(groupId, userId),
        onSuccess: (_void, { groupId }) => {
            void queryClient.invalidateQueries({ queryKey: IAM_QUERY_KEYS.groupMembers(groupId) })
            toast.success(t("iam.toasts.memberRemoved"))
        },
        onError: () => toast.error(t("iam.toasts.memberRemoveFailed")),
    })
}

export function useGroupPolicies(groupId: string) {
    return useQuery({
        queryKey: IAM_QUERY_KEYS.groupPolicies(groupId),
        queryFn: () => iamService.fetchPrincipalPolicies("group", groupId),
        enabled: !!groupId,
    })
}

export function useAttachGroupPolicy() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: ({ groupId, policyId }: { groupId: string; policyId: string }) =>
            iamService.attachPolicy("group", groupId, policyId),
        onSuccess: (_data, { groupId }) => {
            void queryClient.invalidateQueries({ queryKey: IAM_QUERY_KEYS.groupPolicies(groupId) })
            toast.success(t("iam.toasts.policyAttached"))
        },
        onError: () => toast.error(t("iam.toasts.policyAttachFailed")),
    })
}

export function useDetachGroupPolicy() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: ({ groupId, policyId }: { groupId: string; policyId: string }) =>
            iamService.detachPolicy("group", groupId, policyId),
        onSuccess: (_void, { groupId }) => {
            void queryClient.invalidateQueries({ queryKey: IAM_QUERY_KEYS.groupPolicies(groupId) })
            toast.success(t("iam.toasts.policyDetached"))
        },
        onError: () => toast.error(t("iam.toasts.policyDetachFailed")),
    })
}

/* ── Permissions & simulator ───────────────────────────────────────────── */

export function usePermissions() {
    return useQuery({ queryKey: IAM_QUERY_KEYS.permissions, queryFn: iamService.fetchPermissions })
}

export function useSimulate() {
    return useMutation({ mutationFn: (payload: SimulateRequest) => iamService.simulate(payload) })
}

export function useAuditLogs() {
    return useQuery({ queryKey: IAM_QUERY_KEYS.auditLogs, queryFn: iamService.fetchAuditLogs })
}

/** Members (with member_role) of the caller's default account. */
export function useCurrentAccountMembers() {
    return useQuery({
        queryKey: IAM_QUERY_KEYS.accountMembers,
        queryFn: iamService.fetchCurrentAccountMembers,
    })
}

/* ── Invitations ───────────────────────────────────────────────────────── */

export function useInvitations(status?: string) {
    return useQuery({
        queryKey: IAM_QUERY_KEYS.invitations(status),
        queryFn: () => iamService.fetchInvitations(status),
    })
}

export function useCreateInvitation() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: (payload: CreateInvitationRequest) => iamService.createInvitation(payload),
        onSuccess: (result) => {
            void queryClient.invalidateQueries({ queryKey: ["iam", "invitations"] })
            if (result.email_sent) {
                toast.success(t("iam.toasts.inviteSent", { email: result.invitation.email }))
            } else {
                toast.warning(t("iam.toasts.inviteNoEmail"))
            }
        },
        onError: () => toast.error(t("iam.toasts.inviteCreateFailed")),
    })
}

export function useResendInvitation() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: (id: string) => iamService.resendInvitation(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["iam", "invitations"] })
            toast.success(t("iam.toasts.inviteResent"))
        },
        onError: () => toast.error(t("iam.toasts.inviteResendFailed")),
    })
}

export function useRevokeInvitation() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: (id: string) => iamService.revokeInvitation(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["iam", "invitations"] })
            toast.success(t("iam.toasts.inviteRevoked"))
        },
        onError: () => toast.error(t("iam.toasts.inviteRevokeFailed")),
    })
}

/* ── API keys ──────────────────────────────────────────────────────────── */

export function useAPIKeys() {
    return useQuery({ queryKey: IAM_QUERY_KEYS.apiKeys, queryFn: iamService.fetchAPIKeys })
}

export function useCreateAPIKey() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: (payload: CreateAPIKeyRequest) => iamService.createAPIKey(payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: IAM_QUERY_KEYS.apiKeys })
            toast.success(t("iam.toasts.apiKeyCreated"))
        },
        onError: () => toast.error(t("iam.toasts.apiKeyCreateFailed")),
    })
}

export function useDeleteAPIKey() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: (id: string) => iamService.removeAPIKey(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: IAM_QUERY_KEYS.apiKeys })
            toast.success(t("iam.toasts.apiKeyDeleted"))
        },
        onError: () => toast.error(t("iam.toasts.apiKeyDeleteFailed")),
    })
}
