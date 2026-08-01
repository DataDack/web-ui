export type SearchResultType =
  | "module"
  | "vm"
  | "ssh-key"
  | "load-balancer"
  | "disk"
  | "database"
  | "vpc"
  | "subnet"
  | "static-ip"
  | "network-interface"
  | "iam-user"
  | "iam-role"
  | "resource-group"
  | "invoice"

export type SearchResultStatus =
  | "running"
  | "stopped"
  | "pending"
  | "error"
  | "active"
  | "inactive"
  | "optimal"
  | "paid"
  | "overdue"

export interface SearchResult {
  id: string
  type: SearchResultType
  /**
   * Icon to render, when it should differ from `type`. Module entries all
   * share `type: "module"` for grouping, but each points at the resource
   * kind it navigates to so the palette shows a distinct icon per row.
   */
  iconType?: SearchResultType
  label: string
  description: string
  path: string
  status?: SearchResultStatus
  region?: string
  /** Extra chips shown below title, e.g. ["4 vCPU", "16 GB"] */
  meta?: string[]
  tags?: string[]
  updatedAt?: string
}

export interface SearchGroup {
  type: SearchResultType
  label: string
  results: SearchResult[]
}

export interface SearchResponse {
  groups: SearchGroup[]
  totalCount: number
  query: string
}
