import { useEffect, useRef, useState } from 'react'

import { applyTheme, ensureVscode, mountFiles, onFileWritten, onStage, type Stage } from './runtime'

export interface VscodeWorkbenchProps {
  functionName: string
  files: { path: string; content: string }[]
  theme: 'light' | 'dark'
  /** Called when VS Code writes a file, i.e. on ⌘S. */
  onSave: (path: string, content: string) => void
}

/**
 * The real VS Code workbench, mounted into a container the console owns.
 *
 * Lazily imported by FunctionCodeEditor: this pulls in VS Code's services and
 * default extensions, which is far too much to sit in the initial payload.
 */
export default function VscodeWorkbench({
  functionName,
  files,
  theme,
  onSave,
}: Readonly<VscodeWorkbenchProps>) {
  const container = useRef<HTMLDivElement | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [stage, setStage] = useState<Stage>('idle')

  // Start-up is several awaits deep; showing which one is in flight turns a
  // silent spinner into something you can act on.
  useEffect(() => onStage(setStage), [])

  // The save handler is read through a ref so the subscription registered at
  // start-up always calls the current closure.
  const saveRef = useRef(onSave)
  useEffect(() => {
    saveRef.current = onSave
  }, [onSave])

  useEffect(() => {
    const node = container.current
    if (!node) return

    let disposed = false
    let unsubscribe: (() => void) | undefined

    void ensureVscode(node, functionName, theme)
      .then(() => {
        if (disposed) return
        mountFiles(functionName, files)
        unsubscribe = onFileWritten(functionName, (path, content) => {
          saveRef.current(path, content)
        })
        return undefined
        setReady(true)
      })
      .catch((err: unknown) => {
        if (!disposed) setError(err instanceof Error ? err.message : String(err))
      })

    return () => {
      disposed = true
      unsubscribe?.()
    }
    // Start-up is one-shot per page; re-running it on prop changes would try to
    // initialise VS Code's global services twice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Files can arrive after start-up (a refetch, or switching function).
  useEffect(() => {
    if (ready) mountFiles(functionName, files)
  }, [ready, functionName, files])

  useEffect(() => {
    if (ready) applyTheme(theme)
  }, [ready, theme])

  if (error) {
    return <div className="fs-wb-loading">Could not start the editor: {error}</div>
  }

  return (
    <div className="fs-vscode">
      {!ready && <div className="fs-wb-loading">Starting VS Code — {stage}…</div>}
      <div ref={container} className="fs-vscode-host" />
    </div>
  )
}
