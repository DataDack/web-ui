export type AutomationKind = "agent" | "workflow"
export interface AutomationDefinition {
  id: string
  name: string
  description: string
  kind: AutomationKind
  status: "draft" | "active" | "disabled"
  version: number
  definition: Record<string, unknown>
  metadata: Record<string, unknown>
  created_at?: string
  updated_at?: string
}
export interface AutomationTemplate {
  slug: string
  name: string
  description?: string
  category?: string
  tags?: string[]
  kind: AutomationKind
  definition: unknown
}
export interface AutomationCredential {
  id: string
  name: string
  type: string
  created_at?: string
  updated_at?: string
}
export interface SaveAutomation {
  name: string
  description: string
  status: AutomationDefinition["status"]
  definition: Record<string, unknown>
  metadata: Record<string, unknown>
}
export interface SaveCredential {
  name: string
  type: string
  data: Record<string, unknown>
}
export interface ExecutionEvent {
  id?: string
  status?: string
  recorded_at?: string
  [key: string]: unknown
}
export interface AIAutomationsTransport {
  /**
   * What the host's backend can actually serve.
   *
   * `integrations` gates the app-trigger surface: the trigger palette's app
   * nodes, the per-node connect panels and the connected-accounts picker. It
   * defaults to OFF, because a host that does not serve those routes renders a
   * palette full of triggers that configure cleanly and never fire.
   *
   * `connectedAccounts` gates the account picker on the credentials page, and
   * `realtimeEvents` the execution-log socket.
   */
  capabilities?: { connectedAccounts?: boolean; integrations?: boolean; realtimeEvents?: boolean }
  brandIconUrl?: string
  publicUrl?(path: string): string
  request<T = unknown>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    options?: { body?: unknown; params?: Record<string, unknown>; responseType?: string },
  ): Promise<T>
  /**
   * The app-integration surface, when the host serves it somewhere other than
   * `request`.
   *
   * The two halves of AI & Automations live in different services now: the
   * workflow documents and their executions are on one control plane, and every
   * third-party connection — the OAuth accounts, the trigger bindings, the Meta
   * products — is on another. `request` reaches the first; this reaches the
   * second, with whatever credential and origin that one needs.
   *
   * `path` is relative to the integrations root, e.g. `/triggers/{id}/setup`.
   *
   * OPTIONAL, and falling back to `request` is deliberate: a host that serves
   * both from one place needs to implement nothing. Set `capabilities
   * .integrations` to false instead of leaving this unset if the host serves
   * the surface nowhere — otherwise the palette renders app triggers that
   * configure cleanly and never fire.
   */
  integrationsRequest?<T = unknown>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    options?: { body?: unknown; params?: Record<string, unknown>; responseType?: string },
  ): Promise<T>
  list?(
    kind: AutomationKind,
    query?: { page?: number; limit?: number; keyword?: string },
  ): Promise<AutomationDefinition[]>
  get?(kind: AutomationKind, id: string): Promise<AutomationDefinition>
  create?(kind: AutomationKind, input: SaveAutomation): Promise<AutomationDefinition>
  update?(kind: AutomationKind, id: string, input: SaveAutomation): Promise<AutomationDefinition>
  remove?(kind: AutomationKind, id: string): Promise<void>
  versions?(kind: AutomationKind, id: string): Promise<AutomationDefinition[]>
  templates?(kind: AutomationKind): Promise<AutomationTemplate[]>
  getTemplate?(kind: AutomationKind, slug: string): Promise<AutomationTemplate>
  useTemplate?(kind: AutomationKind, slug: string): Promise<AutomationDefinition>
  listCredentials?(): Promise<AutomationCredential[]>
  createCredential?(input: SaveCredential): Promise<AutomationCredential>
  updateCredential?(id: string, input: SaveCredential): Promise<AutomationCredential>
  removeCredential?(id: string): Promise<void>
  listLogs?(kind: AutomationKind, id: string): Promise<ExecutionEvent[]>
  invoke?(kind: AutomationKind, id: string, payload: unknown): Promise<unknown>
  deploy?(kind: AutomationKind, id: string): Promise<unknown>
  undeploy?(kind: AutomationKind, id: string): Promise<unknown>
}
