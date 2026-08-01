import { servicesApi } from "./services.api"

export const servicesService = {
    fetchHealth: () => servicesApi.getHealth(),
}
