import { SERVICE_REGISTRY } from "./services.constants"
import type { ServicesHealth } from "./services.types"

const delay = (ms = 300) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * Returns live health status merged over the static registry.
 * In production this would be a real polling endpoint.
 */
export const servicesApi = {
  getHealth: async (): Promise<ServicesHealth> => {
    await delay()

    const services: ServicesHealth["services"] = {}

    for (const [id, svc] of Object.entries(SERVICE_REGISTRY)) {
      const subServices: Record<
        string,
        {
          status: typeof svc.status
          maintenance?: NonNullable<(typeof svc.subServices)[number]["maintenance"]>
        }
      > = {}

      for (const sub of svc.subServices) {
        subServices[sub.id] = {
          status: sub.status,
          maintenance: sub.maintenance,
        }
      }

      services[id] = {
        status: svc.status,
        maintenance: svc.maintenance,
        subServices,
      }
    }

    return { services, updatedAt: new Date().toISOString() }
  },
}
