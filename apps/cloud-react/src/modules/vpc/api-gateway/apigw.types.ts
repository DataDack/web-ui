// Shapes mirror cloud-be-go/apps/vpc/api-gateway entities and request DTOs.
// The API layer normalizes absent Go UUID values to `undefined`.

export type APIProtocol = "HTTP" | "WEBSOCKET" | "REST"
export type EndpointType = "REGIONAL" | "EDGE" | "PRIVATE"
export type IPAddressType = "ipv4" | "dualstack"
export type SecurityPolicy = "TLS_1_0" | "TLS_1_2"
export type APIStatus = "available" | "inactive"
export type IntegrationType = "HTTP_PROXY" | "HTTP" | "AWS_PROXY" | "AWS" | "MOCK"
export type AuthorizationType = "NONE" | "JWT" | "AWS_IAM" | "CUSTOM"
export type AuthorizerType = "JWT" | "REQUEST" | "TOKEN"
export type LoggingLevel = "OFF" | "ERROR" | "INFO"
export type QuotaPeriod = "DAY" | "WEEK" | "MONTH"

export interface EntityBase {
  id: string
  tenant_serial: number
  created_at: string
  updated_at: string
}

export interface CORSConfig {
  enabled: boolean
  allow_origins: string[]
  allow_methods: string[]
  allow_headers: string[]
  expose_headers: string[]
  max_age: number
  allow_credentials: boolean
}

export interface APIGateway extends EntityBase {
  resource_group_id?: string
  name: string
  description: string
  region: string
  version: string
  protocol_type: APIProtocol
  endpoint_type: EndpointType
  ip_address_type: IPAddressType
  security_policy: SecurityPolicy
  api_endpoint: string
  disable_execute_api_endpoint: boolean
  route_selection_expression: string
  api_key_selection_expression: string
  cors_enabled: boolean
  cors_allow_origins: string[]
  cors_allow_methods: string[]
  cors_allow_headers: string[]
  cors_expose_headers: string[]
  cors_max_age: number
  cors_allow_credentials: boolean
  status: APIStatus
  tags: Record<string, string> | string
  user_id: string
  routes?: APIGatewayRoute[]
  integrations?: APIGatewayIntegration[]
  stages?: APIGatewayStage[]
  authorizers?: APIGatewayAuthorizer[]
}

export interface WizardRoute {
  method: string
  path: string
  integration_target?: string
  integration_type?: IntegrationType
}
export interface WizardStage {
  name: string
  auto_deploy: boolean
}
export interface CreateAPIRequest {
  name: string
  description?: string
  region: string
  version?: string
  protocol_type?: APIProtocol
  endpoint_type?: EndpointType
  ip_address_type?: IPAddressType
  security_policy?: SecurityPolicy
  disable_execute_api_endpoint?: boolean
  route_selection_expression?: string
  api_key_selection_expression?: string
  cors?: CORSConfig | null
  routes?: WizardRoute[]
  stages?: WizardStage[]
}
export interface UpdateAPIRequest extends Partial<
  Omit<CreateAPIRequest, "region" | "protocol_type" | "cors" | "routes" | "stages">
> {
  status?: APIStatus
  tags?: string
}
export type UpdateCORSRequest = CORSConfig
export interface ImportAPIRequest {
  region: string
  name?: string
  body: string
  fail_on_warnings?: boolean
}
export interface ExportedAPI {
  body: string
  [key: string]: unknown
}

export interface APIGatewayRoute extends EntityBase {
  api_id: string
  route_key: string
  method: string
  path: string
  target_integration_id?: string
  operation_name: string
  authorization_type: AuthorizationType
  authorizer_id?: string
  authorization_scopes: string[]
  api_key_required: boolean
  request_parameters: Record<string, boolean>
  request_models: Record<string, string>
}
export interface CreateRouteRequest {
  route_key?: string
  method?: string
  path?: string
  target_integration_id?: string
  operation_name?: string
  authorization_type?: AuthorizationType
  authorizer_id?: string
  authorization_scopes?: string[]
  api_key_required?: boolean
  request_parameters?: Record<string, boolean>
  request_models?: Record<string, string>
}
export type UpdateRouteRequest = Partial<CreateRouteRequest>

export interface APIGatewayIntegration extends EntityBase {
  api_id: string
  name: string
  description: string
  integration_type: IntegrationType
  integration_uri: string
  integration_method: string
  payload_format_version: string
  connection_type: "INTERNET" | "VPC_LINK"
  vpc_link_id?: string
  timeout_millis: number
  request_parameters: Record<string, string>
  response_parameters: Record<string, string>
  request_templates: Record<string, string>
  response_templates: Record<string, string>
  template_selection_expression: string
  passthrough_behavior: "WHEN_NO_MATCH" | "WHEN_NO_TEMPLATES" | "NEVER"
  content_handling_strategy: "" | "CONVERT_TO_TEXT" | "CONVERT_TO_BINARY"
  tls_server_name_to_verify: string
  credentials_id: string
}
export type CreateIntegrationRequest = Omit<
  APIGatewayIntegration,
  keyof EntityBase | "api_id" | "vpc_link_id"
> & { vpc_link_id?: string }
export type UpdateIntegrationRequest = Partial<CreateIntegrationRequest>

