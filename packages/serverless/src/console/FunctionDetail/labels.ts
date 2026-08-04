/**
 * Every user-facing string on the function detail page, as one nested object.
 *
 * The package has no i18n dependency on purpose: serverless-web renders the
 * English defaults below untouched, and cloud-react passes a deep-partial
 * override built from `t()` so its translations flow through the same tree.
 * Interpolated strings are functions so an app can use `t(key, { name })`.
 */

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends (...args: never[]) => unknown
    ? T[K]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K]
}

interface MetricLabel {
  title: string
  unit: string
}

export interface FunctionDetailLabels {
  backLabel: string
  tabs: {
    code: string
    test: string
    monitor: string
    configuration: string
    aliases: string
    versions: string
  }
  notFound: {
    title: (name: string) => string
    description: string
  }
  /** Shown when the transport has no getFunction (no reachable FaaS base). */
  unavailable: {
    title: string
    description: string
  }
  code: {
    title: string
    message: string
  }
  actions: {
    delete: string
  }
  deleteConfirm: {
    title: (name: string) => string
    description: string
    confirmLabel: string
    cancelLabel: string
    typeToConfirm: string
    success: (name: string) => string
  }
  test: {
    payload: string
    template: string
    run: string
    running: string
    response: string
    hint: string
    empty: string
    invalidJson: string
    executedVersion: string
    logs: string
    failed: string
  }
  monitor: {
    blurb: string
    comingSoon: string
    metrics: {
      invocations: MetricLabel
      duration: MetricLabel
      errors: MetricLabel
      throttles: MetricLabel
      concurrent: MetricLabel
      recursive: MetricLabel
      asyncEventAge: MetricLabel
      asyncEvents: MetricLabel
      asyncFailures: MetricLabel
      iteratorAge: MetricLabel
    }
  }
  configuration: {
    nav: {
      general: string
      env: string
      triggers: string
      tags: string
      concurrency: string
      async: string
      functionUrl: string
      permissions: string
      vpc: string
    }
    soon: string
    edit: string
    save: string
    cancel: string
    saved: string
    fields: {
      description: string
      runtime: string
      handler: string
      architecture: string
      memory: string
      timeout: string
      ephemeral: string
      packageType: string
      namespace: string
      region: string
      lastModified: string
      imageUri: string
      reserved: string
      provisioned: string
      maxEventAge: string
      retryAttempts: string
    }
    envEmpty: string
    envHint: string
    envAdd: string
    envRemove: (key: string) => string
    tagsEmpty: string
    tagsHint: string
    triggersEmpty: string
    unreserved: string
    comingSoon: {
      functionUrl: { title: string; message: string }
      permissions: { title: string; message: string }
      vpc: { title: string; message: string }
    }
  }
  versions: {
    columns: {
      version: string
      description: string
      date: string
      codeSize: string
      sha: string
    }
    empty: string
    createAlias: string
    rowActions: string
  }
  aliases: {
    columns: {
      name: string
      version: string
      routing: string
      description: string
    }
    empty: string
    emptyHint: string
    create: string
    edit: string
    save: string
    namePlaceholder: string
    weighted: string
    weight: string
    version: string
    description: string
    deleteTitle: (name: string) => string
    deleteDescription: string
    saved: (name: string) => string
    deleted: (name: string) => string
    rowActions: string
    sameVersion: string
    nameRequired: string
    versionRequired: string
    weightRange: string
  }
  errors: {
    saveFailed: string
    deleteFailed: string
    invokeFailed: string
    loadFailed: string
  }
}

