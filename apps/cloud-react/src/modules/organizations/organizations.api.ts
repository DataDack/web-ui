import { apiGet, apiPost, apiPut } from "@/services/api/client"

import type {
  MyOrganization,
  Organization,
  ProvisionedOrganization,
  ProvisionOrganizationPayload,
  UpdateOrganizationPayload,
} from "./organizations.types"

/** Raw organization as served by the Go entity (id is a uuid string). */
interface OrganizationEntity extends Omit<Organization, "id"> {
  id: string
}

/** The backend entity already matches the console shape (id is a uuid string). */
function toOrganization(e: OrganizationEntity): Organization {
  return { ...e }
}

export const organizationsApi = {
  /** Organizations the caller can switch between, each with its active account. */
  listMine: () => apiGet<MyOrganization[]>("/org/organizations/me"),

  /** Full record for a single organization. */
  get: async (id: string): Promise<Organization> =>
    toOrganization(await apiGet<OrganizationEntity>(`/org/organizations/${id}`)),

  /** Update an organization's editable details (name, billing email, status). */
  update: async (id: string, payload: UpdateOrganizationPayload): Promise<Organization> =>
    toOrganization(await apiPut<OrganizationEntity>(`/org/organizations/${id}`, payload)),

  /** Provision a new organization the caller owns, returning its active account. */
  provision: (payload: ProvisionOrganizationPayload) =>
    apiPost<ProvisionedOrganization>("/org/organizations/provision", payload),
}
