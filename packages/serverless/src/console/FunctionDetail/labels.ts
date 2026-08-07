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
    /** The card shown when this console cannot reach the code API at all. */
    title: string
    message: string
    toolbar: {
      save: string
      saving: string
      deploy: string
      deploying: string
      discard: string
      /** Badge on the toolbar while a draft exists. */
      draft: string
      /** e.g. "edited 2 minutes ago" — the app supplies the relative time. */
      draftSince: (relative: string) => string
      deployed: string
      unsaved: (count: number) => string
      readOnly: string
      /** Accessible name for a file tab's close button. */
      close: string
    }
    tree: {
      heading: string
      filter: string
      newFile: string
      newFolder: string
      rename: string
      delete: string
      binary: string
      empty: string
      noMatches: string
    }
    dialogs: {
      cancel: string
      newFile: { title: string; label: string; placeholder: string; confirm: string }
      newFolder: { title: string; label: string; hint: string; confirm: string }
      rename: { title: string; label: string; confirm: string }
      deleteFile: { title: (path: string) => string; description: string; confirm: string }
      discard: { title: string; description: string; confirm: string }
      /** Another deploy landed while this draft was open. */
      stale: { title: string; description: string; reload: string; overwrite: string }
    }
    status: {
      position: (line: number, column: number) => string
      encoding: string
      readOnly: string
    }
    /** Placeholder for a file the editor refuses to open as text. */
    binaryFile: string
    /** Placeholder when no file is open. */
    noFileOpen: string
    /** One entry per control-plane reason a package is not inline-editable. */
    notEditable: {
      title: string
      ImagePackage: string
      NoCodeArtifact: string
      ArchiveMissing: string
      /** The app formats the limit; the package passes it pre-formatted. */
      PackageTooLarge: (limit: string) => string
      NotAZipArchive: string
      unknown: string
    }
    errors: {
      loadFailed: string
      openFailed: string
      saveFailed: string
      createFailed: string
      renameFailed: string
      deleteFailed: string
      discardFailed: string
      deployFailed: string
      fileTooLarge: (limit: string) => string
      nothingToDeploy: string
      duplicatePath: string
      invalidPath: string
    }
    toasts: {
      saved: (path: string) => string
      savedAll: (count: number) => string
      created: (path: string) => string
      renamed: (path: string) => string
      deleted: (path: string) => string
      discarded: string
      deployed: (version: string) => string
    }
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
    title: "Code editing is unavailable",
    message:
      "This console can’t reach the code API for this function. Deploy updates through the API or CLI in the meantime.",
    toolbar: {
      save: "Save",
      saving: "Saving…",
      deploy: "Deploy",
      deploying: "Deploying…",
      discard: "Discard",
      draft: "Draft",
      draftSince: (relative) => `edited ${relative}`,
      deployed: "Deployed",
      unsaved: (count) => (count === 1 ? "1 unsaved file" : `${String(count)} unsaved files`),
      readOnly: "Read only",
      close: "Close",
    },
    tree: {
      heading: "Files",
      filter: "Search files",
      newFile: "New file",
      newFolder: "New folder",
      rename: "Rename",
      delete: "Delete",
      binary: "binary",
      empty: "This package has no files.",
      noMatches: "No files match that search.",
    },
    dialogs: {
      cancel: "Cancel",
      newFile: {
        title: "New file",
        label: "File path",
        placeholder: "lib/transform.js",
        confirm: "Create file",
      },
      newFolder: {
        title: "New folder",
        label: "Folder path",
        hint: "A deployment package stores no empty folders, so this creates the folder with a .gitkeep placeholder inside it.",
        confirm: "Create folder",
      },
      rename: { title: "Rename", label: "New path", confirm: "Rename" },
      deleteFile: {
        title: (path) => `Delete ${path}?`,
        description: "The file is removed from the draft. Nothing changes for the deployed function until you deploy.",
        confirm: "Delete file",
      },
      discard: {
        title: "Discard draft?",
        description:
          "Every staged edit is thrown away and the editor returns to the deployed package. This cannot be undone.",
        confirm: "Discard draft",
      },
      stale: {
        title: "This function was deployed elsewhere",
        description:
          "The deployed package changed after this draft was opened. Reload to see what landed, or deploy anyway and replace it.",
        reload: "Reload",
        overwrite: "Deploy anyway",
      },
    },
    status: {
      position: (line, column) => `Ln ${String(line)}, Col ${String(column)}`,
      encoding: "UTF-8",
      readOnly: "Read only",
    },
    binaryFile: "This is a binary file and can’t be shown in the editor.",
    noFileOpen: "Select a file to start editing.",
    notEditable: {
      title: "This package can’t be edited here",
      ImagePackage:
        "The function runs from a container image. Update the image and redeploy to change its code.",
      NoCodeArtifact: "This function has no deployment package to open.",
      ArchiveMissing: "The deployment package is no longer in the artifact store.",
      PackageTooLarge: (limit) =>
        `The deployment package is larger than ${limit}, the inline editing limit. Deploy updates through the API or CLI.`,
      NotAZipArchive: "The deployment package isn’t a zip archive, so it can’t be opened as files.",
      unknown: "The deployment package can’t be opened in the editor.",
    },
    errors: {
      loadFailed: "Could not load the function’s code",
      openFailed: "Could not open the file",
      saveFailed: "Could not save the file",
      createFailed: "Could not create the file",
      renameFailed: "Could not rename the file",
      deleteFailed: "Could not delete the file",
      discardFailed: "Could not discard the draft",
      deployFailed: "Could not deploy the draft",
      fileTooLarge: (limit) => `This file is larger than the ${limit} per-file limit.`,
      nothingToDeploy: "There are no staged edits to deploy.",
      duplicatePath: "A file already exists at that path.",
      invalidPath: "Enter a relative path using forward slashes.",
    },
    toasts: {
      saved: (path) => `Saved ${path}`,
      savedAll: (count) => `Saved ${String(count)} files`,
      created: (path) => `Created ${path}`,
      renamed: (path) => `Renamed to ${path}`,
      deleted: (path) => `Deleted ${path}`,
      discarded: "Draft discarded",
      deployed: (version) => `Deployed version ${version}`,
    },
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
