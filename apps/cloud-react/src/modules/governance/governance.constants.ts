export const GOVERNANCE_QUERY_KEYS = {
  namingPolicy: ["governance", "naming-policy"] as const,
  taxRegistrations: ["governance", "tax-registrations"] as const,
  taxRegistration: (id: string) => ["governance", "tax-registration", id] as const,
}

export const TAX_SETTINGS_ROUTES = {
  ROOT: "/governance/tax-settings",
  CREATE: "/governance/tax-settings/new",
  edit: (id: number | string) => `/governance/tax-settings/${String(id)}/edit`,
} as const
