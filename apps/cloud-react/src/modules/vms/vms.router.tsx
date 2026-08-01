import { Navigate, type RouteObject } from "react-router-dom"

// All compute services live under /compute/*. Bare /compute redirects to the
// overview landing; virtual machines are surfaced under /compute/instances.
export const vmsRoutes: RouteObject[] = [
    {
        path: "compute",
        element: <Navigate to="/compute/overview" replace />,
    },
    {
        path: "compute/overview",
        lazy: async () => {
            const { ComputeOverviewPage } = await import("./partials/ComputeOverviewPage")
            return { Component: ComputeOverviewPage }
        },
    },
    {
        path: "compute/instances",
        lazy: async () => {
            const { VmsListPage } = await import("./partials/VmsListPage")
            return { Component: VmsListPage }
        },
    },
    {
        // System images (AMIs) catalog — read-only browse of the public images
        // available when launching an instance.
        path: "compute/images",
        lazy: async () => {
            const { ImagesListPage } = await import("./partials/ImagesListPage")
            return { Component: ImagesListPage }
        },
    },
    {
        path: "compute/instances/create",
        // Full-bleed wizard: hide the service sidebar and center the content.
        handle: { hideSidebar: true },
        lazy: async () => {
            const { VmCreateWizardPage } = await import("./partials/VmCreateWizardPage")
            return { Component: VmCreateWizardPage }
        },
    },
    {
        path: "compute/instances/:id",
        lazy: async () => {
            const { VmDetailPage } = await import("./partials/VmDetailPage")
            return { Component: VmDetailPage }
        },
    },
    {
        // AWS-style "Connect to instance": tabbed chooser (Instance Connect /
        // SSH client / Serial console) that opens the actual terminal in a new tab.
        path: "compute/instances/:id/connect",
        lazy: async () => {
            const { VmConnectPage } = await import("./partials/VmConnectPage")
            return { Component: VmConnectPage }
        },
    },
]

// Browser console/SSH terminal. Mounted OUTSIDE the AppShell (no topbar or
// sidebar) so the terminal owns the whole viewport — it opens in its own
// browser tab as a standalone page, like GCE's SSH-in-browser window.
export const vmsConsoleRoutes: RouteObject[] = [
    {
        path: "compute/instances/:id/console",
        lazy: async () => {
            const { InstanceConsolePage } = await import("./partials/InstanceConsolePage")
            return { Component: InstanceConsolePage }
        },
    },
]
