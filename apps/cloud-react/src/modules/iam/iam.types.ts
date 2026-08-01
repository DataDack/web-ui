/* eslint-disable @typescript-eslint/naming-convention -- IAM* names mirror backend auth entities */
// Shapes mirror cloud-be-go: apps/auth entities + request DTOs.

export interface IAMUser {
    id: string
    created_at: string
    updated_at: string
    name: string
    email: string
    role: string
    is_super_admin: boolean
    is_active: boolean
    is_root: boolean
}

export interface IAMRole {
    id: string
    created_at: string
    updated_at: string
    name: string
    description: string
    is_system: boolean
}

export interface IAMPolicy {
    id: string
    created_at: string
    updated_at: string
    name: string
    description: string
    /** JSON policy document (stringified) */
    document: string
    is_managed: boolean
}

export interface UserRoleBinding {
    id: string
    user_id: string
    role_id: string
}

/** A row from policy_attachments (the unified principal↔policy join). */
export interface PolicyAttachment {
    id: string
    policy_id: string
    principal_type: string
    principal_id: string
}

/** @deprecated use PolicyAttachment — kept as an alias for existing callers. */
export type RolePolicyBinding = PolicyAttachment

export interface IAMGroup {
    id: string
    created_at: string
    updated_at: string
    name: string
    description: string
    path: string
    account_id: string | null
}

export interface GroupMember {
    id: string
    group_id: string
    user_id: string
}

/** A user's membership in an account, carrying the account-level role. */
export interface AccountMember {
    id: string
    account_id: string
    user_id: number
    member_role: string
}

export interface Account {
    id: string
    name: string
    account_number: string
    organization_id: string
    status: string
    is_default: boolean
}

export interface CreateGroupRequest {
    name: string
    description?: string
    path?: string
}

export interface Invitation {
    id: string
    created_at: string
    updated_at: string
    email: string
    account_id: string | null
    member_role: string
    role_id: number | null
    status: string
    invited_by: number
    message: string
    expires_at: string
    accepted_at: string | null
    accepted_user_id: number | null
}

/** Non-leaky public preview returned by the validate endpoint. */
export interface InvitationPreview {
    email: string
    member_role: string
    message: string
    status: string
    expires_at: string
}

export interface CreateInvitationRequest {
    email: string
    account_id?: string
    member_role?: string
    group_ids?: string[]
    role_id?: string
    policy_ids?: string[]
    message?: string
    expires_in_hours?: number
}

/** Returned on create/resend — accept_url is shown when email_sent is false. */
export interface InvitationResult {
    invitation: Invitation
    email_sent: boolean
    accept_url: string
}

export interface APIKey {
    id: string
    created_at: string
    updated_at: string
    name: string
    key_prefix: string
    is_active: boolean
    /** ISO-8601 timestamp; null = never expires */
    expires_at: string | null
}

export interface Permission {
    id: string
    name: string
    /** Service namespace, e.g. "vm" (backend-only; may be absent) */
    service?: string
    resource: string
    action: string
    description: string
}

export interface SimulateRequest {
    user_id: string
    action: string
    resource?: string
    account_id?: string
}

export interface SimulateResult {
    allow: boolean
    decision: string
    deciding_sid: string
    statement_count: number
}

export interface AuditLog {
    id: string
    created_at: string
    account_id: string | null
    actor_id: number | null
    action: string
    service: string
    resource_urn: string
    ip_address: string
    request_id: string
    /** stringified JSON metadata */
    metadata: string
}

/* ── Request DTOs ──────────────────────────────────────────────────────── */

export interface CreateUserRequest {
    name: string
    email: string
    password: string
    role: string
}

export interface CreateRoleRequest {
    name: string
    description: string
}

export interface CreatePolicyRequest {
    name: string
    description: string
    document: string
}

export interface CreateAPIKeyRequest {
    name: string
    /** Epoch seconds; null = never expires */
    expires_at: number | null
}

/** Raw backend response from POST /auth/keys — `key` is the one-time secret. */
export interface CreatedKeyResponse {
    id: string
    name: string
    key_prefix: string
    key: string
    /** Epoch seconds; null = never expires */
    expires_at: number | null
}

/**
 * Returned once on creation — the only time the secret is visible.
 * The backend's create response (CreatedKeyResponse) does not include the
 * created_at/updated_at timestamps, so they are omitted from the live APIKey shape.
 */
export interface CreatedAPIKey extends Omit<APIKey, "created_at" | "updated_at"> {
    secret: string
}
