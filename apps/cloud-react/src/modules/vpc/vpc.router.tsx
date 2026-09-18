import { Navigate, type RouteObject } from "react-router-dom"

export const vpcRoutes: RouteObject[] = [
  {
    path: "networking/routing",
    lazy: async () => {
      const { RoutingPage } = await import("./partials/RoutingPage")
      return { Component: RoutingPage }
    },
  },
  // Routers and route tables were separate nav entries until they merged into
  // one Routing page; both old paths stay linkable.
  {
    path: "networking/route-tables",
    element: <Navigate to="/networking/routing" replace />,
  },
  {
    path: "networking/routers",
    element: <Navigate to="/networking/routing?tab=routers" replace />,
  },
  {
    path: "networking/route-tables/:id",
    lazy: async () => {
      const { RouteTableDetailPage } = await import("./partials/RouteTableDetailPage")
      return { Component: RouteTableDetailPage }
    },
  },
  {
    path: "networking",
    lazy: async () => {
      const { VpcListPage } = await import("./partials/VpcListPage")
      return { Component: VpcListPage }
    },
  },
  {
    path: "networking/create",
    handle: { hideSidebar: true },
    lazy: async () => {
      const { VpcCreateWizardPage } = await import("./partials/VpcCreateWizardPage")
      return { Component: VpcCreateWizardPage }
    },
  },
  {
    path: "networking/:id",
    lazy: async () => {
      const { VpcDetailPage } = await import("./partials/VpcDetailPage")
      return { Component: VpcDetailPage }
    },
  },
  {
    path: "networking/subnets",
    lazy: async () => {
      const { SubnetListPage } = await import("./partials/SubnetListPage")
      return { Component: SubnetListPage }
    },
  },
  {
    path: "networking/ip-sets",
    lazy: async () => {
      const { IPSetsPage } = await import("./partials/IPSetsPage")
      return { Component: IPSetsPage }
    },
  },
  {
    path: "networking/ip-sets/:id",
    lazy: async () => {
      const { IPSetDetailPage } = await import("./partials/IPSetDetailPage")
      return { Component: IPSetDetailPage }
    },
  },
  {
    path: "networking/static-ips",
    lazy: async () => {
      const { StaticIpsPage } = await import("./partials/StaticIpsPage")
      return { Component: StaticIpsPage }
    },
  },
  {
    path: "networking/network-interfaces",
    lazy: async () => {
      const { NetworkInterfacesPage } = await import("./partials/NetworkInterfacesPage")
      return { Component: NetworkInterfacesPage }
    },
  },
  {
    path: "networking/security-groups",
    lazy: async () => {
      const { SecurityGroupsListPage } = await import("./partials/SecurityGroupsListPage")
      return { Component: SecurityGroupsListPage }
    },
  },
  {
    path: "networking/security-groups/create",
    handle: { hideSidebar: true },
    lazy: async () => {
      const { SecurityGroupCreatePage } = await import("./partials/SecurityGroupCreatePage")
      return { Component: SecurityGroupCreatePage }
    },
  },
  {
    path: "networking/security-groups/:id",
    lazy: async () => {
      const { SecurityGroupDetailPage } = await import("./partials/SecurityGroupDetailPage")
      return { Component: SecurityGroupDetailPage }
    },
  },
  {
    path: "networking/internet-gateways",
    lazy: async () => {
      const { InternetGatewaysPage } = await import("./partials/InternetGatewaysPage")
      return { Component: InternetGatewaysPage }
    },
  },
  {
    path: "networking/nat-gateways",
    lazy: async () => {
      const { NatGatewaysPage } = await import("./partials/NatGatewaysPage")
      return { Component: NatGatewaysPage }
    },
  },
  {
    path: "networking/reachability",
    lazy: async () => {
      const { ReachabilityPage } = await import("./partials/ReachabilityPage")
      return { Component: ReachabilityPage }
    },
  },
  {
    path: "networking/peerings",
    lazy: async () => {
      const { VpcPeeringsPage } = await import("./partials/VpcPeeringsPage")
      return { Component: VpcPeeringsPage }
    },
  },
  {
    path: "networking/vpn",
    lazy: async () => {
      const { VpnPage } = await import("./partials/VpnPage")
      return { Component: VpnPage }
    },
  },
  {
    path: "networking/ipsec",
    lazy: async () => {
      const { IpsecComingSoon } = await import("./partials/IpsecComingSoon")
      return { Component: IpsecComingSoon }
    },
  },
]
