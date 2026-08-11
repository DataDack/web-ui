import { createContext, useContext, useMemo, type ReactNode } from "react"

import type {
  ArtifactRef,
  CreateFromPackageInput,
  CreateFromSourceInput,
  CreateFunctionUrlInput,
  CreateVersionInput,
  CreatedFunction,
  FunctionAlias,
  FunctionCode,
  FunctionCodeFile,
  FunctionEntity,
  FunctionUrl,
  FunctionVersion,
  InvokeResult,
  LayerVersionSummary,
  MetricSeries,
  MetricSeriesQuery,
  PutAliasInput,
  PutTriggerInput,
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
  /**
   * The hostnames that invoke a function. Omit when the control plane has no
   * function-URL surface; the detail header simply shows nothing.
   */
  listFunctionUrls?: (name: string) => Promise<FunctionUrl[]>
  /**
   * Give a function a hostname. Nothing mints one on deploy — publishing a
   * function to the internet is an explicit act — so this call is the only way
   * a URL appears. Omit `input.domain` to take the platform's generated name.
   */
  createFunctionUrl?: (name: string, input: CreateFunctionUrlInput) => Promise<FunctionUrl>
  /** Release a hostname. The variable is the domain, which is globally unique. */
  deleteFunctionUrl?: (domain: string) => Promise<void>
  /** Versions of a function, unwrapped from the native keyed list. */
  listVersions?: (name: string) => Promise<FunctionVersion[]>
  /**
   * Freeze the function's current state as a new numbered version.
   *
   * Deploying does NOT create a version — it overwrites the newest one in
   * place — so this call is the only thing that grows the list, and after it
   * deploys land on the number it created. That makes a version mean "someone
   * chose to keep this", which is the only thing the number is useful for.
   */
  createVersion?: (name: string, input?: CreateVersionInput) => Promise<FunctionEntity>
  /**
   * Every layer version the account can attach.
   *
   * Needed to offer a picker at all: a function stores layers as
   * {name, version} refs, so without the catalogue the console can only show
   * what is already attached and never add to it.
   */
  listLayers?: () => Promise<LayerVersionSummary[]>
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
   * Add a scheduled trigger. Despite the control plane's name this CREATES —
   * it mints a new id per call rather than upserting — so the console's only
   * offer is add and delete, never edit.
   */
  putTrigger?: (input: PutTriggerInput) => Promise<Trigger>
  /** Remove one trigger by id. */
  deleteTrigger?: (id: string) => Promise<void>
  /**
   * In-place config update (PATCH /v1/functions/{name}); does not mint a
   * version. Send only the keys being changed — the backend rejects unknown
   * ones.
   */
  updateFunctionConfig?: (name: string, patch: UpdateFunctionConfigInput) => Promise<FunctionEntity>
  /**
   * Bucketed metrics for one function. Omit when the control plane behind this
   * console has no metrics surface — `capabilities.metrics` is what turns the
   * Monitor tab's charts back into coming-soon previews.
   */
  getMetricSeries?: (query: MetricSeriesQuery) => Promise<MetricSeries>

  /* ── Inline code editing ───────────────────────────────────────────────
   *
   * Every write here stages into the function's DRAFT archive; only
   * `deployFunctionCodeDraft` turns staged edits into running code. The four
   * mutating methods all resolve to the refreshed `FunctionCode`, so the
   * editor never needs a follow-up read to learn the new digest or draft
   * stamp.
   */

  /** The package tree plus whether it can be edited at all, and why not. */
  getFunctionCode?: (name: string) => Promise<FunctionCode>
  /** One file's contents, from the draft when one exists. */
  getFunctionCodeFile?: (name: string, path: string) => Promise<FunctionCodeFile>
  /** Stage a file write into the draft archive. */
  putFunctionCodeFile?: (name: string, path: string, content: string) => Promise<FunctionCode>
  /** Stage a file deletion into the draft archive. */
  deleteFunctionCodeFile?: (name: string, path: string) => Promise<FunctionCode>
  /** Throw the draft away and return to the deployed package. */
  discardFunctionCodeDraft?: (name: string) => Promise<FunctionCode>
  /**
   * Deploy the draft onto the function's working version, overwriting it in
   * place — this does NOT mint a version, `createVersion` is what does.
   * `baseSha256` is the deployed digest the session started from: sending it
   * makes the deploy a compare-and-swap (409 CodeStale when another deploy
   * landed underneath), omitting it opts out and last-write-wins.
   */
  deployFunctionCodeDraft?: (name: string, baseSha256?: string) => Promise<FunctionEntity>
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
  /** Offer "create version". Requires `createVersion`. */
  versionWrite: boolean
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
  /**
   * Offer adding and removing triggers. Requires `putTrigger` + `deleteTrigger`
   * — a console with only the add half would let someone schedule a function
   * they could not then unschedule.
   */
  triggerWrite: boolean
  /**
   * Offer creating and releasing function URLs. Requires `createFunctionUrl` +
   * `deleteFunctionUrl` — a console with only the create half would hand out a
   * public hostname nobody could take back.
   */
  functionUrlWrite: boolean
  /** Offer configuration editing. Requires `updateFunctionConfig`. */
  configEdit: boolean
  /**
   * Offer attaching and detaching layers. Requires `listLayers` +
   * `updateFunctionConfig` — a picker with no catalogue could only remove.
   */
  layerAttach: boolean
  /** Chart the Monitor tab from real data. Requires `getMetricSeries`. */
  metrics: boolean
  /** Show the inline code editor. Requires `getFunctionCode` + `getFunctionCodeFile`. */
  codeRead: boolean
  /**
   * Let the editor write. Requires all four mutating code methods — a console
   * with only some of them would offer a Save that cannot be deployed.
   */
  codeEdit: boolean
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
        versionWrite: typeof transport.createVersion === "function",
        aliases: typeof transport.listAliases === "function",
        aliasWrite:
          typeof transport.putAlias === "function" && typeof transport.deleteAlias === "function",
        invoke: typeof transport.invokeFunction === "function",
        functionDelete: typeof transport.deleteFunction === "function",
        triggers: typeof transport.listTriggers === "function",
        triggerWrite:
          typeof transport.putTrigger === "function" &&
          typeof transport.deleteTrigger === "function",
        functionUrlWrite:
          typeof transport.createFunctionUrl === "function" &&
          typeof transport.deleteFunctionUrl === "function",
        configEdit: typeof transport.updateFunctionConfig === "function",
        layerAttach:
          typeof transport.listLayers === "function" &&
          typeof transport.updateFunctionConfig === "function",
        metrics: typeof transport.getMetricSeries === "function",
        codeRead:
          typeof transport.getFunctionCode === "function" &&
          typeof transport.getFunctionCodeFile === "function",
        codeEdit:
          typeof transport.putFunctionCodeFile === "function" &&
          typeof transport.deleteFunctionCodeFile === "function" &&
          typeof transport.discardFunctionCodeDraft === "function" &&
          typeof transport.deployFunctionCodeDraft === "function",
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
