import type { SearchResultType } from "./search.types"

export const SEARCH_QUERY_KEYS = {
    results: (query: string) => ["search", "results", query] as const,
}

export const SEARCH_DEBOUNCE_MS = 150

export const SEARCH_TYPE_LABELS: Record<SearchResultType, string> = {
    module: "Modules",
    vm: "Virtual Machines",
    "ssh-key": "SSH Keys",
    "load-balancer": "Load Balancers",
    disk: "Disks",
    database: "Databases",
    vpc: "VPC Networks",
    subnet: "Subnets",
    "static-ip": "Static IPs",
    "network-interface": "Network Interfaces",
    "iam-user": "IAM Users",
    "iam-role": "IAM Roles",
    "resource-group": "Resource Groups",
    invoice: "Invoices",
}

export const SEARCH_TYPE_ORDER: SearchResultType[] = [
    "module",
    "vm",
    "ssh-key",
    "load-balancer",
    "disk",
    "database",
    "vpc",
    "subnet",
    "static-ip",
    "network-interface",
    "iam-role",
    "iam-user",
    "resource-group",
    "invoice",
]
