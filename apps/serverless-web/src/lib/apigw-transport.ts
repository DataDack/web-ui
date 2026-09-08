import { http } from "@/lib/api"

import {
  createApiGatewayTransport,
  REACHABLE_PREFIX,
  type ApiGatewayHttp,
} from "@datadack/api-gateway"

/**
 * This console's half of the API Gateway transport: how a request is
 * authorised, and nothing else.
 *
 * Every path, schema and error shape lives in @datadack/api-gateway, because
 * none of it differs between consoles — they are the control plane's contract,
 * not this app's. What is left here is the one thing the package genuinely
 * cannot know: `http` is the app's axios instance, and its interceptors already
 * attach the bearer token, the X-Faas-Account-Id header and whichever API base
 * the operator set in Settings. cloud-react implements the same adapter over
 * its session cookie and renders the identical console.
 */

/**
 * Resolves for every status, including 4xx and 5xx.
 *
 * `validateStatus: () => true` is the load-bearing line. Axios rejects on a
 * non-2xx by default, which would throw away the response body — and the body
 * is where the readable message is. The package decides what a status means and
 * decodes the AWS envelope; this only has to deliver it.
 */
const requestApiGateway: ApiGatewayHttp = async ({ method, path, query, body }) => {
  const response = await http.request<unknown>({
    method,
    // Prefixed here rather than on `http`: that instance's baseURL is the
    // operator's API base, shared with every other /v1 call this console makes,
    // so it cannot carry a prefix specific to this surface. See REACHABLE_PREFIX
    // for why the bare /v2 path does not reach the control plane in production.
    url: REACHABLE_PREFIX + path,
    params: query,
    data: body,
    validateStatus: () => true,
  })
  return {
    status: response.status,
    data: response.data,
    // Axios lower-cases response header names, which is what the package reads
    // x-amzn-errortype from.
    headers: response.headers,
  }
}

export const apiGatewayTransport = createApiGatewayTransport(requestApiGateway)
