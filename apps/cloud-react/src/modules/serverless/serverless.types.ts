// Shapes mirror the FaaS control plane's native /v1 responses, which the
// cloud-be-go serverless gateway proxies verbatim inside the platform
// envelope (apps/serverless — the gateway adds auth/KYC/quota gates, never
// remodels the JSON). Unknown extra keys are simply not typed.

export interface CodeArtifact {
    bucket?: string
    key: string
    sha256?: string
    sizeBytes?: number
}

export interface LayerRef {
    name: string
    version: number
    arn?: string
}

export interface FunctionVersion {
    version: string
    versionNumber?: number
    codeSha256?: string
    codeArtifact?: CodeArtifact | null
    createdAt?: string
}

export interface FunctionEntity {
    id: string
    name: string
    namespace?: string
    region?: string
    packageType: string
    imageUri?: string
    runtime?: string
    handler?: string
    architecture?: string
    memorySize?: number
    timeout?: number
    reservedConcurrency?: number
    layers?: LayerRef[]
    env?: Record<string, string>
    state: string
    createdAt?: string
    updatedAt?: string
}

export interface FunctionAlias {
    name: string
    functionVersion: string
    additionalVersionWeights?: Record<string, number>
    description?: string
}

export interface LayerVersion {
    id: string
    name: string
    version: number
    description?: string
    codeArtifact?: CodeArtifact | null
    compatibleRuntimes?: string[]
    compatibleArchitectures?: string[]
    createdAt?: string
}

/** Lifecycle event from the FaaS events webhook, stored per-account. */
export interface ActivityEvent {
    type: string
    function?: string
    region?: string
    at?: string
}
