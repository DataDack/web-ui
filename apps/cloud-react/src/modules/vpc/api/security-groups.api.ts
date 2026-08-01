import { apiDelete, apiGet, apiPost, apiPut, LIST_QUERY } from "@/services/api/client"

import {
  formatPortRange,
  parsePortRange,
  sgProtocolUsesPorts,
  type RawSGRule,
  toBEDirection,
  toFEDirection,
} from "./shared"
import type {
  AddSGRuleRequest,
  CreateSecurityGroupRequest,
  SecurityGroup,
  SGProtocol,
  SGRule,
  SGRuleAction,
  SGSourceType,
  UpdateSGRuleRequest,
} from "../vpc.types"

const SG_BASE = "/vpc/securitygroups"

/** Backend SG entity uses `vpc_id` (null = account-wide); normalize to FE `network_id`. */
interface RawSecurityGroup extends Omit<SecurityGroup, "network_id" | "rules"> {
  vpc_id: string | null
  rules?: RawSGRule[]
}

function toSecurityGroup(raw: RawSecurityGroup): SecurityGroup {
  const { vpc_id: networkId, rules, ...rest } = raw
  return { ...rest, network_id: networkId ?? "", rules: rules?.map(toSGRule) }
}

function toSGRule(raw: RawSGRule): SGRule {
  return {
    id: raw.id,
    security_group_id: raw.security_group_id,
    direction: toFEDirection(raw.direction),
    protocol: raw.protocol as SGProtocol,
    port_range: sgProtocolUsesPorts(raw.protocol)
      ? formatPortRange(raw.port_from, raw.port_to)
      : "",
    source_type: (raw.source_type || "cidr") as SGSourceType,
    source: raw.source_cidr,
    source_sg_id: raw.source_sg_id,
    action: raw.action as SGRuleAction,
    description: raw.description || "",
  }
}

/** FE rule payload → backend rule body (add and update share the same shape). */
function toRuleBody(payload: AddSGRuleRequest) {
  const { portFrom, portTo } = sgProtocolUsesPorts(payload.protocol)
    ? parsePortRange(payload.port_range)
    : { portFrom: 0, portTo: 0 }
  return {
    direction: toBEDirection(payload.direction),
    protocol: payload.protocol,
    port_from: portFrom,
    port_to: portTo,
    source_type: "cidr",
    source_cidr: payload.source,
    action: payload.action,
    description: payload.description ?? "",
  }
}

export const securityGroupsApi = {
  listAll: async (): Promise<SecurityGroup[]> => {
    const rows = await apiGet<RawSecurityGroup[]>(SG_BASE + LIST_QUERY)
    return rows.map(toSecurityGroup)
  },

  list: async (networkId: string): Promise<SecurityGroup[]> => {
    const rows = await apiGet<RawSecurityGroup[]>(SG_BASE + LIST_QUERY)
    return rows.map(toSecurityGroup).filter((g) => g.network_id === networkId)
  },

  get: async (id: string): Promise<SecurityGroup> => {
    const raw = await apiGet<RawSecurityGroup>(`${SG_BASE}/${id}`)
    return toSecurityGroup(raw)
  },

  create: async (payload: CreateSecurityGroupRequest): Promise<SecurityGroup> => {
    const raw = await apiPost<RawSecurityGroup>(SG_BASE, {
      name: payload.name,
      description: payload.description,
      // Omit vpc_id entirely for an account-wide group.
      ...(payload.network_id ? { vpc_id: payload.network_id } : {}),
    })
    return toSecurityGroup(raw)
  },

  /** Idempotent: returns the account's "default" SG, creating it (with SSH/HTTP/
   *  HTTPS inbound rules) when missing. */
  createDefault: async (networkId?: string): Promise<SecurityGroup> => {
    const raw = await apiPost<RawSecurityGroup>(
      `${SG_BASE}/default`,
      networkId ? { vpc_id: networkId } : {},
    )
    return toSecurityGroup(raw)
  },

  delete: (id: string): Promise<void> => apiDelete(`${SG_BASE}/${id}`),

  listRules: async (sgId: string): Promise<SGRule[]> => {
    const rows = await apiGet<RawSGRule[]>(`${SG_BASE}/${sgId}/rules`)
    return rows.map(toSGRule)
  },

  addRule: async (sgId: string, payload: AddSGRuleRequest): Promise<SGRule> => {
    const raw = await apiPost<RawSGRule>(`${SG_BASE}/${sgId}/rules`, toRuleBody(payload))
    return toSGRule(raw)
  },

  updateRule: async (
    sgId: string,
    ruleId: string,
    payload: UpdateSGRuleRequest,
  ): Promise<SGRule> => {
    const raw = await apiPut<RawSGRule>(`${SG_BASE}/${sgId}/rules/${ruleId}`, toRuleBody(payload))
    return toSGRule(raw)
  },

  removeRule: (sgId: string, ruleId: string): Promise<void> =>
    apiDelete(`${SG_BASE}/${sgId}/rules/${ruleId}`),

  /* ── Instance attachments (compute side) ───────────────────────────── */

  listForInstance: async (instanceId: string): Promise<SecurityGroup[]> => {
    const rows = await apiGet<RawSecurityGroup[]>(`/compute/instances/${instanceId}/securitygroups`)
    return rows.map(toSecurityGroup)
  },

  attachToInstance: async (instanceId: string, sgId: string): Promise<void> => {
    await apiPost(`/compute/instances/${instanceId}/securitygroups`, {
      security_group_id: sgId,
    })
  },

  detachFromInstance: (instanceId: string, sgId: string): Promise<void> =>
    apiDelete(`/compute/instances/${instanceId}/securitygroups/${sgId}`),
}