export interface APIGatewayAuthorizer extends EntityBase {
  api_id: string
  name: string
  authorizer_type: AuthorizerType
  identity_source: string[]
  jwt_issuer: string
  jwt_audience: string[]
  authorizer_uri: string
  authorizer_payload_format_version: string
  enable_simple_responses: boolean
  authorizer_result_ttl_seconds: number
  authorizer_credentials: string
}
export type CreateAuthorizerRequest = Omit<APIGatewayAuthorizer, keyof EntityBase | "api_id">
export type UpdateAuthorizerRequest = Partial<CreateAuthorizerRequest>

export interface RouteSetting {
  throttling_rate_limit?: number
  throttling_burst_limit?: number
  detailed_metrics_enabled?: boolean
  logging_level?: LoggingLevel
  data_trace_enabled?: boolean
}
export interface APIGatewayStage extends EntityBase {
  api_id: string
  name: string
  description: string
  auto_deploy: boolean
  deployment_id?: string
  stage_variables: Record<string, string>
  throttling_rate_limit: number
  throttling_burst_limit: number
  detailed_metrics_enabled: boolean
  logging_level: LoggingLevel
  data_trace_enabled: boolean
  route_settings: Record<string, RouteSetting>
  access_log_enabled: boolean
  access_log_destination: string
  access_log_format: string
  client_certificate_id: string
}
export type CreateStageRequest = Omit<
  APIGatewayStage,
  keyof EntityBase | "api_id" | "deployment_id"
> & { deployment_id?: string }
export type UpdateStageRequest = Partial<Omit<CreateStageRequest, "name">>

export interface APIGatewayDeployment extends EntityBase {
  api_id: string
  description: string
  status: "PENDING" | "DEPLOYED" | "FAILED"
  status_message: string
  auto_deployed: boolean
  user_id: string
}
export interface CreateDeploymentRequest {
  description?: string
  stage_id?: string
}

export interface APIGatewayModel extends EntityBase {
  api_id: string
  name: string
  description: string
  content_type: string
  schema: string
}
export type CreateModelRequest = Omit<APIGatewayModel, keyof EntityBase | "api_id">
export type UpdateModelRequest = Partial<CreateModelRequest>

export interface VPCLink extends EntityBase {
  name: string
  region: string
  vpc_id: string
  subnet_ids: string[]
  security_group_ids: string[]
  status: string
  status_message: string
  tags: Record<string, string> | string
  user_id: string
}
export interface CreateVPCLinkRequest {
  name: string
  region: string
  vpc_id: string
  subnet_ids: string[]
  security_group_ids?: string[]
}
export interface UpdateVPCLinkRequest {
  name?: string
  subnet_ids?: string[]
  security_group_ids?: string[]
}

export interface DomainName extends EntityBase {
  domain_name: string
  region: string
  endpoint_type: EndpointType
  security_policy: SecurityPolicy
  ip_address_type: IPAddressType
  certificate_id: string
  ownership_verification_certificate: string
  target_domain_name: string
  hosted_zone_id: string
  status: "pending" | "available"
  status_message: string
  tags: Record<string, string> | string
  user_id: string
  mappings?: APIMapping[]
}
export interface CreateDomainNameRequest {
  domain_name: string
  region: string
  endpoint_type?: EndpointType
  security_policy?: SecurityPolicy
  ip_address_type?: IPAddressType
  certificate_id?: string
}
export type UpdateDomainNameRequest = Partial<
  Omit<CreateDomainNameRequest, "domain_name" | "region">
>
export interface APIMapping extends EntityBase {
  domain_name_id: string
  mapping_key: string
  api_id: string
  stage_id: string
}
export interface CreateAPIMappingRequest {
  api_id: string
  stage_id: string
  mapping_key?: string
}
export type UpdateAPIMappingRequest = Partial<CreateAPIMappingRequest>

/** Safe list/get representation: the backend never includes the secret value. */
export interface APIKey extends EntityBase {
  name: string
  description: string
  enabled: boolean
  customer_id: string
  tags: Record<string, string> | string
  user_id: string
  masked_value: string
}
export interface CreateAPIKeyRequest {
  name: string
  description?: string
  value?: string
  enabled?: boolean
  customer_id?: string
}
export type UpdateAPIKeyRequest = Partial<Omit<CreateAPIKeyRequest, "value">>
export interface CreatedAPIKey extends APIKey {
  value: string
}
export interface APIKeyValue {
  value: string
}

export interface UsagePlan extends EntityBase {
  name: string
  description: string
  throttle_rate_limit: number
  throttle_burst_limit: number
  quota_limit: number
  quota_period: QuotaPeriod
  quota_offset: number
  product_code: string
  tags: Record<string, string> | string
  user_id: string
  apis?: UsagePlanAPI[]
}
export interface CreateUsagePlanRequest {
  name: string
  description?: string
  throttle_rate_limit?: number
  throttle_burst_limit?: number
  quota_limit?: number
  quota_period?: QuotaPeriod
  quota_offset?: number
  product_code?: string
}
export type UpdateUsagePlanRequest = Partial<CreateUsagePlanRequest>
export interface UsagePlanKey extends EntityBase {
  usage_plan_id: string
  api_key_id: string
}
export interface AttachPlanKeyRequest {
  api_key_id: string
}
export interface UsagePlanAPI extends EntityBase {
  usage_plan_id: string
  api_id: string
  stage_id: string
  throttle: Record<string, RouteSetting>
}
export interface AttachPlanStageRequest {
  api_id: string
  stage_id: string
  throttle?: Record<string, RouteSetting>
}
