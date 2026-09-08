# @datadack/api-gateway

The API Gateway console, shared by every DataDack web surface.

It renders APIs, their routes, integrations, stages, deployments and
authorizers, plus the custom domains an API is published under.

## It owns no HTTP client

The package declares what it needs as `ApiGatewayTransport` and the app supplies
it, the same way `@datadack/serverless` works. That is what lets one console
live in both `serverless-web` (which talks to the control plane directly, with a
bearer token and an `X-Faas-Account-Id` header) and `cloud-react` (which goes
through the console's own gateway and session cookie) without either app's auth
leaking into shared code.

It also means the package knows nothing about any error envelope. A transport
that wants a readable failure message throws an `Error` carrying it; anything
else falls back to the action's label.

## Wiring

```tsx
import { ApiGatewayProvider, ApiGatewayRoutes } from "@datadack/api-gateway"

;<QueryClientProvider client={queryClient}>
  <ApiGatewayProvider transport={apiGatewayTransport}>
    <BrowserRouter>
      <Routes>
        <Route path="/apigateway/*" element={<ApiGatewayRoutes />} />
      </Routes>
    </BrowserRouter>
  </ApiGatewayProvider>
</QueryClientProvider>
```

## The wire it speaks

apigatewayv2, and only that. Ten-character public ids, `PATCH` for updates,
camelCase bodies, `{items, nextToken}` listings. There is no console-private
surface: what an operator sees here is what a customer's Terraform sees.
