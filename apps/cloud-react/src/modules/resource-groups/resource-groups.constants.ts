export const RG_ROUTES = {
    ROOT: "/resource-groups",
    CREATE: "/resource-groups/create",
    DETAIL: "/resource-groups/:id",
    detail: (id: string) => `/resource-groups/${id}`,
} as const

export const RG_QUERY_KEYS = {
    list: ["resource-groups", "list"] as const,
    detail: (id: string) => ["resource-groups", "detail", id] as const,
    resources: (id: string) => ["resource-groups", "detail", id, "resources"] as const,
}

export const STORAGE_KEY_ACTIVE_RG = "bsc-active-rg"
