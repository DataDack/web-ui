import { Navigate, type RouteObject } from "react-router-dom"

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
      { index: true, element: <Navigate to="/admin/users" replace /> },
      {
        path: "organizations",
        lazy: async () => {
          const { OrganizationsPage } = await import("./partials/OrganizationsPage")
          return { Component: OrganizationsPage }
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
        path: "users",
        lazy: async () => {
          const { UsersPage } = await import("./partials/UsersPage")
          return { Component: UsersPage }
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
        path: "pve-nodes/:id/edit",
        lazy: async () => {
          const { PVENodeFormPage } = await import("./partials/PVENodeFormPage")
          return { Component: PVENodeFormPage }
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
      // Legacy path → the redesigned Static IPs hub (pools + usage + pricing).
      {
        path: "static-ip-prices",
        element: <Navigate to="/admin/static-ips" replace />,
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
        path: "quota-requests",
        lazy: async () => {
          const { QuotaRequestsPage } = await import("./partials/QuotaRequestsPage")
          return { Component: QuotaRequestsPage }
        },
      },
      {
        path: "support",
        lazy: async () => {
          const { AdminSupportTicketsPage } = await import("./partials/AdminSupportTicketsPage")
          return { Component: AdminSupportTicketsPage }
        },
      },
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