export const DEFAULT_FUNCTION_DETAIL_LABELS: FunctionDetailLabels = {
  backLabel: "Functions",
  tabs: {
    code: "Code",
    test: "Test",
    monitor: "Monitor",
    configuration: "Configuration",
    aliases: "Aliases",
    versions: "Versions",
  },
  notFound: {
    title: (name) => `No function named ${name}`,
    description: "It may have been deleted, or it belongs to another account.",
  },
  unavailable: {
    title: "Function details are unavailable",
    description:
      "This console can’t reach the serverless API for the active region, so function details can’t be shown here.",
  },
  code: {
    title: "Coming soon",
    message:
      "Inline code editing isn’t available yet. Deploy updates through the API or CLI in the meantime.",
  },
  actions: { delete: "Delete" },
  deleteConfirm: {
    title: (name) => `Delete ${name}?`,
    description:
      "This permanently removes the function, its versions and aliases. Invocations will start failing immediately.",
    confirmLabel: "Delete function",
    cancelLabel: "Cancel",
    typeToConfirm: "Type the function name to confirm",
    success: (name) => `Function ${name} deleted`,
  },
  test: {
    payload: "Event",
    template: "Template",
    run: "Test",
    running: "Running…",
    response: "Execution result",
    hint: "Send a test event to see the response here.",
    empty: "(empty response)",
    invalidJson: "The event must be valid JSON.",
    executedVersion: "version",
    logs: "Function logs",
    failed: "The invocation failed",
  },
  monitor: {
    blurb: "Per-function metrics are on the way. Each card below shows what will land here.",
    comingSoon: "Coming soon",
    metrics: {
      invocations: { title: "Invocations", unit: "Count" },
      duration: { title: "Duration", unit: "Milliseconds" },
      errors: { title: "Error count and success rate", unit: "Count / %" },
      throttles: { title: "Throttles", unit: "Count" },
      concurrent: { title: "Concurrent executions", unit: "Count" },
      recursive: { title: "Recursive invocations detected", unit: "Count" },
      asyncEventAge: { title: "Async invocation event age", unit: "Milliseconds" },
      asyncEvents: { title: "Async events received", unit: "Count" },
      asyncFailures: { title: "Async delivery failures", unit: "Count" },
      iteratorAge: { title: "Iterator age", unit: "Milliseconds" },
    },
  },
  configuration: {
    nav: {
      general: "General configuration",
      env: "Environment variables",
      triggers: "Triggers",
      tags: "Tags",
      concurrency: "Concurrency",
      async: "Asynchronous invocation",
      functionUrl: "Function URL",
      permissions: "Permissions",
      vpc: "VPC",
    },
    soon: "Soon",
    edit: "Edit",
    save: "Save",
    cancel: "Cancel",
    saved: "Configuration saved",
    fields: {
      description: "Description",
      runtime: "Runtime",
      handler: "Handler",
      architecture: "Architecture",
      memory: "Memory",
      timeout: "Timeout",
      ephemeral: "Ephemeral storage",
      packageType: "Package type",
      namespace: "Namespace",
      region: "Region",
      lastModified: "Last modified",
      imageUri: "Container image",
      reserved: "Reserved concurrency",
      provisioned: "Provisioned concurrency",
      maxEventAge: "Maximum age of event",
      retryAttempts: "Retry attempts",
    },
    envEmpty: "None set.",
    envHint: "Blank rows are ignored.",
    envAdd: "Add variable",
    envRemove: (key) => (key ? `Remove ${key}` : "Remove variable"),
    tagsEmpty: "No tags.",
    tagsHint: "Tags are stored as the function’s labels.",
    triggersEmpty: "No triggers",
    unreserved: "Not set",
    comingSoon: {
      functionUrl: {
        title: "Function URL",
        message: "A stable HTTPS endpoint for this function isn’t available yet.",
      },
      permissions: {
        title: "Permissions",
        message: "Resource-based policies aren’t available yet.",
      },
      vpc: {
        title: "VPC",
        message: "Attaching this function to a VPC isn’t available yet.",
      },
    },
  },
  versions: {
    columns: {
      version: "Version",
      description: "Description",
      date: "Published",
      codeSize: "Code size",
      sha: "SHA-256",
    },
    empty: "No versions",
    createAlias: "Create alias from this version",
    rowActions: "Version actions",
  },
  aliases: {
    columns: {
      name: "Alias",
      version: "Version",
      routing: "Weighted routing",
      description: "Description",
    },
    empty: "No aliases",
    emptyHint: "Aliases point a stable name at a specific version.",
    create: "Create alias",
    edit: "Edit alias",
    save: "Save alias",
    namePlaceholder: "prod",
    weighted: "Split traffic with a second version",
    weight: "Weight (%)",
    version: "Version",
    description: "Description",
    deleteTitle: (name) => `Delete alias ${name}?`,
    deleteDescription: "Anything invoking through this alias will start failing.",
    saved: (name) => `Alias ${name} saved`,
    deleted: (name) => `Alias ${name} deleted`,
    rowActions: "Alias actions",
    sameVersion: "Pick two different versions",
    nameRequired: "An alias name is required",
    versionRequired: "Pick a version",
    weightRange: "Weight must be between 1 and 99",
  },
  errors: {
    saveFailed: "Could not save the changes",
    deleteFailed: "Could not delete",
    invokeFailed: "Could not invoke the function",
    loadFailed: "Could not load the function",
  },
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function mergeDeep<T extends Record<string, unknown>>(base: T, overrides: unknown): T {
  if (!isPlainObject(overrides)) return base
  const merged: Record<string, unknown> = { ...base }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) continue
    const current = merged[key]
    merged[key] =
      isPlainObject(current) && isPlainObject(value) ? mergeDeep(current, value) : value
  }
  return merged as T
}

/** The defaults with an app's deep-partial overrides folded in. */
export function mergeLabels(overrides?: DeepPartial<FunctionDetailLabels>): FunctionDetailLabels {
  if (!overrides) return DEFAULT_FUNCTION_DETAIL_LABELS
  return mergeDeep(
    DEFAULT_FUNCTION_DETAIL_LABELS as unknown as Record<string, unknown>,
    overrides,
  ) as unknown as FunctionDetailLabels
}
