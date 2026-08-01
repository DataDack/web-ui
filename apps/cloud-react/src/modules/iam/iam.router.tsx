import { Navigate, type RouteObject } from "react-router-dom"

export const iamRoutes: RouteObject[] = [
  { path: "iam", element: <Navigate to="/iam/users" replace /> },
  {
    path: "iam/users",
    lazy: async () => {
      const { UsersListPage } = await import("./partials/UsersListPage")
      return { Component: UsersListPage }
    },
  },
  {
    path: "iam/users/:id",
    lazy: async () => {
      const { UserDetailPage } = await import("./partials/UserDetailPage")
      return { Component: UserDetailPage }
    },
  },
  {
    path: "iam/roles",
    lazy: async () => {
      const { RolesListPage } = await import("./partials/RolesListPage")
      return { Component: RolesListPage }
    },
  },
  {
    path: "iam/roles/:id",
    lazy: async () => {
      const { RoleDetailPage } = await import("./partials/RoleDetailPage")
      return { Component: RoleDetailPage }
    },
  },
  {
    path: "iam/policies",
    lazy: async () => {
      const { PoliciesListPage } = await import("./partials/PoliciesListPage")
      return { Component: PoliciesListPage }
    },
  },
  {
    // before :id so "new" is not captured as a policy id
    path: "iam/policies/new",
    lazy: async () => {
      const { CreatePolicyPage } = await import("./partials/CreatePolicyPage")
      return { Component: CreatePolicyPage }
    },
  },
  {
    path: "iam/policies/:id",
    lazy: async () => {
      const { PolicyDetailPage } = await import("./partials/PolicyDetailPage")
      return { Component: PolicyDetailPage }
    },
  },
  {
    path: "iam/groups",
    lazy: async () => {
      const { GroupsListPage } = await import("./partials/GroupsListPage")
      return { Component: GroupsListPage }
    },
  },
  {
    // before :id so "new" is not captured as a group id
    path: "iam/groups/new",
    lazy: async () => {
      const { CreateGroupPage } = await import("./partials/CreateGroupPage")
      return { Component: CreateGroupPage }
    },
  },
  {
    path: "iam/groups/:id",
    lazy: async () => {
      const { GroupDetailPage } = await import("./partials/GroupDetailPage")
      return { Component: GroupDetailPage }
    },
  },
  {
    // Invitations were folded into the Users page as a tab; keep the old
    // path working by redirecting to that tab.
    path: "iam/invitations",
    element: <Navigate to="/iam/users?tab=invitations" replace />,
  },
  {
    // The invite form is now a dialog on the Users page; ?invite=1 opens it.
    path: "iam/invitations/new",
    element: <Navigate to="/iam/users?tab=invitations&invite=1" replace />,
  },
  {
    path: "iam/permissions",
    lazy: async () => {
      const { PermissionsCatalogPage } = await import("./partials/PermissionsCatalogPage")
      return { Component: PermissionsCatalogPage }
    },
  },
  {
    path: "iam/api-keys",
    element: <Navigate to="/iam/users" replace />,
  },
]

/** Public (no shell / no auth) — the invite token is the credential. */
export const iamPublicRoutes: RouteObject[] = [
  {
    path: "invite/accept",
    lazy: async () => {
      const { AcceptInvitePage } = await import("./partials/AcceptInvitePage")
      return { Component: AcceptInvitePage }
    },
  },
]
