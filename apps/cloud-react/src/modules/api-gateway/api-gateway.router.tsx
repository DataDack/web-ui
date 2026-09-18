import type { RouteObject } from "react-router-dom"

/**
 * API Gateway, at the top level rather than under networking.
 *
 * It used to live in the VPC module at networking/api-gateway, inherited from
 * when its configuration was part of the VPC service. It is not a networking
 * resource on this platform and never was: an API here fronts serverless
 * functions and load balancers, and nothing about it is scoped to a virtual
 * network. Its control plane moved to the serverless service on 2026-09-05, and
 * the path followed the code.
 *
 * ONE route with a splat rather than three. The pages come from
 * @datadack/api-gateway, which owns its own internal routing — including the
 * ordering that keeps "domains" from being read as an API id — and repeating
 * that here is how the two get out of step.
 */
type ApiGatewayPage = "ApiGatewayRoutes" | "CreateApiWizard" | "ImportApiPage"

/** Loads one of the package's screens inside this app's provider. */
function section(page: ApiGatewayPage): RouteObject["lazy"] {
  return async () => {
    const [{ ApiGatewaySection }, pkg] = await Promise.all([
      import("./ApiGatewaySection"),
      import("@datadack/api-gateway"),
    ])
    const Page = pkg[page]
    return {
      Component: () => (
        <ApiGatewaySection>
          <Page />
        </ApiGatewaySection>
      ),
    }
  }
}

/*
 * The create screens are matched here, ahead of the splat, only so they can
 * carry `hideSidebar` like every other create surface in the console. They
 * render the package's own pages, which find their way back to the list from
 * the URL (useGatewayBase), so nothing about their routing is duplicated.
 */
export const apiGatewayRoutes: RouteObject[] = [
  {
    path: "api-gateway/create",
    handle: { hideSidebar: true },
    lazy: section("CreateApiWizard"),
  },
  {
    path: "api-gateway/create/import",
    handle: { hideSidebar: true },
    lazy: section("ImportApiPage"),
  },
  {
    path: "api-gateway/*",
    lazy: section("ApiGatewayRoutes"),
  },
]
