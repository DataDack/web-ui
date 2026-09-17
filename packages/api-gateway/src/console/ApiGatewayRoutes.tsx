import { Route, Routes } from "react-router-dom"

import { ApiDetailPage } from "./ApiDetailPage"
import { ApiGatewayPage } from "./ApiGatewayPage"
import { ApiKeysPage } from "./ApiKeysPage"
import { ChooseApiTypePage } from "./create/ChooseApiTypePage"
import { CreateApiWizard } from "./create/CreateApiWizard"
import { CreateRestApiPage } from "./create/CreateRestApiPage"
import { ImportApiPage } from "./create/ImportApiPage"
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
 * a 404 for a page that plainly exists. "create" is the same trap.
 */
export function ApiGatewayRoutes() {
  return (
    <Routes>
      <Route index element={<ApiGatewayPage />} />
      <Route path="create" element={<ChooseApiTypePage />} />
      <Route path="create/http" element={<CreateApiWizard key="http" protocol="HTTP" />} />
      <Route
        path="create/websocket"
        element={<CreateApiWizard key="websocket" protocol="WEBSOCKET" />}
      />
      <Route path="create/rest" element={<CreateRestApiPage />} />
      <Route path="create/import" element={<ImportApiPage />} />
      <Route path="domains" element={<CustomDomainsPage />} />
      <Route path="keys" element={<ApiKeysPage />} />
      <Route path="usage-plans" element={<UsagePlansPage />} />
      <Route path=":apiId" element={<ApiDetailPage />} />
    </Routes>
  )
}
