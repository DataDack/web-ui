import { apiDelete, apiGet, apiPost } from "@/services/api/client"

import type { RegisterDomainRequest, RegisteredDomain } from "./registrar.types"

// cloud-be-go: app "domains", module "registrar" -> base /domains/registrar.
//
// Deliberately NOT /domains/registry, which is the per-hostname surface next to
// it. The two are one letter apart and answer different questions: registry is
// "what points at my resources", registrar is "which domains have I proven I
// own". Mixing them up in a URL is the kind of thing nobody notices until a
// support call.
const BASE = "/domains/registrar"

// Unpaginated on purpose. Registrations are capped at 100 per account and the
// realistic number is one or two, so a pager here would be chrome around a list
// that always fits on screen.
export const registrarApi = {
  list: (): Promise<RegisteredDomain[]> =>
    apiGet<RegisteredDomain[] | null>(`${BASE}/`).then((rows) => rows ?? []),

  /** One registration, keyed by the domain itself. */
  get: (domain: string): Promise<RegisteredDomain> =>
    apiGet<RegisteredDomain>(`${BASE}/${encodeURIComponent(domain)}`),

  // Register a domain. Refusals worth surfacing verbatim: 400 for a platform
  // zone or an unusable name, 409 when somebody else already holds it.
  create: (body: RegisterDomainRequest): Promise<RegisteredDomain> =>
    apiPost<RegisteredDomain>(`${BASE}/`, body),

  /**
   * Check the TXT record now instead of waiting for the background pass.
   *
   * Answers 200 whether or not it passed — the check RAN and produced an answer,
   * and "not there yet" is the expected answer for someone watching propagation.
   * Read `status` on the row, not the HTTP code. A 429 means they pressed it
   * twice inside the 10s gap.
   */
  verify: (domain: string): Promise<RegisteredDomain> =>
    apiPost<RegisteredDomain>(`${BASE}/${encodeURIComponent(domain)}/verify`),

  /** Refused with 409 while hostnames are still attached under the domain. */
  remove: (domain: string): Promise<void> =>
    apiDelete(`${BASE}/${encodeURIComponent(domain)}`),
}
