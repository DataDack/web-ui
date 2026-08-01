/**
 * The public image catalog, as a frontend constant.
 *
 * Deliberately static for M1: nothing here is deployable yet, so a backend
 * catalog endpoint would be an API for a list nobody can act on. When n8n goes
 * GA (M3) this moves to S3 system_data behind a catalog endpoint, the same
 * pattern the plans catalogue uses — the shape below is written to survive
 * that move unchanged.
 */

export type ImageAvailability = "coming_soon" | "planned"

export interface CatalogImage {
  /** Stable identity; becomes the backend `project_type` when it ships. */
  slug: string
  name: string
  category: string
  description: string
  /** Short human-readable resource facts, shown as chips. Empty until specced. */
  specs: string[]
  availability: ImageAvailability
}

export const IMAGE_CATALOG: CatalogImage[] = [
  {
    slug: "n8n",
    name: "n8n",
    category: "Workflow automation",
    description:
      "Connect 500+ apps and automate workflows with a visual editor. We provision, run and upgrade the instance; you get a URL on your subdomain.",
    specs: ["1 vCPU · 2 GB", "10 GB disk", "VPC optional"],
    availability: "coming_soon",
  },
  {
    slug: "ghost",
    name: "Ghost",
    category: "Publishing",
    description: "A newsletter and membership publishing platform.",
    specs: [],
    availability: "planned",
  },
  {
    slug: "uptime-kuma",
    name: "Uptime Kuma",
    category: "Monitoring",
    description: "Self-hosted uptime monitoring with status pages.",
    specs: [],
    availability: "planned",
  },
  {
    slug: "grafana",
    name: "Grafana",
    category: "Dashboards",
    description: "Dashboards and visualisation for your metrics.",
    specs: [],
    availability: "planned",
  },
]
