import {
    Activity,
    ArrowLeftRight,
    CreditCard,
    EthernetPort,
    FileText,
    FolderTree,
    GitBranch,
    Globe,
    HardDrive,
    Key,
    LayoutDashboard,
    Layers,
    Lock,
    Network,
    Server,
    Shield,
    ShieldCheck,
    Users,
    Wifi,
} from "lucide-react"

import type { ServiceDefinition } from "./services.types"

/* ── Maintenance windows ───────────────────────────────────────────────── */

const NAT_MAINTENANCE = {
    id: "maint-nat-001",
    title: "NAT Gateway Software Upgrade",
    message:
        "Upgrading NAT Gateway firmware across all availability zones. Existing established connections are unaffected. New connection attempts may fail during the window.",
    startTime: "2024-04-01T14:00:00Z",
    endTime: "2024-04-01T18:00:00Z",
    impact: "partial" as const,
}

const LB_MAINTENANCE = {
    id: "maint-lb-001",
    title: "Load Balancer Health Check Update",
    message:
        "Updating health check configuration for all load balancers. Brief latency spikes possible.",
    startTime: "2024-04-01T16:00:00Z",
    endTime: "2024-04-01T17:00:00Z",
    impact: "none" as const,
}

/* ── Service registry ──────────────────────────────────────────────────── */

export const SERVICE_REGISTRY: Record<string, ServiceDefinition> = {
    dashboard: {
        id: "dashboard",
        name: "Dashboard",
        path: "/",
        icon: LayoutDashboard,
        description: "Sovereign command center with real-time telemetry and zone oversight.",
        category: "management",
        status: "operational",
        subServices: [],
        tags: ["telemetry"],
    },

    vms: {
        id: "vms",
        name: "Compute Engine",
        path: "/compute/overview",
        icon: Server,
        description: "Scalable, high-performance sovereign virtual machines with local SSDs.",
        category: "compute",
        status: "degraded",
        subServices: [
            {
                id: "instances",
                name: "Instances",
                path: "/compute/instances",
                icon: Server,
                description: "Virtual machine instances — create, start, stop, delete.",
                status: "operational",
            },
            {
                id: "load-balancer",
                name: "Load Balancer",
                path: "/compute/load-balancers",
                icon: Layers,
                description: "Distribute inbound traffic across multiple instances.",
                status: "degraded",
                maintenance: LB_MAINTENANCE,
            },
            {
                id: "auto-scaling",
                name: "Auto Scaling",
                path: "/compute/autoscaling",
                icon: Activity,
                description: "Automatically scale instance count based on demand.",
                status: "operational",
            },
            {
                id: "ssh-keys",
                name: "SSH Keys",
                path: "/compute/ssh-keys",
                icon: Key,
                description: "Manage SSH key pairs for secure instance access.",
                status: "operational",
            },
            {
                id: "disks",
                name: "Disk Storage",
                path: "/compute/disks",
                icon: HardDrive,
                description: "Persistent block storage volumes — attach, detach, snapshot.",
                status: "operational",
            },
        ],
        tags: ["compute", "vm", "instances"],
    },

    vpc: {
        id: "vpc",
        name: "Virtual Private Cloud",
        path: "/networking",
        icon: Network,
        description: "Global, secure and isolated networking for sovereign workloads.",
        category: "network",
        status: "degraded",
        subServices: [
            {
                id: "networks",
                name: "VPC Networks",
                path: "/networking",
                icon: Network,
                description: "Virtual private cloud network definitions and CIDR blocks.",
                status: "operational",
            },
            {
                id: "subnets",
                name: "Subnets",
                path: "/networking/subnets",
                icon: GitBranch,
                description: "IP subnet ranges and availability-zone partitioning.",
                status: "operational",
            },
            {
                id: "security-groups",
                name: "Security Groups",
                path: "/networking/security-groups",
                icon: Shield,
                description: "Stateful firewall rules controlling inbound and outbound traffic.",
                status: "operational",
            },
            {
                id: "static-ips",
                name: "Static IPs",
                path: "/networking/static-ips",
                icon: Globe,
                description: "Reserved public IPv4 addresses for predictable egress.",
                status: "operational",
            },
            {
                id: "network-interfaces",
                name: "Network Interfaces",
                path: "/networking/network-interfaces",
                icon: EthernetPort,
                description: "Virtual network interface cards (ENI) attached to your instances.",
                status: "operational",
            },
            {
                id: "routers",
                name: "Routers",
                path: "/networking/routers",
                icon: ArrowLeftRight,
                description: "Custom routing tables for fine-grained traffic control.",
                status: "operational",
            },
            {
                id: "nat-gateway",
                name: "NAT Gateway",
                path: "/networking/nat-gateways",
                icon: ArrowLeftRight,
                description: "Outbound internet access for resources in private subnets.",
                status: "maintenance",
                maintenance: NAT_MAINTENANCE,
            },
            {
                id: "internet-gateway",
                name: "Internet Gateway",
                path: "/networking/internet-gateways",
                icon: Wifi,
                description: "Two-way internet connectivity for public subnet resources.",
                status: "operational",
            },
            {
                id: "vpn",
                name: "VPN",
                path: "/networking/vpn",
                icon: Lock,
                description: "Site-to-site and client VPN tunnels for secure remote access.",
                status: "operational",
            },
        ],
        tags: ["network", "vpc", "security"],
    },

    iam: {
        id: "iam",
        name: "Identity & Access",
        path: "/iam",
        icon: ShieldCheck,
        description:
            "Granular control over platform users, roles, and fine-grained access policies.",
        category: "security",
        status: "operational",
        subServices: [
            {
                id: "users",
                name: "Users",
                path: "/iam",
                icon: Users,
                description: "Platform user accounts and their role assignments.",
                status: "operational",
            },
            {
                id: "roles",
                name: "Roles",
                path: "/iam",
                icon: Shield,
                description: "Named permission bundles assigned to users or service accounts.",
                status: "operational",
            },
            {
                id: "policies",
                name: "Policies",
                path: "/iam",
                icon: FileText,
                description: "Fine-grained allow/deny rules applied to specific resources.",
                status: "operational",
            },
        ],
        tags: ["security", "iam", "access"],
    },

    billing: {
        id: "billing",
        name: "Billing & Costs",
        path: "/billing",
        icon: CreditCard,
        description: "Expenditure reports, budget alerts and financial governance.",
        category: "billing",
        status: "operational",
        subServices: [],
        tags: ["billing", "costs", "finance"],
    },

    "resource-groups": {
        id: "resource-groups",
        name: "Resource Groups",
        path: "/resource-groups",
        icon: FolderTree,
        description: "Logically organize and govern your cloud resources.",
        category: "management",
        status: "operational",
        subServices: [],
        tags: ["organization", "groups"],
    },
}

export const SERVICES_QUERY_KEYS = {
    health: ["services", "health"] as const,
    serviceHealth: (id: string) => ["services", "health", id] as const,
}

/** Ordered list for the dashboard service grid */
export const DASHBOARD_SERVICE_ORDER = ["vms", "vpc", "iam", "billing", "resource-groups"]
