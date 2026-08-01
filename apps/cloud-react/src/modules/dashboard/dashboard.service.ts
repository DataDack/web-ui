import { serviceHealthApi } from "./serviceHealth.api"

export const dashboardService = {
    fetchServiceHealth: () => serviceHealthApi.get(),
}
