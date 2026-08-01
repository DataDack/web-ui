// Shapes mirror cloud-be-go: apps/compute/loadbalancer TargetGroup + Target.

/**
 * A target group is a set of backend instances with a routing algorithm and a
 * health check.
 *
 * It is NOT owned by a load balancer — it carries only a vpc_id. Several load
 * balancers' listeners can point at the same group, and a group outlives the
 * load balancers referencing it. That is why it gets its own place in the
 * console rather than living inside a load balancer's detail page.
 */
export type TargetGroupProtocol = "HTTP" | "TCP" | "UDP"
export type TargetGroupAlgorithm = "round_robin" | "least_connections" | "ip_hash"

export interface TargetGroup {
    id: string
    tenant_serial: number
    created_at: string
    updated_at: string
    account_id: string
    vpc_id: string
    name: string
    protocol: TargetGroupProtocol
    port: number
    algorithm: TargetGroupAlgorithm
    health_check_path: string
    health_check_interval_s: number
    healthy_threshold: number
    unhealthy_threshold: number
}

/**
 * Health as HAProxy reports it, written back by the backend's health poller
 * every 30s.
 *
 *   initial   — registered, not yet checked
 *   healthy   — passing its health check
 *   unhealthy — failing; HAProxy has ejected it from rotation
 *   draining  — finishing in-flight connections, taking no new ones
 *   unused    — in the group but not serving (no listener routes to it)
 */
export type TargetHealth = "initial" | "healthy" | "unhealthy" | "draining" | "unused"

export interface Target {
    id: string
    created_at: string
    target_group_id: string
    instance_id: string
    port: number
    health_status: TargetHealth
}

export interface CreateTargetGroupRequest {
    name: string
    vpc_id: string
    protocol?: TargetGroupProtocol
    port: number
    algorithm?: TargetGroupAlgorithm
    health_check_path?: string
    health_check_interval_s?: number
    healthy_threshold?: number
    unhealthy_threshold?: number
}

export interface UpdateTargetGroupRequest {
    name?: string
    algorithm?: TargetGroupAlgorithm
    health_check_path?: string
    health_check_interval_s?: number
    healthy_threshold?: number
    unhealthy_threshold?: number
}

/** Port defaults to the target group's own port when omitted. */
export interface RegisterTargetRequest {
    instance_id: string
    port?: number
}
