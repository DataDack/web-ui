import { Navigate, type RouteObject } from "react-router-dom"

import { hostingAdminRoutes } from "@/modules/hosting/hosting.router"

import { RequireSuperAdmin } from "./components/RequireSuperAdmin"
import { AdminShell } from "./shell/AdminShell"

// Top-level route group for the super-admin console. Mounted as a sibling of
// the tenant console (not inside AppShell), so it gets its own shell entirely.
export const superadminRoutes: RouteObject[] = [
  {
    path: "/admin",
    element: (
      <RequireSuperAdmin>
        <AdminShell />
      </RequireSuperAdmin>
    ),
    children: [
      // Operators land on the overview, not on a user list: the console's job on
      // arrival is to say whether anything needs attention.
      { index: true, element: <Navigate to="/admin/overview" replace /> },
      // Shared hosting owns its own admin surfaces; they are spread in here so
      // they inherit the admin shell and the is_super_admin gate.
      ...hostingAdminRoutes,
      // The platform-wide domain listing is NOT here. Every hostname the platform
      // hands out lives in serverless_faas now, and the operator's view of them
      // moved to that service's own console — so there is one operator surface for
      // hostnames rather than two that can disagree about what is registered.
      // The tenant-facing /domains page stays here, served by a proxy.
      {
        path: "overview",
        lazy: async () => {
          const { AdminOverviewPage } = await import("./partials/AdminOverviewPage")
          return { Component: AdminOverviewPage }
        },
      },
      {
        // Organizations, accounts and users are three views of one graph, so they
        // live on one page with tabs. The two old paths redirect rather than 404:
        // they are bookmarked, and /admin/users in particular was the landing.
        path: "tenancy",
        lazy: async () => {
          const { TenancyPage } = await import("./partials/TenancyPage")
          return { Component: TenancyPage }
        },
      },
      { path: "organizations", element: <Navigate to="/admin/tenancy" replace /> },
      { path: "users", element: <Navigate to="/admin/tenancy?tab=users" replace /> },
      {
        path: "resources",
        lazy: async () => {
          const { AdminResourcesPage } = await import("./partials/AdminResourcesPage")
          return { Component: AdminResourcesPage }
        },
      },
      {
        path: "accounts/:accountId/resources",
        lazy: async () => {
          const { AccountResourcesPage } = await import("./partials/AccountResourcesPage")
          return { Component: AccountResourcesPage }
        },
      },
      {
        path: "services",
        lazy: async () => {
          const { ServicesPage } = await import("./partials/ServicesPage")
          return { Component: ServicesPage }
        },
      },
      {
        path: "users/:userId",
        lazy: async () => {
          const { AdminUserProfilePage } = await import("./partials/AdminUserProfilePage")
          return { Component: AdminUserProfilePage }
        },
      },
      {
        path: "availability-zones",
        lazy: async () => {
          const { AvailabilityZonesPage } = await import("./partials/AvailabilityZonesPage")
          return { Component: AvailabilityZonesPage }
        },
      },
      {
        path: "pve-nodes",
        lazy: async () => {
          const { PVENodesPage } = await import("./partials/PVENodesPage")
          return { Component: PVENodesPage }
        },
      },
      {
        path: "pve-nodes/new",
        lazy: async () => {
          const { PVENodeFormPage } = await import("./partials/PVENodeFormPage")
          return { Component: PVENodeFormPage }
        },
      },
      {
        // Clicking a node opens its live graphs; editing is a step in from here.
        path: "pve-nodes/:id",
        lazy: async () => {
          const { PVENodeDetailPage } = await import("./partials/PVENodeDetailPage")
          return { Component: PVENodeDetailPage }
        },
      },
      {
        path: "pve-nodes/:id/edit",
        lazy: async () => {
          const { PVENodeFormPage } = await import("./partials/PVENodeFormPage")
          return { Component: PVENodeFormPage }
        },
      },
      {
        path: "proxmox-manager",
        lazy: async () => {
          const { ProxmoxManagerPage } = await import("./partials/ProxmoxManagerPage")
          return { Component: ProxmoxManagerPage }
        },
      },
      {
        path: "load-balancers",
        lazy: async () => {
          const { LoadBalancersAdminPage } = await import("./partials/LoadBalancersAdminPage")
          return { Component: LoadBalancersAdminPage }
        },
      },
      {
        path: "images",
        lazy: async () => {
          const { ImagesPage } = await import("./partials/ImagesPage")
          return { Component: ImagesPage }
        },
      },
      {
        path: "images/:imageId/versions",
        lazy: async () => {
          const { ImageVersionsPage } = await import("./partials/ImageVersionsPage")
          return { Component: ImageVersionsPage }
        },
      },
      {
        path: "vm-prices",
        lazy: async () => {
          const { VMPricesPage } = await import("./partials/VMPricesPage")
          return { Component: VMPricesPage }
        },
      },
      {
        path: "vm-prices/new",
        lazy: async () => {
          const { VMPriceFormPage } = await import("./partials/VMPriceFormPage")
          return { Component: VMPriceFormPage }
        },
      },
      {
        path: "vm-prices/:id/edit",
        lazy: async () => {
          const { VMPriceFormPage } = await import("./partials/VMPriceFormPage")
          return { Component: VMPriceFormPage }
        },
      },
      {
        path: "storage-prices",
        lazy: async () => {
          const { StoragePricesPage } = await import("./partials/StoragePricesPage")
          return { Component: StoragePricesPage }
        },
      },
      {
        path: "static-ips",
        lazy: async () => {
          const { StaticIPsPage } = await import("./partials/StaticIPsPage")
          return { Component: StaticIPsPage }
        },
      },
      {
        // Inside one block: every address it contains, allocated or not, and the
        // controls to hold addresses back from tenant allocation.
        path: "static-ips/pools/:poolId",
        lazy: async () => {
          const { PoolDetailPage } = await import("./partials/PoolDetailPage")
          return { Component: PoolDetailPage }
        },
      },
      // Legacy path → the redesigned Static IPs hub (pools + usage + pricing).
      {
        path: "static-ip-prices",
        element: <Navigate to="/admin/static-ips" replace />,
      },
      {
        // Campaigns: what a code grants, how far it may spread, and who used it.
        // Under pricing rather than platform because a promo code is a price
        // decision — it is the same money the price tables set, given away.
        path: "promo-codes",
        lazy: async () => {
          const { PromoCodesPage } = await import("./partials/PromoCodesPage")
          return { Component: PromoCodesPage }
        },
      },
      {
        path: "bandwidth-prices",
        lazy: async () => {
          const { BandwidthPricesPage } = await import("./partials/BandwidthPricesPage")
          return { Component: BandwidthPricesPage }
        },
      },
      {
        path: "cache",
        lazy: async () => {
          const { CachePage } = await import("./partials/CachePage")
          return { Component: CachePage }
        },
      },
      {
        // The KYC and permission gates on resource creation, flipped at
        // runtime instead of by redeploy.
        path: "platform-settings",
        lazy: async () => {
          const { PlatformSettingsPage } = await import("./partials/PlatformSettingsPage")
          return { Component: PlatformSettingsPage }
        },
      },
      {
        // Which email domains may open an account, and what signup does with a
        // plus-addressed alias. Kept off the platform-policy page: those two
        // gates are DB switches, this one is a folder of lists in S3.
        path: "email-policy",
        lazy: async () => {
          const { EmailPolicyPage } = await import("./partials/EmailPolicyPage")
          return { Component: EmailPolicyPage }
        },
      },
      {
        // Support tickets and quota requests are one queue from the operator's
        // side: both are somebody waiting on a decision.
        path: "requests",
        lazy: async () => {
          const { RequestsPage } = await import("./partials/RequestsPage")
          return { Component: RequestsPage }
        },
      },
      // Quota increases are support tickets now — there is no queue of their own
      // to land on, so the old path joins the tickets one.
      { path: "quota-requests", element: <Navigate to="/admin/requests" replace /> },
      { path: "support", element: <Navigate to="/admin/requests" replace /> },
      {
        path: "support/:id",
        lazy: async () => {
          const { AdminSupportTicketDetailPage } =
            await import("./partials/AdminSupportTicketDetailPage")
          return { Component: AdminSupportTicketDetailPage }
        },
      },
    ],
  },
]
