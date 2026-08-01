import { emptyListener, type FormValues } from "./schema"

/**
 * Starting shapes for the wizard.
 *
 * Almost every first load balancer is "put HTTP in front of my two web boxes".
 * Making that a one-click starting point collapses the listener and target steps
 * into a confirmation, and leaves the blank option for people who know what they
 * want instead.
 */
export type PresetId = "web" | "tcp" | "blank"

export const PRESET_IDS: PresetId[] = ["web", "tcp", "blank"]

/** The empty form, before any preset is applied. */
export function defaultFormValues(): FormValues {
  return applyPreset("web")
}

export function applyPreset(preset: PresetId): FormValues {
  const base: FormValues = {
    name: "",
    type: "application",
    scheme: "internet_facing",
    billing_cycle: "hourly",
    resource_group_id: "",
    vpcs: [{ vpc_id: "", subnet_ids: [] }],
    security_group_ids: [],
    listeners: [],
  }

  switch (preset) {
    case "web":
      return {
        ...base,
        type: "application",
        listeners: [emptyListener("HTTP", 80, 8080)],
      }
    case "tcp":
      return {
        ...base,
        type: "network",
        // A TCP service has no HTTP path to probe, so the check is a plain
        // connect — the renderer reads no path in tcp mode.
        listeners: [emptyListener("TCP", 8080, 8080)],
      }
    case "blank":
      return base
  }
}
