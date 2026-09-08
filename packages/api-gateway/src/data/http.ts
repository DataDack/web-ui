/**
 * The one thing this package cannot supply for itself: an authenticated
 * request.
 *
 * Everything else about talking to the control plane — the paths, the schemas,
 * the AWS error envelope, which calls take maxResults — is a property of the
 * API and belongs here, shared. What differs per app is only how a request is
 * authorised: serverless-web attaches a bearer token and an X-Faas-Account-Id
 * header, cloud-react rides a session cookie through its own gateway.
 *
 * So the adapter is deliberately tiny, and deliberately does NOT throw. It
 * reports what came back and lets this package decide what that means, which is
 * what keeps the error envelope in one place instead of re-implemented in every
 * console that renders these screens.
 */
export interface ApiGatewayRequest {
  method: "GET" | "POST" | "PATCH" | "DELETE"
  /** Path from the control plane root, e.g. "/v2/apis/a1b2c3d4e5". */
  path: string
  query?: Record<string, string | number>
  body?: unknown
}

export interface ApiGatewayResponse {
  status: number
  /** Parsed JSON when there was a body, undefined for a 204. */
  data: unknown
  /** Lower-cased header names. x-amzn-errortype is the one this package reads. */
  headers?: Record<string, unknown>
}

/**
 * An adapter must resolve for every HTTP status, including 4xx and 5xx.
 *
 * Rejecting on a non-2xx — which is what an axios or fetch wrapper does by
 * default — would hide the response body, and the body is where the readable
 * message is. An adapter should reject only when the request never completed:
 * a DNS failure, a timeout, an aborted connection.
 */
export type ApiGatewayHttp = (request: ApiGatewayRequest) => Promise<ApiGatewayResponse>
