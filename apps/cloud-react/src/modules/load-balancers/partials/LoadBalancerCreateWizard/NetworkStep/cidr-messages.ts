import type { SubnetCidrIssue, VpcCidrIssue } from "@/modules/vpc/vpc.utils"

// The wording the full VPC wizard uses, so a rejected CIDR reads identically
// whether it was entered there or inline here. Kept as flat lookups rather than
// nested ternaries at each call site.

export const VPC_CIDR_MESSAGES: Record<VpcCidrIssue, string> = {
    format: "Must be CIDR notation, e.g. 10.0.0.0/16",
    private: "Must be a private RFC1918 range (10.x, 172.16–31.x, 192.168.x)",
    prefix: "Prefix must be between /16 and /24",
}

export const SUBNET_CIDR_MESSAGES: Record<SubnetCidrIssue, string> = {
    format: "Must be CIDR notation, e.g. 10.0.1.0/24",
    prefix: "Prefix must be between /20 and /28",
    outside: "Must sit inside the VPC's range",
    overlap: "Overlaps another subnet in this VPC",
}
