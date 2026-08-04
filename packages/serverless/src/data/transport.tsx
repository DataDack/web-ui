import { createContext, useContext, useMemo, type ReactNode } from "react"

import type {
  ArtifactRef,
  CreateFromPackageInput,
  CreateFromSourceInput,
  CreatedFunction,
  FunctionAlias,
  FunctionEntity,
  FunctionVersion,
  InvokeResult,
  PutAliasInput,
  RuntimeInfo,
  Trigger,
  UpdateFunctionConfigInput,
} from "./types"

/**
 * How the shared serverless UI reaches a control plane.
 *
 * The two consoles do NOT talk to the same API, which is the whole reason this
 * seam exists rather than a hardcoded client:
 *
 *   - serverless-web talks straight to the FaaS control plane (`/v1/runtimes`,
 *     `/v1/functions/source`) with an operator credential from localStorage.
 *   - cloud-react goes through cloud-be-go's gateway
 *     (`/api/v1/serverless/functions/runtimes`), which is region-scoped,
 *     account-scoped, envelope-wrapped and cookie-authenticated.
 *
 * Different paths, different auth, different response shapes. Injecting the
 * transport keeps every one of those concerns in the app that owns it, and
 * leaves this package free of axios, tokens and region state.
 *
 * Each method resolves to the domain type; unwrapping envelopes and validating
 * payloads is the implementer's job, because only it knows the shape its API
 * returns.
 */
export interface ServerlessTransport {
  /** The runtime catalog. */
  listRuntimes: () => Promise<RuntimeInfo[]>
  /** Create by having the control plane zip inline source. */
  createFromSource: (input: CreateFromSourceInput) => Promise<CreatedFunction>
  /**
   * Create from an uploaded archive or a container image. Omit when the console
   * has no such flow — `capabilities` below is what hides the UI for it, and
   * calling an absent method is a programming error, not a runtime path.
   */
  createFromPackage?: (input: CreateFromPackageInput) => Promise<CreatedFunction>
  /** Upload a .zip and return its artifact-store reference. */
  uploadArtifact?: (file: File) => Promise<ArtifactRef>
  /**
   * One function, by name. Omit when the console has no detail surface —
   * `capabilities.functionRead` is what hides the page, and calling an absent
   * method is a programming error, not a runtime path. The same rule applies
   * to every optional method below.
   */
  getFunction?: (name: string) => Promise<FunctionEntity>
  /** Published versions of a function, unwrapped from the native keyed list. */
  listVersions?: (name: string) => Promise<FunctionVersion[]>
  /** Aliases of a function, unwrapped from the native keyed list. */
  listAliases?: (name: string) => Promise<FunctionAlias[]>
  /** Create or update an alias — the control plane upserts by name. */
  putAlias?: (name: string, input: PutAliasInput) => Promise<FunctionAlias>
  /** Delete one alias of a function. */
  deleteAlias?: (name: string, alias: string) => Promise<void>
  /** Delete the function itself. */
  deleteFunction?: (name: string) => Promise<void>
  /**
   * Synchronously invoke with a raw payload and report what came back —
   * status, timing, body, and whatever invoke metadata the console's path can
   * observe (the optional `InvokeResult` fields stay absent when it cannot).
   */
  invokeFunction?: (name: string, payload: string) => Promise<InvokeResult>
  /** Event-source triggers wired to a function, unwrapped from the keyed list. */
  listTriggers?: (functionName: string) => Promise<Trigger[]>
  /**
   * In-place config update (PATCH /v1/functions/{name}); does not mint a
   * version. Send only the keys being changed — the backend rejects unknown
   * ones.
   */
  updateFunctionConfig?: (name: string, patch: UpdateFunctionConfigInput) => Promise<FunctionEntity>
}

/**
 * Which creation paths this console can actually offer.
 *
 * Derived from the transport rather than declared twice: a console that cannot
 * upload an archive has no `uploadArtifact`, and the Package step should not
 * show an option that dead-ends. Both can be forced off — cloud-react may want
 * to hide the image path for a tenant even though the gateway supports it.
 */
export interface ServerlessCapabilities {
  /** Offer "upload a .zip". Requires `uploadArtifact` + `createFromPackage`. */
  zipUpload: boolean
  /** Offer "container image". Requires `createFromPackage`. */
  containerImage: boolean
  /** Offer "start from a template". Always available — it needs no upload. */
  blankTemplate: boolean
  /** Show the function detail surface. Requires `getFunction`. */
  functionRead: boolean
  /** Show the Versions tab. Requires `listVersions`. */
  versions: boolean
  /** Show the Aliases tab. Requires `listAliases`. */
  aliases: boolean
  /** Offer alias create/edit/delete. Requires `putAlias` + `deleteAlias`. */
  aliasWrite: boolean
  /** Show the Test tab. Requires `invokeFunction`. */
  invoke: boolean
  /** Offer function deletion. Requires `deleteFunction`. */
  functionDelete: boolean
  /** Show the triggers section. Requires `listTriggers`. */
  triggers: boolean
  /** Offer configuration editing. Requires `updateFunctionConfig`. */
  configEdit: boolean
}

export interface ServerlessContextValue {
  transport: ServerlessTransport
  capabilities: ServerlessCapabilities
  /**
   * Validates a function name, returning a message when it is unacceptable.
   * Injected because the rule is not the same in both consoles: cloud-react
   * enforces the account's governance naming policy, serverless-web a fixed
   * pattern.
   */
  validateName?: (name: string) => string | undefined
}

const ServerlessContext = createContext<ServerlessContextValue | null>(null)

export interface ServerlessProviderProps {
  transport: ServerlessTransport
  /** Overrides; anything omitted is inferred from the transport's methods. */
  capabilities?: Partial<ServerlessCapabilities>
  validateName?: (name: string) => string | undefined
  children: ReactNode
}

/**
 * Supplies the transport the shared serverless components fetch through. Wrap
 * once, high in each console's tree (inside its QueryClientProvider).
 */
export function ServerlessProvider({
  transport,
  capabilities,
  validateName,
  children,
}: Readonly<ServerlessProviderProps>) {
  const value = useMemo<ServerlessContextValue>(() => {
    const canPackage = typeof transport.createFromPackage === "function"
    return {
      transport,
      validateName,
      capabilities: {
        zipUpload: canPackage && typeof transport.uploadArtifact === "function",
        containerImage: canPackage,
        blankTemplate: true,
        functionRead: typeof transport.getFunction === "function",
        versions: typeof transport.listVersions === "function",
        aliases: typeof transport.listAliases === "function",
        aliasWrite:
          typeof transport.putAlias === "function" &&
          typeof transport.deleteAlias === "function",
        invoke: typeof transport.invokeFunction === "function",
        functionDelete: typeof transport.deleteFunction === "function",
        triggers: typeof transport.listTriggers === "function",
        configEdit: typeof transport.updateFunctionConfig === "function",
        ...capabilities,
      },
    }
  }, [transport, capabilities, validateName])

  return <ServerlessContext.Provider value={value}>{children}</ServerlessContext.Provider>
}

export function useServerlessContext(): ServerlessContextValue {
  const ctx = useContext(ServerlessContext)
  if (!ctx) {
    throw new Error("useServerlessContext must be used within a <ServerlessProvider>")
  }
  return ctx
}
