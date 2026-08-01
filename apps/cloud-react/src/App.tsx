import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom"

import { AppShell } from "@/components/console"
import { accountsRoutes } from "@/modules/accounts/accounts.router"
import { authRoutes } from "@/modules/auth/auth.router"
import { RequireAuth } from "@/modules/auth/components/RequireAuth"
import { autoscalingRoutes } from "@/modules/autoscaling/autoscaling.router"
import { billingRoutes } from "@/modules/billing/billing.router"
import { dashboardRoutes } from "@/modules/dashboard/dashboard.router"
import { disksRoutes } from "@/modules/disks/disks.router"
import { errorRoutes } from "@/modules/errors/errors.router"
import { RouteErrorBoundary } from "@/modules/errors/RouteErrorBoundary"
import { governanceRoutes } from "@/modules/governance/governance.router"
import { iamPublicRoutes, iamRoutes } from "@/modules/iam/iam.router"
import { kubernetesRoutes } from "@/modules/kubernetes/kubernetes.router"
import { loadBalancersRoutes } from "@/modules/load-balancers/load-balancers.router"
import { managedAppsRoutes } from "@/modules/managed-apps/managed-apps.router"
import { monitoringRoutes } from "@/modules/monitoring/monitoring.router"
import { RequireKyc } from "@/modules/onboarding/components/RequireKyc"
import { onboardingRoutes } from "@/modules/onboarding/onboarding.router"
import { organizationsRoutes } from "@/modules/organizations/organizations.router"
import { resourceGroupsRoutes } from "@/modules/resource-groups/resource-groups.router"
import { serverlessRoutes } from "@/modules/serverless/serverless.router"
import { sshKeysRoutes } from "@/modules/ssh-keys/ssh-keys.router"
import { superadminRoutes } from "@/modules/superadmin/superadmin.router"
import { supportTicketsRoutes } from "@/modules/support-tickets/support-tickets.router"
import { targetGroupsRoutes } from "@/modules/target-groups/target-groups.router"
import { vmsConsoleRoutes, vmsRoutes } from "@/modules/vms/vms.router"
import { vpcRoutes } from "@/modules/vpc/vpc.router"

const router = createBrowserRouter([
  {
    // Pathless layout wrapping the whole tree purely to provide a
    // HydrateFallback for the initial render. The first route is lazy, so on
    // initial load the router is resolving its chunk before React renders;
    // without a HydrateFallback, React Router v7 warns during that window.
    // Renders nothing (the brief lazy-chunk fetch) — same as before, minus the warning.
    HydrateFallback: () => null,
    // Catches render/loader errors and — importantly — failed lazy-chunk
    // imports after a redeploy, reloading once to fetch fresh assets.
    errorElement: <RouteErrorBoundary />,
    children: [
      // Public (no shell): auth + onboarding + invite accept
      ...authRoutes,
      ...onboardingRoutes,
      // Full-screen "create another organization" page — mounted top-level
      // (outside the console shell, like /onboarding) so it takes over the
      // viewport. Only an authenticated, onboarded user creates more orgs.
      {
        path: "organization/new",
        lazy: async () => {
          const { NewOrgWizardPage } =
            await import("@/modules/organizations/partials/NewOrgWizardPage")
          return {
            Component: () => (
              <RequireAuth>
                <RequireKyc>
                  <NewOrgWizardPage />
                </RequireKyc>
              </RequireAuth>
            ),
          }
        },
      },
      ...iamPublicRoutes,
      // Super-admin console — its own shell, gated by RequireSuperAdmin
      ...superadminRoutes,
      // Browser SSH / console terminal — authenticated but shell-less: it
      // opens in its own tab and the terminal owns the full viewport.
      {
        element: (
          <RequireAuth>
            <Outlet />
          </RequireAuth>
        ),
        children: vmsConsoleRoutes,
      },
      // Protected console — requires an authenticated, onboarded user
      // whose account verification is done (or explicitly skipped for
      // this session, see RequireKyc).
      {
        path: "/",
        element: (
          <RequireAuth>
            <RequireKyc>
              <AppShell />
            </RequireKyc>
          </RequireAuth>
        ),
        children: [
          ...dashboardRoutes,
          ...vmsRoutes,
          ...sshKeysRoutes,
          ...loadBalancersRoutes,
          ...targetGroupsRoutes,
          ...autoscalingRoutes,
          ...kubernetesRoutes,
          ...disksRoutes,
          ...iamRoutes,
          ...billingRoutes,
          ...vpcRoutes,
          ...monitoringRoutes,
          ...managedAppsRoutes,
          ...serverlessRoutes,
          ...resourceGroupsRoutes,
          ...supportTicketsRoutes,
          ...accountsRoutes,
          ...governanceRoutes,
          ...organizationsRoutes,
        ],
      },
      // Catch-all 404 — keep last so every unmatched top-level path lands here
      ...errorRoutes,
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
