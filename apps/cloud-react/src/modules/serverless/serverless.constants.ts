export const SERVERLESS_ROUTES = {
  ROOT: "/serverless",
  CREATE: "/serverless/create",
  LAYERS: "/serverless/layers",
  LAYERS_PUBLISH: "/serverless/layers/publish",
  detail: (name: string) => `/serverless/functions/${encodeURIComponent(name)}`,
} as const
