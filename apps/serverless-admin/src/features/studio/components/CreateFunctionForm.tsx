import { useEffect, useMemo, useState, type ReactNode } from 'react'

import { AlertTriangle, Boxes, Loader2, Rocket } from 'lucide-react'

import { apiErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

import { RuntimeCatalog } from './RuntimeCatalog'
import { RuntimeIcon } from './RuntimeIcon'
import { useCreateFunction } from '../lib/queries'
import type { Runtime } from '../lib/schemas'
import { templateFor } from '../lib/templates'

export interface CreateFunctionFormProps {
  onCreated?: (functionName: string) => void
  onCancel?: () => void
  /**
   * `compact` stacks the fields — right for a panel or a drawer.
   * `page` groups them into titled sections with a sticky action bar, for a
   * dedicated full-screen route.
   */
  layout?: 'compact' | 'page'
  theme?: 'light' | 'dark'
  className?: string
}

const NAME_PATTERN = /^[a-zA-Z0-9-_]{1,64}$/

/**
 * Author-from-scratch flow: pick a runtime from the live catalog, name the
 * function, and the control plane zips the starter template server-side.
 */
export function CreateFunctionForm({
  onCreated,
  onCancel,
  layout = 'compact',
  theme = 'light',
  className,
}: Readonly<CreateFunctionFormProps>) {
  // .fs-root carries the design tokens every fs- class below reads.
  return (
    <div className={cn('fs-root', theme === 'dark' && 'fs-dark')}>
      <CreateFunctionFormView
        onCreated={onCreated}
        onCancel={onCancel}
        layout={layout}
        className={className}
      />
    </div>
  )
}

/**
 * A field group. Bare in compact mode; on a page it becomes a titled block
 * separated from its neighbours by a rule, the way the console's other create
 * screens are laid out.
 */
function Group({
  layout,
  title,
  description,
  divided = true,
  children,
}: Readonly<{
  layout: 'compact' | 'page'
  title: string
  description?: string
  divided?: boolean
  children: ReactNode
}>) {
  if (layout === 'compact') return <>{children}</>
  return (
    <section className={cn('fs-block', divided && 'fs-block-divided')}>
      <header className="fs-block-head">
        <h3>{title}</h3>
        {description && <p>{description}</p>}
      </header>
      {children}
    </section>
  )
}

function CreateFunctionFormView({
  onCreated,
  onCancel,
  layout = 'compact',
  className,
}: Readonly<Omit<CreateFunctionFormProps, 'theme'>>) {
  const [name, setName] = useState('')
  const [runtime, setRuntime] = useState<Runtime | undefined>()
  const [handler, setHandler] = useState('')
  const [architecture, setArchitecture] = useState('x86_64')
  const [memorySize, setMemorySize] = useState(128)
  const [timeout, setTimeout] = useState(3)

  const create = useCreateFunction()
  const template = useMemo(() => templateFor(runtime), [runtime])
  const isPage = layout === 'page'

  // The handler default follows the runtime, but only until the operator edits
  // it — retyping their handler on every runtime click would be hostile.
  const [handlerTouched, setHandlerTouched] = useState(false)
  useEffect(() => {
    if (!handlerTouched) setHandler(template.handler)
  }, [template.handler, handlerTouched])

  useEffect(() => {
    if (runtime && !runtime.architectures.includes(architecture)) {
      setArchitecture(runtime.architectures[0] ?? 'x86_64')
    }
  }, [runtime, architecture])

  const nameValid = NAME_PATTERN.test(name)
  const handlerValid = !runtime?.handlerRequired || handler.trim().length > 0
  const canSubmit = nameValid && handlerValid && Boolean(runtime) && !create.isPending

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!runtime || !canSubmit) return
    create.mutate(
      {
        name: name.trim(),
        runtime: runtime.name,
        handler: handler.trim(),
        architecture,
        memorySize,
        timeout,
        files: template.files,
      },
      { onSuccess: () => onCreated?.(name.trim()) },
    )
  }

  const body = (
    <>
      <Group
        layout={layout}
        title="Basic information"
        description="The name is how this function is addressed everywhere: routes, logs and metrics."
      >
        <div className="fs-field fs-field-narrow">
          <label htmlFor="fs-name" className="fs-label">
            Function name
          </label>
          <input
            id="fs-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value)
            }}
            placeholder="my-function"
            className="fs-input"
            autoComplete="off"
            aria-invalid={name !== '' && !nameValid}
          />
          <p className={cn('fs-hint', name !== '' && !nameValid && 'fs-hint-danger')}>
            Letters, numbers, hyphens and underscores. Up to 64 characters.
          </p>
        </div>
      </Group>

      <Group
        layout={layout}
        title="Runtime"
        description="Served live from the control plane's catalog. Deprecated runtimes are hidden."
      >
        {!isPage && <span className="fs-label">Runtime</span>}
        <RuntimeCatalog value={runtime?.name} onSelect={setRuntime} hideDeprecated />
      </Group>

      {runtime?.bundledRic && (
        <div className="fs-alert fs-alert-warn">
          <AlertTriangle className="fs-size-4" />
          <span>
            <strong>{runtime.name}</strong> needs its own runtime interface client and an executable{' '}
            <code>bootstrap</code> at the package root. The starter file is a placeholder — upload a
            real build before invoking.
          </span>
        </div>
      )}

      {runtime && (
        <Group
          layout={layout}
          title="Configuration"
          description="Every value here can be changed after the function exists."
        >
          <div className="fs-row">
            <div className="fs-field fs-grow">
              <label htmlFor="fs-handler" className="fs-label">
                Handler
              </label>
              <input
                id="fs-handler"
                value={handler}
                onChange={(event) => {
                  setHandler(event.target.value)
                  setHandlerTouched(true)
                }}
                disabled={!runtime.handlerRequired}
                placeholder={runtime.handlerFormat}
                className="fs-input fs-mono"
                autoComplete="off"
              />
              <p className="fs-hint">
                {runtime.handlerRequired ? runtime.handlerFormat : 'Not used by this runtime'}
              </p>
            </div>

            <div className="fs-field">
              <label htmlFor="fs-arch" className="fs-label">
                Architecture
              </label>
              <select
                id="fs-arch"
                value={architecture}
                onChange={(event) => {
                  setArchitecture(event.target.value)
                }}
                className="fs-input"
              >
                {runtime.architectures.map((arch) => (
                  <option key={arch} value={arch}>
                    {arch}
                  </option>
                ))}
              </select>
            </div>

            <div className="fs-field">
              <label htmlFor="fs-memory" className="fs-label">
                Memory (MB)
              </label>
              <input
                id="fs-memory"
                type="number"
                min={128}
                max={10240}
                step={64}
                value={memorySize}
                onChange={(event) => {
                  setMemorySize(Number(event.target.value))
                }}
                className="fs-input fs-mono fs-input-number"
              />
            </div>

            <div className="fs-field">
              <label htmlFor="fs-timeout" className="fs-label">
                Timeout (s)
              </label>
              <input
                id="fs-timeout"
                type="number"
                min={1}
                max={900}
                value={timeout}
                onChange={(event) => {
                  setTimeout(Number(event.target.value))
                }}
                className="fs-input fs-mono fs-input-number"
              />
            </div>
          </div>
        </Group>
      )}

      {create.isError && (
        <div className="fs-alert fs-alert-danger">
          <AlertTriangle className="fs-size-4" />
          {apiErrorMessage(create.error)}
        </div>
      )}

      <div className={cn('fs-actions', isPage && 'fs-actions-foot')}>
        {onCancel && (
          <button type="button" className="fs-btn fs-btn-quiet" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="fs-btn fs-btn-primary" disabled={!canSubmit}>
          {create.isPending ? (
            <Loader2 className="fs-size-4 fs-spin" />
          ) : (
            <Rocket className="fs-size-4" />
          )}
          Create function
        </button>
      </div>
    </>
  )

  if (!isPage) {
    return (
      <form onSubmit={submit} className={cn('fs-stack-lg', className)} noValidate>
        {body}
      </form>
    )
  }

  return (
    <div className={cn('fs-page', className)}>
      <form onSubmit={submit} className="fs-page-main" noValidate>
        {body}
      </form>
      {/* Mirrors the resource-map panel on the console's other create screens:
          it answers "what am I about to make?" without scrolling the form. */}
      <aside className="fs-page-aside">
        <div className="fs-preview">
          <h4>Summary</h4>
          {runtime ? (
            <dl className="fs-preview-list">
              <div>
                <dt>Name</dt>
                <dd className="fs-mono">{name || <span className="fs-muted">—</span>}</dd>
              </div>
              <div>
                <dt>Runtime</dt>
                <dd className="fs-preview-runtime">
                  <RuntimeIcon family={runtime.family} className="fs-size-4" />
                  <span className="fs-mono">{runtime.name}</span>
                </dd>
              </div>
              <div>
                <dt>Handler</dt>
                <dd className="fs-mono">{handler || <span className="fs-muted">—</span>}</dd>
              </div>
              <div>
                <dt>Architecture</dt>
                <dd className="fs-mono">{architecture}</dd>
              </div>
              <div>
                <dt>Memory</dt>
                <dd className="fs-mono">{memorySize} MB</dd>
              </div>
              <div>
                <dt>Timeout</dt>
                <dd className="fs-mono">{timeout}s</dd>
              </div>
              <div>
                <dt>Starter files</dt>
                <dd>
                  <ul className="fs-preview-files">
                    {template.files.map((file) => (
                      <li key={file.path}>
                        <RuntimeIcon family={runtime.family} className="fs-size-3" />
                        <code>{file.path}</code>
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            </dl>
          ) : (
            <div className="fs-preview-empty">
              <Boxes className="fs-size-5" />
              <p>Pick a runtime to preview the function here.</p>
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}
