import { Outlet, useLocation, useNavigate } from "react-router-dom"

import { Tabs, TabsList, TabsTrigger } from "@datadack/common-ui"

import { HOSTING_ADMIN_ROUTES } from "../hosting.constants"

const TABS = [
  { value: "providers", label: "Providers", path: HOSTING_ADMIN_ROUTES.servers },
  { value: "plans", label: "Plans", path: HOSTING_ADMIN_ROUTES.plans },
  { value: "accounts", label: "Accounts", path: HOSTING_ADMIN_ROUTES.accounts },
  { value: "queue", label: "Provisioning queue", path: HOSTING_ADMIN_ROUTES.queue },
] as const

type HostingAdminTab = (typeof TABS)[number]["value"]

function activeTab(pathname: string): HostingAdminTab {
  if (pathname.startsWith(HOSTING_ADMIN_ROUTES.plans)) return "plans"
  if (pathname.startsWith(HOSTING_ADMIN_ROUTES.accounts)) return "accounts"
  if (pathname.startsWith(HOSTING_ADMIN_ROUTES.queue)) return "queue"
  return "providers"
}

/** Keeps the shared-hosting product line in one sidebar destination. */
export function HostingAdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <div className="space-y-4">
      <Tabs
        value={activeTab(location.pathname)}
        onValueChange={(value) => {
          const tab = TABS.find((item) => item.value === value)
          if (tab) void navigate(tab.path)
        }}
      >
        <TabsList aria-label="Shared hosting sections">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Outlet />
    </div>
  )
}
