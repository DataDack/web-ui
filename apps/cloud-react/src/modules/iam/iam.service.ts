import { iamApi } from "./iam.api"
import type {
  CreateAPIKeyRequest,
  CreateGroupRequest,
  CreateInvitationRequest,
  CreatePolicyRequest,
  CreateRoleRequest,
  CreateUserRequest,
  SimulateRequest,
} from "./iam.types"

export const iamService = {
  fetchUsers: () => iamApi.listUsers(),
  fetchUser: (id: string) => iamApi.getUser(id),
  createUser: (payload: CreateUserRequest) => iamApi.createUser(payload),
  removeUser: (id: string) => iamApi.deleteUser(id),

  fetchRoles: () => iamApi.listRoles(),
  fetchRole: (id: string) => iamApi.getRole(id),
  createRole: (payload: CreateRoleRequest) => iamApi.createRole(payload),
  removeRole: (id: string) => iamApi.deleteRole(id),

  fetchUserRoles: (userId: string) => iamApi.listUserRoles(userId),
  assignRole: (userId: string, roleId: string) => iamApi.assignRole(userId, roleId),
  revokeRole: (userId: string, roleId: string) => iamApi.revokeRole(userId, roleId),

  fetchPolicies: () => iamApi.listPolicies(),
  fetchPolicy: (id: string) => iamApi.getPolicy(id),
  createPolicy: (payload: CreatePolicyRequest) => iamApi.createPolicy(payload),
  removePolicy: (id: string) => iamApi.deletePolicy(id),

  /* principal ↔ policy (role | group | user) */
  fetchPrincipalPolicies: (principalType: string, principalId: string) =>
    iamApi.listPrincipalPolicies(principalType, principalId),
  attachPolicy: (
    principalType: string,
    principalId: string,
    policyId: string,
    accountId?: string,
  ) => iamApi.attachPolicy(principalType, principalId, policyId, accountId),
  detachPolicy: (principalType: string, principalId: string, policyId: string) =>
    iamApi.detachPolicy(principalType, principalId, policyId),

  /* reverse lookups */
  fetchRoleMembers: (roleId: string) => iamApi.listRoleMembers(roleId),
  fetchUserGroups: (userId: string) => iamApi.listUserGroups(userId),
  fetchPolicyPrincipals: (policyId: string) => iamApi.listPolicyPrincipals(policyId),

  /* groups */
  fetchGroups: () => iamApi.listGroups(),
  fetchGroup: (id: string) => iamApi.getGroup(id),
  createGroup: (payload: CreateGroupRequest) => iamApi.createGroup(payload),
  removeGroup: (id: string) => iamApi.deleteGroup(id),
  fetchGroupMembers: (groupId: string) => iamApi.listGroupMembers(groupId),
  addGroupMember: (groupId: string, userId: string) => iamApi.addGroupMember(groupId, userId),
  removeGroupMember: (groupId: string, userId: string) => iamApi.removeGroupMember(groupId, userId),

  fetchAPIKeys: () => iamApi.listAPIKeys(),
  createAPIKey: (payload: CreateAPIKeyRequest) => iamApi.createAPIKey(payload),
  removeAPIKey: (id: string) => iamApi.deleteAPIKey(id),

  fetchPermissions: () => iamApi.listPermissions(),
  simulate: (payload: SimulateRequest) => iamApi.simulate(payload),

  fetchCurrentAccountMembers: () => iamApi.listCurrentAccountMembers(),
  fetchAuditLogs: () => iamApi.listAuditLogs(),

  /* invitations */
  fetchInvitations: (status?: string) => iamApi.listInvitations(status),
  createInvitation: (payload: CreateInvitationRequest) => iamApi.createInvitation(payload),
  resendInvitation: (id: string) => iamApi.resendInvitation(id),
  revokeInvitation: (id: string) => iamApi.revokeInvitation(id),
  validateInvitation: (token: string) => iamApi.validateInvitation(token),
  acceptInvitation: (token: string, name?: string) => iamApi.acceptInvitation(token, name),
}
