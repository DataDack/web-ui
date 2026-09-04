import type { RouteObject } from "react-router-dom"

export const vpcRoutes: RouteObject[] = [
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
    path: "networking/routers",
    lazy: async () => {
      const { RoutersPage } = await import("./partials/RoutersPage")
      return { Component: RoutersPage }
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
    path: "networking/vpn",
    lazy: async () => {
      const { VpnPage } = await import("./partials/VpnPage")
      return { Component: VpnPage }
    },
  },
  {
    path: "networking/api-gateway",
    lazy: async () => {
      const { APIGatewayListPage } = await import("./api-gateway/APIGatewayListPage")
      return { Component: APIGatewayListPage }
    },
  },
  {
    path: "networking/api-gateway/create",
    handle: { hideSidebar: true },
    lazy: async () => {
      const { APIGatewayCreatePage } = await import("./api-gateway/APIGatewayCreatePage")
      return { Component: APIGatewayCreatePage }
    },
  },
  {
    path: "networking/api-gateway/:id",
    lazy: async () => {
      const { APIGatewayDetailPage } = await import("./api-gateway/APIGatewayDetailPage")
      return { Component: APIGatewayDetailPage }
    },
  },
]
