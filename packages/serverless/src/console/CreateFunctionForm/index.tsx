import { useEffect, useMemo, useState } from "react"

import { AlertTriangle, Container, FileArchive, Loader2, Rocket, Sparkles } from "lucide-react"

import { Button, Input, Label, css, cx, fontMono, mix } from "@datadack/common-ui"

import { useCreateFromPackage, useCreateFromSource, useRuntimes, useUploadArtifact } from "../../data/queries"
import { templateForFamily } from "../../data/templates"
import { useServerlessContext } from "../../data/transport"
import type { ArtifactRef, PackageType, RuntimeInfo } from "../../data/types"
import { RuntimeCatalog } from "../RuntimeCatalog"
import { EnvEditor, type EnvRow } from "./EnvEditor"
import { PackageOptionCard } from "./PackageOptionCard"
import { SummaryPanel } from "./SummaryPanel"

/** file.function — the shape every runtime the platform offers expects. */
const HANDLER_SHAPE = /^[\w./-]+\.\w+$/

/** registry/repository[:tag|@sha256:…]. Loose: the registry is the authority. */
const IMAGE_URI_SHAPE = /^[\w.-]+(?::\d+)?\/[\w./-]+(?::[\w.-]+|@sha256:[a-f0-9]{64})?$/

/** Human labels for the summary panel, keyed by package choice. */
const PACKAGE_LABELS: Record<PackageType, string> = {
  zip: "Zip archive",
  image: "Container image",
  blank: "Blank starter",
}

const page = css`
  display: grid;
  gap: 32px;
  align-items: start;
  grid-template-columns: minmax(0, 1fr);

  @media (min-width: 1024px) {
    grid-template-columns: minmax(0, 1fr) 320px;
  }
`

const form = css`
  display: flex;
  flex-direction: column;
  gap: 28px;
  min-width: 0;
`

const aside = css`
  @media (min-width: 1024px) {
    position: sticky;
    top: 24px;
  }
`

const block = css`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const blockHead = css`
  & > h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
  }
  & > p {
    margin: 2px 0 0;
    font-size: 13px;
    color: var(--muted-foreground);
  }
`

const optionGrid = css`
  display: grid;
  gap: 12px;
  grid-template-columns: minmax(0, 1fr);

  @media (min-width: 640px) {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }
`

const fieldRow = css`
  display: grid;
  gap: 20px;
  border-radius: 0.75rem;
  border: 1px solid ${mix("--border", 60)};
  padding: 16px;
  grid-template-columns: minmax(0, 1fr);

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const field = css`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`

const narrow = css`
  max-width: 32rem;
`

const monoInput = css`
  font-family: ${fontMono};
`

const hint = css`
  margin: 0;
  font-size: 11px;
  color: var(--muted-foreground);
`

const errorText = css`
  margin: 0;
  font-size: 11px;
  color: var(--destructive);
`

const dropzone = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  border-radius: 0.75rem;
  border: 1px dashed ${mix("--border", 90)};
  padding: 32px 16px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.15s ease;

  &:hover {
    border-color: ${mix("--brand-gold", 50)};
  }
`

const dropzoneFilled = css`
  border-color: ${mix("--status-success", 40)};
  background: ${mix("--status-success", 5)};
`

const alert = css`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  border-radius: 0.5rem;
  border: 1px solid ${mix("--destructive", 30)};
  background: ${mix("--destructive", 5)};
  padding: 10px 12px;
  font-size: 12px;
  color: var(--destructive);
`

const warn = css`
  border-color: ${mix("--status-warning", 35)};
  background: ${mix("--status-warning", 8)};
  color: var(--status-warning);
`

const actions = css`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  border-top: 1px solid ${mix("--border", 60)};
  padding-top: 16px;
`

const memoryPresets = css`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding-top: 2px;
`

const presetChip = css`
  border-radius: 0.375rem;
  border: 1px solid ${mix("--border", 60)};
  background: transparent;
  padding: 2px 6px;
  font-family: ${fontMono};
  font-size: 11px;
  color: var(--muted-foreground);
  cursor: pointer;

  &:hover {
    border-color: ${mix("--brand-gold", 40)};
    color: var(--foreground);
  }
`

const presetChipActive = css`
  border-color: ${mix("--brand-gold", 60)};
  background: ${mix("--brand-gold", 10)};
  color: var(--brand-gold);
