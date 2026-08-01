export const SSH_KEYS_ROUTES = {
  ROOT: "/compute/ssh-keys",
  CREATE: "/compute/ssh-keys/create",
} as const

export const SSH_KEYS_QUERY_KEYS = {
  list: ["ssh-keys", "list"] as const,
}
