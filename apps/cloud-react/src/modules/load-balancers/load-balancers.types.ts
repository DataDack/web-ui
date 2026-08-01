// Shapes mirror cloud-be-go: apps/compute/loadbalancer entity + request DTOs.

import type {
    TargetGroupAlgorithm,
    TargetGroupProtocol,
} from "@/modules/target-groups/target-groups.types"

// Backend statuses: provisioning | active | failed | deleting.
// "pending" / "error" are kept as aliases the UI may still reference.
export type LoadBalancerStatus =
    "provisioning" | "active" | "failed" | "deleting" | "pending" | "error"
export type LoadBalancerType = "application" | "network"
export type LoadBalancerScheme = "internet_facing" | "internal"

export interface LoadBalancer {
    id: string
    tenant_serial: number
    created_at: string
    updated_at: string
    account_id: string
    resource_group_id: string | null
    vpc_id: string
    name: string
    type: LoadBalancerType
    scheme: LoadBalancerScheme
    dns_name: string
    static_ip_id: string | null
    status: LoadBalancerStatus
    tags: string
    user_id: string

    // The load balancer has two NICs: public_ip is what clients connect to,
    // private_ip is how it reaches its targets over the VPC's private network.
    // Infrastructure internals (host node, container id) are deliberately not
    // exposed by the API, so they are absent here.
    public_ip: string
    // Legacy single-subnet fields, kept for back-compat. They mirror the
    // nic_index=1 row from `vm_lb_subnets` (see LBSubnet); a multi-subnet load
    // balancer additionally exposes every attachment through the subnets
    // endpoint.
    private_ip: string
    subnet_id: string | null
    config_version: number
    /** Populated only when status === "failed" — why provisioning gave up. */
    provision_error?: string
}

/**
 * A single subnet the load balancer is attached to. A load balancer can span N
 * subnets across any number of VPCs; it gets one NIC and one private IP per
 * subnet so HAProxy can reach targets on each. Mirrors backend `vm_lb_subnets`
 * rows.
 *
 * `nic_index` is 1-based, matching the container NIC ordering — eth0 is the
 * public NIC, so subnet NICs start at 1.
 */
export interface LBSubnet {
    id: string
    load_balancer_id: string
    vpc_id: string
    subnet_id: string
    private_ip: string
    nic_index: number
    created_at: string
    updated_at: string
}

/**
 * A listener is a frontend: it accepts traffic on a port and forwards it to a
 * target group. Listeners ARE owned by a load balancer.
 *
 * HTTPS/TLS is deliberately absent: the platform has no certificate store, so
 * the backend rejects those protocols with a 400.
 *
 * UDP is absent for a different reason. It used to be offered here, but the
 * hypervisor firewall opens every listener port as tcp and HAProxy in mode tcp
 * does not proxy UDP — so a UDP listener could never carry traffic. The backend
 * now rejects it too.
 */
export type ListenerProtocol = "HTTP" | "TCP"

export interface LBListener {
    id: string
    created_at: string
    load_balancer_id: string
    protocol: ListenerProtocol
    port: number
    default_target_group_id: string
    ssl_certificate_id: string
    /** Source ranges allowed to reach this port. Empty means from anywhere. */
    allowed_cidrs: string[]
}

export interface CreateListenerRequest {
    protocol: ListenerProtocol
    port: number
    default_target_group_id: string
    allowed_cidrs?: string[]
}

/**
 * Protocol and port are immutable — both are identity, for the HAProxy frontend
 * and for the firewall rule. Everything else about a listener can change in
 * place, which beats delete-and-recreate: dropping the row takes the port out of
 * the firewall and out of haproxy.cfg, so traffic stops for the round trip.
 */
export interface UpdateListenerRequest {
    default_target_group_id?: string
    /** Replaces the set wholesale. Omit to leave it alone; `[]` reopens the port. */
    allowed_cidrs?: string[]
}

/**
 * Protocols a listener may use, per load-balancer type. An application LB is
 * HAProxy in `mode http`; a network LB is `mode tcp`. Mixing them is rejected by
 * the backend, so the form only ever offers the legal set.
 */
export const PROTOCOLS_BY_LB_TYPE: Record<LoadBalancerType, ListenerProtocol[]> = {
    application: ["HTTP"],
    network: ["TCP"],
}

/**
 * A single (VPC, subnet) pair the user attaches to a load balancer at create
 * time. The load balancer lands one private IP + one NIC in each chosen subnet.
 */
export interface LBSubnetSelection {
    vpc_id: string
    subnet_id: string
}

/** How the load balancer is billed against the credit wallet. */
export type LBBillingCycle = "hourly" | "monthly"

/**
 * A target group created as part of the load balancer, with the instances that
 * go into it.
 *
 * `ref` is a caller-chosen handle scoped to this one request ("web", "api"). It
 * exists so a listener can point at a group whose UUID does not exist yet, and
 * is never persisted.
 */
export interface LBTargetGroupSpec {
    ref: string
    name: string
    /** Defaults to the load balancer's primary VPC. */
    vpc_id?: string
    protocol?: TargetGroupProtocol
    port: number
    algorithm?: TargetGroupAlgorithm
    health_check_path?: string
    health_check_interval_s?: number
    healthy_threshold?: number
    unhealthy_threshold?: number
    targets?: LBTargetSpec[]
}

/** Port defaults to the target group's own port when omitted. */
export interface LBTargetSpec {
    instance_id: string
    port?: number
}

/**
 * A listener created with the load balancer. Exactly one of
 * `default_target_group_id` (an existing group) or `target_group_ref` (one being
 * created in the same request) must be set.
 */
export interface LBListenerSpec {
    protocol: ListenerProtocol
    port: number
    default_target_group_id?: string
    target_group_ref?: string
    /** Empty or omitted means reachable from anywhere. */
    allowed_cidrs?: string[]
}

/**
 * The whole load balancer in one request.
 *
 * This is declarative: it describes the finished load balancer, not just its
 * row. Listeners and target groups travel with it because the backend bakes the
 * container's firewall from the listener set BEFORE the container boots — a
 * listener added afterwards binds inside the container but is dropped at the
 * hypervisor. Sending them together is what makes a load balancer serve traffic
 * the moment the wizard finishes.
 *
 * Scheme defaults to internet_facing; "internal" is rejected by the backend.
 */
export interface CreateLoadBalancerRequest {
    name: string
    type: LoadBalancerType
    scheme: LoadBalancerScheme
    subnets: LBSubnetSelection[]
    billing_cycle?: LBBillingCycle
    resource_group_id?: string
    tags?: Record<string, string>
    security_group_ids?: string[]
    target_groups?: LBTargetGroupSpec[]
    listeners?: LBListenerSpec[]
}

export interface UpdateLoadBalancerRequest {
    name?: string
    tags?: Record<string, string>
    resource_group_id?: string
}
