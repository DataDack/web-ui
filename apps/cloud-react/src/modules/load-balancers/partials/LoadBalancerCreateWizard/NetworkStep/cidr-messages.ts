// Re-exported from the VPC module, which owns the wording, so a rejected CIDR
// reads identically whether it was entered in the full VPC wizard or inline
// here. Kept as a file so the existing import paths in this folder still work.
export { SUBNET_CIDR_MESSAGES, VPC_CIDR_MESSAGES } from "@/modules/vpc/vpc.utils"
