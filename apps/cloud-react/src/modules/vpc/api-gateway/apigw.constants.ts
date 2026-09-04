import type {
  APIProtocol,
  AuthorizationType,
  EndpointType,
  IntegrationType,
  LoggingLevel,
  QuotaPeriod,
} from "./apigw.types"

export const APIGW_ROUTES = {
  LIST: "/networking/api-gateway",
  CREATE: "/networking/api-gateway/create",
  DETAIL: "/networking/api-gateway/:id",
  detail: (id: string) => `/networking/api-gateway/${id}`,
} as const
export const APIGW_QUERY_KEYS = {
  list: ["apiGateway", "apis", "list"] as const,
  detail: (id: string) => ["apiGateway", "apis", "detail", id] as const,
  routes: (id: string) => ["apiGateway", "routes", id] as const,
  integrations: (id: string) => ["apiGateway", "integrations", id] as const,
  authorizers: (id: string) => ["apiGateway", "authorizers", id] as const,
  stages: (id: string) => ["apiGateway", "stages", id] as const,
  deployments: (id: string) => ["apiGateway", "deployments", id] as const,
  models: (id: string) => ["apiGateway", "models", id] as const,
  vpcLinks: ["apiGateway", "vpcLinks"] as const,
  domains: ["apiGateway", "domains"] as const,
  domainMappings: (id: string) => ["apiGateway", "domainMappings", id] as const,
  apiKeys: ["apiGateway", "apiKeys"] as const,
  usagePlans: ["apiGateway", "usagePlans"] as const,
  usagePlanKeys: (id: string) => ["apiGateway", "usagePlanKeys", id] as const,
  usagePlanApis: (id: string) => ["apiGateway", "usagePlanApis", id] as const,
}
interface Option<T extends string> {
  value: T
  label: string
  description: string
}
export const PROTOCOL_OPTIONS: Option<APIProtocol>[] = [
  {
    value: "HTTP",
    label: "HTTP",
    description: "Build a low-latency API with HTTP routes and modern proxy integrations.",
  },
  {
    value: "WEBSOCKET",
    label: "WebSocket",
    description: "Maintain persistent, bidirectional connections for real-time applications.",
  },
  {
    value: "REST",
    label: "REST",
    description: "Create a feature-rich request-response API with validation and transformations.",
  },
]
export const ENDPOINT_TYPE_OPTIONS: Option<EndpointType>[] = [
  {
    value: "REGIONAL",
    label: "Regional",
    description: "Serve clients from the API's selected region.",
  },
  {
    value: "EDGE",
    label: "Edge optimized",
    description: "Route globally distributed clients through the nearest edge location.",
  },
  {
    value: "PRIVATE",
    label: "Private",
    description: "Expose the API only to resources connected through private networking.",
  },
]
export const INTEGRATION_TYPE_OPTIONS: Option<IntegrationType>[] = [
  {
    value: "HTTP_PROXY",
    label: "HTTP proxy",
    description: "Forward requests directly to an HTTP backend with minimal transformation.",
  },
  {
    value: "HTTP",
    label: "HTTP",
    description: "Call an HTTP backend with configurable parameter and body mappings.",
  },
  {
    value: "AWS_PROXY",
    label: "Function proxy",
    description: "Pass the complete request to a compatible function integration.",
  },
  {
    value: "AWS",
    label: "Service",
    description: "Invoke a compatible cloud service action using mapped requests.",
  },
  {
    value: "MOCK",
    label: "Mock",
    description: "Return a configured response without contacting a backend.",
  },
]
export const AUTH_TYPE_OPTIONS: Option<AuthorizationType>[] = [
  {
    value: "NONE",
    label: "Open",
    description: "Allow requests without an authorization decision.",
  },
  {
    value: "JWT",
    label: "JWT",
    description: "Validate signed JSON Web Tokens from a trusted issuer.",
  },
  {
    value: "AWS_IAM",
    label: "IAM",
    description: "Require requests signed with platform identity credentials.",
  },
  {
    value: "CUSTOM",
    label: "Custom",
    description: "Delegate authorization to a configured request or token authorizer.",
  },
]
export const LOGGING_LEVEL_OPTIONS: Option<LoggingLevel>[] = [
  { value: "OFF", label: "Off", description: "Do not emit execution logs for requests." },
  {
    value: "ERROR",
    label: "Errors",
    description: "Record only failed requests and execution errors.",
  },
  {
    value: "INFO",
    label: "Info",
    description: "Record request execution details as well as errors.",
  },
]
export const QUOTA_PERIOD_OPTIONS: Option<QuotaPeriod>[] = [
  { value: "DAY", label: "Daily", description: "Reset the request allowance every day." },
  { value: "WEEK", label: "Weekly", description: "Reset the request allowance every week." },
  { value: "MONTH", label: "Monthly", description: "Reset the request allowance every month." },
]
export const HTTP_METHODS = [
  "ANY",
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
] as const
