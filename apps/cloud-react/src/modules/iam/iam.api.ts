import type { AuthTokenResponse } from "@/modules/auth/auth.types"
import { apiDelete, apiGet, apiPost, LIST_QUERY } from "@/services/api/client"

import type {
    AccountMember,
    APIKey,
    AuditLog,
    CreateAPIKeyRequest,
    CreatedAPIKey,
    CreatedKeyResponse,
    CreateGroupRequest,
    CreateInvitationRequest,
    CreatePolicyRequest,
    CreateRoleRequest,
    CreateUserRequest,
    GroupMember,
    IAMGroup,
    IAMPolicy,
    IAMRole,
    IAMUser,
    Invitation,
    InvitationPreview,
    InvitationResult,
    Permission,
    PolicyAttachment,
    SimulateRequest,
    SimulateResult,
    UserRoleBinding,
} from "./iam.types"

// Live cloud-be-go endpoints (mounted under /api/v1 by the axios baseURL):
//   users          → /auth/users
//   roles          → /auth/roles
//   policies       → /auth/policies
//   permissions    → /auth/permissions
//   keys           → /auth/keys
//   iam (bindings) → /auth/iam
export const iamApi = {
    /* users */
    listUsers: () => apiGet<IAMUser[]>(`/auth/users${LIST_QUERY}`),
    getUser: (id: string) => apiGet<IAMUser>(`/auth/users/${id}`),
    createUser: (payload: CreateUserRequest) => apiPost<IAMUser>("/auth/users", payload),
    deleteUser: (id: string) => apiDelete(`/auth/users/${id}`),

    /* roles */
    listRoles: () => apiGet<IAMRole[]>(`/auth/roles${LIST_QUERY}`),
    getRole: (id: string) => apiGet<IAMRole>(`/auth/roles/${id}`),
    createRole: (payload: CreateRoleRequest) => apiPost<IAMRole>("/auth/roles", payload),
    deleteRole: (id: string) => apiDelete(`/auth/roles/${id}`),

    /* user ↔ role */
    listUserRoles: (userId: string) => apiGet<UserRoleBinding[]>(`/auth/iam/users/${userId}/roles`),
    assignRole: (userId: string, roleId: string) =>
        apiPost<null>("/auth/iam/roles/assign", {
            user_id: userId,
            role_id: roleId,
        }),
    revokeRole: (userId: string, roleId: string) =>
        apiDelete(`/auth/iam/users/${userId}/roles/${roleId}`),

    /* policies */
    listPolicies: () => apiGet<IAMPolicy[]>(`/auth/policies${LIST_QUERY}`),
    getPolicy: (id: string) => apiGet<IAMPolicy>(`/auth/policies/${id}`),
    createPolicy: (payload: CreatePolicyRequest) => apiPost<IAMPolicy>("/auth/policies", payload),
    deletePolicy: (id: string) => apiDelete(`/auth/policies/${id}`),

    /* principal ↔ policy (unified: principal_type = user | role | group) */
    listPrincipalPolicies: (principalType: string, principalId: string) =>
        apiGet<PolicyAttachment[]>(`/auth/iam/${principalType}/${principalId}/policies`),
    attachPolicy: (
        principalType: string,
        principalId: string,
        policyId: string,
        accountId?: string
    ) =>
        apiPost<null>("/auth/iam/policies/attach", {
            principal_type: principalType,
            principal_id: principalId,
            policy_id: policyId,
            ...(accountId ? { account_id: accountId } : {}),
        }),
    detachPolicy: (principalType: string, principalId: string, policyId: string) =>
        apiDelete(`/auth/iam/${principalType}/${principalId}/policies/${policyId}`),

    /* reverse lookups (replace the client-side N+1 fan-outs) */
    listRoleMembers: (roleId: string) =>
        apiGet<UserRoleBinding[]>(`/auth/iam/roles/${roleId}/members`),
    listUserGroups: (userId: string) => apiGet<IAMGroup[]>(`/auth/iam/users/${userId}/groups`),
    listPolicyPrincipals: (policyId: string) =>
        apiGet<PolicyAttachment[]>(`/auth/iam/policies/${policyId}/principals`),

    /* groups */
    listGroups: () => apiGet<IAMGroup[]>(`/auth/iam/groups${LIST_QUERY}`),
    getGroup: (id: string) => apiGet<IAMGroup>(`/auth/iam/groups/${id}`),
    createGroup: (payload: CreateGroupRequest) => apiPost<IAMGroup>("/auth/iam/groups", payload),
    deleteGroup: (id: string) => apiDelete(`/auth/iam/groups/${id}`),
    listGroupMembers: (groupId: string) =>
        apiGet<GroupMember[]>(`/auth/iam/groups/${groupId}/members`),
    addGroupMember: (groupId: string, userId: string) =>
        apiPost<null>(`/auth/iam/groups/${groupId}/members`, { user_id: userId }),
    removeGroupMember: (groupId: string, userId: string) =>
        apiDelete(`/auth/iam/groups/${groupId}/members/${userId}`),

    /* api keys */
    listAPIKeys: () => apiGet<APIKey[]>(`/auth/keys${LIST_QUERY}`),
    createAPIKey: async (payload: CreateAPIKeyRequest): Promise<CreatedAPIKey> => {
        // Backend reveals the raw key once, under `key`; remap to the UI shape.
        const res = await apiPost<CreatedKeyResponse>("/auth/keys", payload)
        return {
            id: res.id,
            name: res.name,
            key_prefix: res.key_prefix,
            expires_at: res.expires_at ? new Date(res.expires_at * 1000).toISOString() : null,
            is_active: true,
            secret: res.key,
        }
    },
    deleteAPIKey: (id: string) => apiDelete(`/auth/keys/${id}`),

    /* permissions (reference data) */
    listPermissions: () => apiGet<Permission[]>(`/auth/permissions${LIST_QUERY}`),

    /* members of the caller's default account (for the account-role column) */
    listCurrentAccountMembers: () => apiGet<AccountMember[]>("/org/accounts/current/members"),

    /* authz engine — dry-run a decision (admin) */
    simulate: (payload: SimulateRequest) =>
        apiPost<SimulateResult>("/auth/authz/simulate", payload),

    /* audit trail (admin) */
    listAuditLogs: () => apiGet<AuditLog[]>(`/auth/iam/audit-logs${LIST_QUERY}`),

    /* invitations (Google-style email invite membership) */
    listInvitations: (status?: string) => {
        const statusQuery = status ? `&status=${status}` : ""
        return apiGet<Invitation[]>(`/auth/invitations${LIST_QUERY}${statusQuery}`)
    },
    createInvitation: (payload: CreateInvitationRequest) =>
        apiPost<InvitationResult>("/auth/invitations", {
            ...payload,
            account_id: payload.account_id != null ? payload.account_id : undefined,
            group_ids: payload.group_ids?.map(String),
            role_id: payload.role_id != null ? payload.role_id : undefined,
            policy_ids: payload.policy_ids?.map(String),
        }),
    resendInvitation: (id: string) =>
        apiPost<InvitationResult>(`/auth/invitations/${id}/resend`, {}),
    revokeInvitation: (id: string) => apiDelete(`/auth/invitations/${id}`),
    /* public — the token is the credential */
    validateInvitation: (token: string) =>
        apiGet<InvitationPreview>(`/auth/invitations/validate?token=${encodeURIComponent(token)}`),
    acceptInvitation: (token: string, name?: string) =>
        apiPost<AuthTokenResponse>("/auth/invitations/accept", {
            token,
            ...(name ? { name } : {}),
        }),
}
