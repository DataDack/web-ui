import { z } from "zod/v4"

import { isIPv4, isIpInCidr } from "@/lib/net"
import type { NamingRule } from "@/modules/governance/governance.types"
import { namingNameSchema } from "@/modules/governance/governance.validation"

export const makeSchema = (rule: NamingRule) =>
    z
        .object({
            name: namingNameSchema(rule).optional().or(z.literal("")),
            resource_group_id: z.string().min(1, "Select a resource group"),
            description: z.string().optional(),
            termination_protection: z.boolean(),
            region: z.string().min(1, "Required"),
            zone: z.string().min(1, "Required"),
            machine_type_id: z.string().min(1, "Select a machine type"),
            billing_period: z.enum(["hourly", "monthly"]),
            image_id: z.string().min(1, "Select an OS image"),
            vpc_id: z.string(),
            subnet_id: z.string(),
            skip_vpc: z.boolean(),
            // Optional — instances may launch with no security group attached.
            security_group_ids: z.array(z.string()),
            // Optional — a VM can be created without an SSH key.
            ssh_key_id: z.string(),
            disk_size_gb: z
                .number({ message: "Enter a size in GB" })
                .int("Whole GB only")
                .min(10, "Minimum 10 GB")
                .max(16384, "Maximum 16384 GB"),
            disk_type: z.enum(["ssd", "hdd", "nvme"]),
            volume_class: z.string().optional(),
            delete_on_termination: z.boolean(),
            private_ip: z.string(),
            _subnet_cidr: z.string(),
            // none = no public IP; ephemeral = free auto-assigned IP that changes
            // across stop/start; static = a reserved IP held for the instance (paid).
            public_ip_type: z.enum(["none", "ephemeral", "static"]),
        })
        .superRefine((val, ctx) => {
            if (!val.skip_vpc) {
                if (!val.vpc_id) {
                    ctx.addIssue({ code: "custom", path: ["vpc_id"], message: "Select a VPC" })
                }
                if (!val.subnet_id) {
                    ctx.addIssue({
                        code: "custom",
                        path: ["subnet_id"],
                        message: "Select a subnet",
                    })
                }
            }
            if (!val.private_ip) return
            if (!isIPv4(val.private_ip)) {
                ctx.addIssue({
                    code: "custom",
                    path: ["private_ip"],
                    message: "Enter a valid IPv4 address",
                })
                return
            }
            if (val._subnet_cidr && !isIpInCidr(val.private_ip, val._subnet_cidr)) {
                ctx.addIssue({
                    code: "custom",
                    path: ["private_ip"],
                    message: `IP must be inside the subnet range ${val._subnet_cidr}`,
                })
            }
        })

export type FormValues = z.infer<ReturnType<typeof makeSchema>>

// Default RFC 1918 private ranges offered when the user lets us auto-create a
// VPC/subnet — these are intentional constants, not a leaked address.
// eslint-disable-next-line sonarjs/no-hardcoded-ip
export const AUTO_VPC_CIDR = "10.0.0.0/16"
// eslint-disable-next-line sonarjs/no-hardcoded-ip
export const AUTO_SUBNET_CIDR = "10.0.0.0/24"
export const PUBLIC_KEY_PATTERN = /^(ssh-(rsa|ed25519|dss)|ecdsa-sha2-nistp(256|384|521))\s+\S+/
