import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "@/services/api/client"
import type {
  Application,
  Configuration,
  CreateApplicationRequest,
  CreateConfigurationRequest,
  UpdateApplicationRequest,
} from "./sso.types"

const BASE = "/managedapps/sso"

export const ssoApi = {
  listApplications: (): Promise<Application[]> =>
    apiGet<Application[]>(`${BASE}/applications`),

  createApplication: (payload: CreateApplicationRequest): Promise<Application> =>
    apiPost<Application>(`${BASE}/applications`, payload),

  getApplication: (id: string): Promise<Application> =>
    apiGet<Application>(`${BASE}/applications/${id}`),

  updateApplication: (id: string, payload: UpdateApplicationRequest): Promise<Application> =>
    apiPut<Application>(`${BASE}/applications/${id}`, payload),

  deleteApplication: (id: string): Promise<void> =>
    apiDelete(`${BASE}/applications/${id}`),

  listConfigurations: (appId: string): Promise<Configuration[]> =>
    apiGet<Configuration[]>(`${BASE}/applications/${appId}/configurations`),

  createConfiguration: (appId: string, payload: CreateConfigurationRequest): Promise<Configuration> =>
    apiPost<Configuration>(`${BASE}/applications/${appId}/configurations`, payload),

  getConfiguration: (configId: string): Promise<Configuration> =>
    apiGet<Configuration>(`${BASE}/configurations/${configId}`),

  updateConfigSection: (
    configId: string,
    section: "env" | "theme" | "metadata" | "policies",
    op: "replace" | "merge",
    payload: Record<string, any>
  ): Promise<void> => {
    const url = `${BASE}/configurations/${configId}/${section === "metadata" ? "metadata" : section}`
    if (op === "replace") {
      return apiPut(url, payload)
    }
    return apiPatch(url, payload)
  },
}
