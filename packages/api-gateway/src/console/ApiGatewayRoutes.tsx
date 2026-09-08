import { Route, Routes } from "react-router-dom"

import { ApiDetailPage } from "./ApiDetailPage"
import { ApiGatewayPage } from "./ApiGatewayPage"
import { ApiKeysPage } from "./ApiKeysPage"
import { CustomDomainsPage } from "./CustomDomainsPage"
import { UsagePlansPage } from "./UsagePlansPage"

/**
 * The whole console under one mount point.
 *
 * An app mounts `<Route path="/apigateway/*" element={<ApiGatewayRoutes />} />`
 * and gets every screen, rather than importing three pages and having to keep
 * their relative order right. The order matters here and is easy to get wrong:
 * every literal segment must be matched BEFORE ":apiId", or navigating to the
 * custom domains page would be read as an API whose id is "domains" and render
 * a 404 for a page that plainly exists.
 */
export function ApiGatewayRoutes() {
  return (
    <Routes>
      <Route index element={<ApiGatewayPage />} />
      <Route path="domains" element={<CustomDomainsPage />} />
      <Route path="keys" element={<ApiKeysPage />} />
      <Route path="usage-plans" element={<UsagePlansPage />} />
      <Route path=":apiId" element={<ApiDetailPage />} />
    </Routes>
  )
}
