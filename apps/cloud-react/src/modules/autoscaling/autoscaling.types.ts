// Shapes mirror cloud-be-go: apps/compute/autoscaling entity + request DTOs.

// Backend status values (vm_auto_scaling_groups.status).
export type ASGStatus = "active" | "suspended" | "deleting"

// Scaling policies live in a separate backend entity (vm_scaling_policies) with
// no wired endpoint, so this is FE-only static metadata for the create form.
export type ScalingPolicy = "cpu-based" | "schedule-based" | "manual"

export interface AutoScalingGroup {
    id: string
    tenant_serial: number
    created_at: string
    updated_at: string
    name: string
    min_size: number
    max_size: number
    desired_capacity: number
    region: string
    status: ASGStatus
    user_id: string
    account_id: string
    resource_group_id: string
    launch_template_id: string
    health_check_type: string
    cooldown_seconds: number
    target_group_id: string | null
    tags: string
    description?: string
    health_check_grace_period: number
    termination_policy: string
    capacity_rebalance: boolean

    // FE-only fields the backend entity does not expose. Kept optional so the
    // detail UI compiles; rendering falls back when absent.
    machine_type?: string
    scaling_policy?: ScalingPolicy
}

// Mirrors dto.CreateASGRequest. launch_template_id is a required uuid4; the
// backend resolves machine type / image from the launch template, so the form's
// machine_type and scaling_policy are not part of the create payload.
export interface CreateASGRequest {
    name: string
    min_size: number
    max_size: number
    desired_capacity: number
    launch_template_id: string
    region: string
    description?: string
    health_check_grace_period?: number
    termination_policy?: string
    capacity_rebalance?: boolean
}

// Mirrors dto.UpdateASGRequest (all fields optional / partial update).
export interface UpdateASGRequest {
    min_size?: number
    max_size?: number
    desired_capacity?: number
    description?: string
    health_check_grace_period?: number
    termination_policy?: string
    capacity_rebalance?: boolean
}