`

const MEMORY_PRESETS = [128, 256, 512, 1024, 2048]

export interface CreateFunctionFormProps {
  onCreated?: (functionName: string) => void
  onCancel?: () => void
  /** Partitions the query cache — cloud-react passes its active region code. */
  scope?: string
  className?: string
}

/**
 * The one create-a-function form, shared by the console and the FaaS studio.
 *
 * It renders only the creation paths the host console actually has: the
 * capability flags come off the injected transport, so the studio — which has
 * no artifact upload — never shows a zip option that dead-ends. Fetching and
 * submitting go through that same transport, which is why one component can
 * serve two consoles talking to two different APIs.
 */
export function CreateFunctionForm({
  onCreated,
  onCancel,
  scope,
  className,
}: Readonly<CreateFunctionFormProps>) {
  const { capabilities, validateName } = useServerlessContext()
  const runtimes = useRuntimes(scope)
  const createFromSource = useCreateFromSource(scope)
  const createFromPackage = useCreateFromPackage(scope)
  const upload = useUploadArtifact()

  // Default to the richest path this console supports, so the form opens on
  // something the user can actually complete.
  const defaultPackage: PackageType = capabilities.zipUpload ? "zip" : "blank"

  const [name, setName] = useState("")
  const [packageType, setPackageType] = useState<PackageType>(defaultPackage)
  const [imageUri, setImageUri] = useState("")
  const [runtime, setRuntime] = useState<RuntimeInfo | undefined>()
  const [handler, setHandler] = useState("")
  const [handlerTouched, setHandlerTouched] = useState(false)
  const [architecture, setArchitecture] = useState("x86_64")
  const [memorySize, setMemorySize] = useState(128)
  const [timeoutSecs, setTimeoutSecs] = useState(3)
  const [envRows, setEnvRows] = useState<EnvRow[]>([{ key: "", value: "" }])
  const [artifact, setArtifact] = useState<ArtifactRef | null>(null)
  const [artifactName, setArtifactName] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const template = useMemo(() => templateForFamily(runtime?.family), [runtime?.family])

  // The handler default follows the runtime, but only until it is edited —
  // retyping a handler on every runtime click would be hostile.
  useEffect(() => {
    if (!handlerTouched && runtime) setHandler(runtime.handlerFormat)
  }, [runtime, handlerTouched])

  // A runtime that does not offer the selected architecture would submit a
  // combination the control plane rejects.
  useEffect(() => {
    if (runtime && !runtime.architectures.includes(architecture)) {
      setArchitecture(runtime.architectures[0] ?? "x86_64")
    }
  }, [runtime, architecture])

  const runtimeApplies = packageType !== "image"
  const handlerRequired = runtimeApplies && (runtime?.handlerRequired ?? true)

  /** Every reason this form cannot be submitted, keyed by field. */
  const errors = useMemo(() => {
    const found: Record<string, string> = {}

    const nameIssue = validateName?.(name)
    if (name.trim() === "") found.name = "A name is required"
    else if (nameIssue) found.name = nameIssue

    if (packageType === "image") {
      const uri = imageUri.trim()
      if (uri === "") found.imageUri = "Image URI is required"
      else if (!IMAGE_URI_SHAPE.test(uri)) {
        found.imageUri = "Expected registry/repository[:tag] — for example ghcr.io/acme/api:1.0"
      }
      return found
    }

    if (packageType === "zip" && !artifact) found.artifact = "Upload a .zip to continue"

    if (!runtime) {
      found.runtime = "Pick a runtime"
      return found
    }
    if (runtime.deprecatedForCreate) {
      found.runtime = runtime.successorRuntime
        ? `${runtime.name} can no longer be used for a new function — use ${runtime.successorRuntime}`
        : `${runtime.name} can no longer be used for a new function`
    }
    // A bundled-RIC runtime has no inline source to zip, so "start blank"
    // would deploy a placeholder that fails at every invoke.
    if (packageType === "blank" && (runtime.bundledRic || !template)) {
      found.runtime = `${runtime.name} needs a compiled artifact — upload a .zip or use a container image instead of starting blank`
    }
    if (handlerRequired) {
      if (handler.trim() === "") {
        found.handler = `A handler is required — ${runtime.handlerFormat}`
      } else if (!HANDLER_SHAPE.test(handler.trim())) {
        found.handler = "Expected file.function — for example index.handler"
      }
    }
    return found
  }, [
    name,
    validateName,
    packageType,
    imageUri,
    artifact,
    runtime,
    template,
    handler,
    handlerRequired,
  ])

  // Validation runs continuously but is only SHOWN once a submit was tried, so
  // a half-filled form is not shouting at the user.
  const visible = submitted ? errors : {}
  const submitting = createFromSource.isPending || createFromPackage.isPending || upload.isPending

  const envMap = () =>
    Object.fromEntries(
      envRows.filter((entry) => entry.key.trim() !== "").map((e) => [e.key.trim(), e.value]),
    )

  const onFile = (file: File | undefined) => {
    if (!file) return
    setArtifactName(file.name)
    upload.mutate(file, { onSuccess: setArtifact })
  }

  const submit = (event: React.SyntheticEvent) => {
    event.preventDefault()
    setSubmitted(true)
    if (Object.keys(errors).length > 0) return

    const env = envMap()
    const done = { onSuccess: () => onCreated?.(name.trim()) }

    if (packageType === "blank" && runtime && template) {
      createFromSource.mutate(
        {
          name: name.trim(),
          runtime: runtime.name,
          handler: handler.trim() || template.handler,
          architecture,
          memorySize,
          timeout: timeoutSecs,
          env: Object.keys(env).length > 0 ? env : undefined,
          files: template.files,
        },
        done,
      )
      return
    }

    createFromPackage.mutate(
      {
        name: name.trim(),
        packageType: packageType === "image" ? "image" : "zip",
        memorySize,
        timeout: timeoutSecs,
        ...(packageType === "image"
          ? { imageUri: imageUri.trim() }
          : {
              codeArtifact: artifact ?? undefined,
              runtime: runtime?.name,
              architecture,
              ...(handler.trim() !== "" && { handler: handler.trim() }),
            }),
        ...(Object.keys(env).length > 0 && { env }),
      },
      done,
    )
  }

  const failure = createFromSource.error ?? createFromPackage.error ?? upload.error

  return (
    <div className={cx(page, className)}>
      <form className={form} onSubmit={submit} noValidate>
        <section className={block}>
          <header className={blockHead}>
            <h3>Basic information</h3>
            <p>The name is how this function is addressed everywhere: routes, logs and metrics.</p>
          </header>
          <div className={cx(field, narrow)}>
            <Label htmlFor="fn-name">Function name</Label>
            <Input
              id="fn-name"
              value={name}
              placeholder="my-function"
              autoComplete="off"
              className={monoInput}
              aria-invalid={Boolean(visible.name)}
              onChange={(event) => {
                setName(event.target.value)
              }}
            />
            {visible.name ? (
              <p className={errorText}>{visible.name}</p>
            ) : (
              <p className={hint}>Letters, numbers, hyphens and underscores.</p>
            )}
          </div>
        </section>

        {/* Only worth asking when there is more than one answer. */}
        {(capabilities.zipUpload || capabilities.containerImage) && (
          <section className={block}>
            <header className={blockHead}>
              <h3>Package</h3>
              <p>Where this function&rsquo;s code comes from.</p>
            </header>
            <div className={optionGrid}>
              {capabilities.zipUpload && (
                <PackageOptionCard
                  icon={<FileArchive size={20} />}
                  title="Zip archive"
                  subtitle="Code you have already built"
                  bullets={["Upload a .zip", "Any supported runtime"]}
                  selected={packageType === "zip"}
                  onSelect={() => {
                    setPackageType("zip")
                  }}
                />
              )}
              {capabilities.containerImage && (
                <PackageOptionCard
                  icon={<Container size={20} />}
                  title="Container image"
                  subtitle="Bring your own container"
                  bullets={["Any registry", "Carries its own runtime"]}
                  selected={packageType === "image"}
                  onSelect={() => {
                    setPackageType("image")
                  }}
                />
              )}
              {capabilities.blankTemplate && (
                <PackageOptionCard
                  icon={<Sparkles size={20} />}
                  title="Blank starter"
                  subtitle="Start from a template"
                  bullets={["Deploys immediately", "Interpreted runtimes only"]}
                  selected={packageType === "blank"}
                  onSelect={() => {
                    setPackageType("blank")
                  }}
                />
              )}
            </div>

            {packageType === "image" && (
              <div className={cx(field, narrow)}>
                <Label htmlFor="fn-image">Image URI</Label>
                <Input
                  id="fn-image"
                  value={imageUri}
                  placeholder="ghcr.io/acme/api:1.0"
                  autoComplete="off"
                  className={monoInput}
                  aria-invalid={Boolean(visible.imageUri)}
                  onChange={(event) => {
                    setImageUri(event.target.value)
                  }}
                />
                {visible.imageUri && <p className={errorText}>{visible.imageUri}</p>}
              </div>
            )}

            {packageType === "zip" && (
              <>
                <label className={cx(dropzone, narrow, artifact && dropzoneFilled)}>
                  {upload.isPending ? (
                    <Loader2 size={24} className={css`animation: spin 1s linear infinite;`} />
                  ) : (
                    <FileArchive size={24} />
                  )}
                  <span style={{ fontSize: 13 }}>
                    {artifact ? artifactName : "Upload the .zip deployment package"}
                  </span>
                  {artifact && <span className={hint}>{artifact.key}</span>}
                  <input
                    type="file"
                    accept=".zip"
                    style={{ display: "none" }}
                    onChange={(event) => {
                      onFile(event.target.files?.[0])
                    }}
                  />
                </label>
                {visible.artifact && <p className={errorText}>{visible.artifact}</p>}
              </>
            )}
          </section>
        )}

        {runtimeApplies && (
          <section className={block}>
            <header className={blockHead}>
              <h3>Runtime</h3>
              <p>Served live from the control plane&rsquo;s catalog. Deprecated runtimes are hidden.</p>
            </header>
            <RuntimeCatalog
              runtimes={runtimes.data ?? []}
              isLoading={runtimes.isLoading}
              errored={runtimes.isError}
              value={runtime?.name}
              hideDeprecated
              onSelect={setRuntime}
            />
            {visible.runtime && <p className={errorText}>{visible.runtime}</p>}

            {runtime?.bundledRic && packageType !== "blank" && (
              <div className={cx(alert, warn)}>
                <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>
                  <strong>{runtime.name}</strong> needs its own runtime interface client and an
                  executable <code>bootstrap</code> at the package root.
                </span>
              </div>
            )}

            {runtime && (
              <div className={cx(fieldRow, narrow)}>
                {handlerRequired && (
                  <div className={field}>
                    <Label htmlFor="fn-handler">Handler</Label>
                    <Input
                      id="fn-handler"
                      value={handler}
                      placeholder={runtime.handlerFormat}
                      autoComplete="off"
                      className={monoInput}
                      aria-invalid={Boolean(visible.handler)}
                      onChange={(event) => {
                        setHandler(event.target.value)
                        setHandlerTouched(true)
                      }}
                    />
                    {visible.handler ? (
                      <p className={errorText}>{visible.handler}</p>
                    ) : (
                      <p className={hint}>{runtime.handlerFormat}</p>
                    )}
                  </div>
                )}
                <div className={field}>
                  <Label htmlFor="fn-arch">Architecture</Label>
                  <select
                    id="fn-arch"
                    value={architecture}
                    onChange={(event) => {
                      setArchitecture(event.target.value)
                    }}
                    className={cx(monoInput)}
                    style={{
                      height: 36,
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      background: "var(--input)",
                      color: "var(--foreground)",
                      padding: "0 8px",
                      fontSize: 13,
                    }}
                  >
                    {runtime.architectures.map((arch) => (
                      <option key={arch} value={arch}>
                        {arch}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </section>
        )}

        <section className={block}>
          <header className={blockHead}>
            <h3>Sizing &amp; environment</h3>
            <p>Every value here can be changed after the function exists.</p>
          </header>
          <div className={cx(fieldRow, narrow)}>
            <div className={field}>
              <Label htmlFor="fn-memory">Memory (MB)</Label>
              <Input
                id="fn-memory"
                type="number"
                min={64}
                max={10240}
                step={64}
                value={memorySize}
                className={monoInput}
                onChange={(event) => {
                  setMemorySize(Number(event.target.value))
                }}
              />
              <div className={memoryPresets}>
                {MEMORY_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={cx(presetChip, memorySize === preset && presetChipActive)}
                    onClick={() => {
                      setMemorySize(preset)
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
            <div className={field}>
              <Label htmlFor="fn-timeout">Timeout (seconds)</Label>
              <Input
                id="fn-timeout"
                type="number"
                min={1}
                max={900}
                value={timeoutSecs}
                className={monoInput}
                onChange={(event) => {
                  setTimeoutSecs(Number(event.target.value))
                }}
              />
              <p className={hint}>Up to 900s (15 minutes).</p>
            </div>
          </div>

          <div className={narrow}>
            <Label>Environment variables</Label>
            <div style={{ marginTop: 6 }}>
              <EnvEditor rows={envRows} onChange={setEnvRows} />
            </div>
          </div>
        </section>

        {failure != null && (
          <div className={alert}>
            <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{failure instanceof Error ? failure.message : "Could not create the function."}</span>
          </div>
        )}

        <div className={actions}>
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
              Cancel
            </Button>
          )}
          <Button type="submit" loading={submitting}>
            {!submitting && <Rocket size={14} />}
            Create function
          </Button>
        </div>
      </form>

      <aside className={aside}>
        <SummaryPanel
          name={name}
          packageType={packageType}
          packageLabel={PACKAGE_LABELS[packageType]}
          artifactKey={artifact?.key}
          imageUri={imageUri}
          runtime={runtime}
          handler={handler}
          architecture={architecture}
          memorySize={memorySize}
          timeout={timeoutSecs}
          envCount={envRows.filter((entry) => entry.key.trim() !== "").length}
          template={template}
        />
      </aside>
    </div>
  )
}

export { type EnvRow } from "./EnvEditor"
export { PackageOptionCard } from "./PackageOptionCard"
export { SummaryPanel } from "./SummaryPanel"
