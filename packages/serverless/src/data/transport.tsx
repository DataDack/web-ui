import { createContext, useContext, useMemo, type ReactNode } from "react"

import type {
  ArtifactRef,
  CreateFromPackageInput,
  CreateFromSourceInput,
  CreatedFunction,
  RuntimeInfo,
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
