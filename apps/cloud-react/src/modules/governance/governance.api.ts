import { apiGet, apiPut } from "@/services/api/client"

import type { NamingPolicy } from "./governance.types"

const BASE = "/org/naming-policy"

/** Raw shape returned by the Go NamingPolicyResponse. */
interface PolicyEntity {
  account_id?: string
  is_default?: boolean
  naming_convention?: string
}

function toPolicy(res: PolicyEntity): NamingPolicy {
  return {
    accountId: res.account_id ?? "",
    isDefault: res.is_default ?? true,
    namingConvention: res.naming_convention ?? "",
  }
}

export const governanceApi = {
  getNamingPolicy: async (): Promise<NamingPolicy> => {
    return toPolicy(await apiGet<PolicyEntity>(BASE))
  },

  updateNamingPolicy: async (pattern: string): Promise<NamingPolicy> => {
    return toPolicy(await apiPut<PolicyEntity>(BASE, { naming_convention: pattern }))
  },
}
