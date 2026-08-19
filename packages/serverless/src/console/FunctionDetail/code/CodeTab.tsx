import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { useQueryClient } from "@tanstack/react-query"
import { Package } from "lucide-react"
import { toast } from "sonner"

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Skeleton,
  css,
  cx,
  formatBytes,
  glass2,
  glass3,
  media,
} from "@datadack/common-ui"

import {
  serverlessKeys,
  useDeleteFunctionCodeFile,
  useDeployCodeDraft,
  useDiscardCodeDraft,
  useFunctionCode,
  usePutFunctionCodeFile,
} from "../../../data/queries"
import { useServerlessContext } from "../../../data/transport"
import {
  MAX_CODE_FILE_BYTES,
  type FunctionCodeFile,
  type FunctionEntity,
  type FunctionUrl,
} from "../../../data/types"
import { CodeEditorPlaceholder } from "../../CodeEditorPlaceholder"
import { ConfirmDialog } from "../../ConfirmDialog"
import { errorMessage } from "../errorMessage"
import type { FunctionDetailLabels } from "../labels"
import { CodeDeployRail } from "./CodeDeployRail"
import { CodeDock, type CodeDockPanel, type CodeLogEntry } from "./CodeDock"
import { CodeEditorPane } from "./CodeEditorPane"
import { CodeFileTree } from "./CodeFileTree"
import { CodeNotEditable } from "./CodeNotEditable"
import { CodeStatusBar } from "./CodeStatusBar"
import { CodeTabStrip } from "./CodeTabStrip"
import { CodeToolbar } from "./CodeToolbar"
import { handlerFile, languageFor } from "./language"
import { PathDialog } from "./PathDialog"

/* Transparent, not --card: the detail page beneath already paints the glass-1
   surface, and a second opaque layer on top of it would cancel it out. */
const shell = css`
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  border-radius: 0;
  background: transparent;
`

/* The pre-workbench states (loading, load error, not-editable) fill the same
   square pane the workbench would have. They are composed with glass2, whose
   radius and border are overridden here — a rounded card inset in a full-bleed
   page reads as a mistake, not as emphasis. */
const stateShell = css`
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  border: 0;
  border-radius: 0;
  background: var(--glass-1-bg);
`

/**
 * Full screen is this panel pinned over the viewport rather than the browser's
 * Fullscreen API: the console's own dialogs, toasts and command palette keep
 * working, where a real fullscreen element would render them all beneath it.
 * z-index stays under the kit's overlays (50) so a dialog opened from in here
 * still lands on top.
 */
const fullscreenShell = css`
  position: fixed;
  inset: 0;
  z-index: 45;
  border-radius: 0;
  border: 0;
  /* Fullscreen crosses over the app shell, whose header and route chrome use
     their own stacking layers. The normal glass surface is translucent and
     allowed that chrome to remain visibly superimposed on the editor. */
  background: var(--background);
  box-shadow: none;
`

const workbench = css`
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;

  ${media.md} {
    flex-direction: row;
  }
`

const editorColumn = css`
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
`

const skeletonPane = css`
  flex: 1;
  border-radius: 0;
`

const staleContent = css`
  max-width: 30rem;
`

/**
 * Which "new" dialog is open, and where it will create. `parent` is the folder
 * the action was invoked from, so a right-click inside lib/ creates in lib/.
 */
type PathPrompt =
  | { kind: "newFile"; parent: string }
  | { kind: "newFolder"; parent: string }
  | { kind: "rename"; path: string }

/**
 * The control plane's stale-deploy conflict, recognised from the message it
 * sends. The transports flatten HTTP status into a plain Error carrying the
 * server's text — the same trade the detail page already makes for 404s — so
 * the wording is the only signal available here.
 */
function isStaleDeploy(error: unknown): boolean {
  return error instanceof Error && /changed since the draft was opened/i.test(error.message)
}

/** Mirrors platform.SanitizePackagePath, so a bad path never costs a round trip. */
function invalidPathReason(raw: string): "empty" | "invalid" | undefined {
  const trimmed = raw.trim()
  if (trimmed === "") return "empty"
  if (trimmed.includes("\\") || trimmed.startsWith("/")) return "invalid"
  const segments = trimmed.split("/")
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    return "invalid"
  }
  return undefined
}

/** `parent` + `name`, with no leading slash for a root-level path. */
function joinPath(parent: string, name: string): string {
  return parent === "" ? name : `${parent}/${name}`
}

/** The buffer map with one path dropped — the "this file is now saved" step. */
function withoutPath(buffers: Record<string, string>, path: string): Record<string, string> {
  return Object.fromEntries(Object.entries(buffers).filter(([key]) => key !== path))
}

/** The open-tab list with one path swapped for another, for a rename. */
function swapPath(paths: readonly string[], from: string, to: string): string[] {
  return paths.map((path) => (path === from ? to : path))
}

export interface CodeTabProps {
  fn: FunctionEntity
  scope?: string
  labels: FunctionDetailLabels
  /** Hostnames that invoke this function; shown in the deployment panel. */
  urls?: readonly FunctionUrl[]
  /** Opens Configuration → Environment variables. Omit to hide that shortcut. */
  onManageEnv?: () => void
  className?: string
}

/**
 * Lambda's Code tab: the function's deployment package opened as files.
 *
 * The model is the control plane's, not a checkout's. Typing lives in a local
 * buffer; **Save** stages that buffer into the function's server-side draft
 * archive; **Deploy** repacks the draft and mints a version. Nothing an editor
 * does reaches a worker until that last step — which is why Save is cheap and
 * Deploy is the guarded one.
 */
export function CodeTab({
  fn,
  scope,
  labels,
  urls,
  onManageEnv,
  className,
}: Readonly<CodeTabProps>) {
  const copy = labels.code
  const { capabilities, transport } = useServerlessContext()
  const queryClient = useQueryClient()

  const code = useFunctionCode(fn.name, scope)
  const putFile = usePutFunctionCodeFile(fn.name, scope)
  const deleteFile = useDeleteFunctionCodeFile(fn.name, scope)
  const discardDraft = useDiscardCodeDraft(fn.name, scope)
  const deployDraft = useDeployCodeDraft(fn.name, scope)

  const [openPaths, setOpenPaths] = useState<string[]>([])
  const [activePath, setActivePath] = useState("")
  /** Unsaved edits, keyed by path. Presence in this map IS the dirty flag. */
  const [buffers, setBuffers] = useState<Record<string, string>>({})
  const [prompt, setPrompt] = useState<PathPrompt>()
  const [deletingPath, setDeletingPath] = useState<string>()
  const [confirmingDiscard, setConfirmingDiscard] = useState(false)
  const [staleDeploy, setStaleDeploy] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [railOpen, setRailOpen] = useState(true)
  const [dockOpen, setDockOpen] = useState(false)
  const [dockCollapsed, setDockCollapsed] = useState(false)
  const [dockPanel, setDockPanel] = useState<CodeDockPanel>("output")
  const [logEntries, setLogEntries] = useState<CodeLogEntry[]>([])
  const [cursor, setCursor] = useState({ line: 1, column: 1 })

  const entries = useMemo(() => code.data?.files ?? [], [code.data])
  const editable = code.data?.editable === true
  const canEdit = editable && capabilities.codeEdit
  const dirtyPaths = useMemo(() => new Set(Object.keys(buffers)), [buffers])

  // Open the handler on first load, so the tab lands on the code someone came
  // to read. Guarded by a ref rather than a dependency list: a refetch after a
  // deploy must not yank the reader back to the handler.
  const openedOnce = useRef(false)
  useEffect(() => {
    if (openedOnce.current || !editable || entries.length === 0) return
    openedOnce.current = true
    const first = handlerFile(
      code.data?.handler ?? fn.handler,
      entries.filter((entry) => !entry.binary).map((entry) => entry.path),
    )
    if (first !== "") {
      setOpenPaths([first])
      setActivePath(first)
    }
  }, [editable, entries, code.data?.handler, fn.handler])

  // Files can vanish under the editor — another session's deploy, or a delete
  // in this one — and a tab pointing at nothing renders an endless spinner.
  useEffect(() => {
    if (entries.length === 0) return
    const known = new Set(entries.map((entry) => entry.path))
    setOpenPaths((prev) => {
      const kept = prev.filter((path) => known.has(path))
      return kept.length === prev.length ? prev : kept
    })
  }, [entries])

  useEffect(() => {
    if (activePath !== "" && !openPaths.includes(activePath)) {
      setActivePath(openPaths[openPaths.length - 1] ?? "")
    }
  }, [openPaths, activePath])

  // A newly opened file starts at the top rather than wherever the last one was
  // read. The status bar spans the workbench now, so this state lives here.
  useEffect(() => {
    setCursor({ line: 1, column: 1 })
  }, [activePath])

  // Closing the tab with staged typing loses it; the browser's own prompt is
  // the only one that can interrupt a navigation this component does not own.
  useEffect(() => {
    if (dirtyPaths.size === 0) return undefined
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener("beforeunload", handler)
    return () => {
      window.removeEventListener("beforeunload", handler)
    }
  }, [dirtyPaths.size])

  // While the panel covers the viewport the page behind it must not scroll —
  // otherwise closing full screen lands somewhere the reader never scrolled to.
  useEffect(() => {
    if (!fullscreen) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previous
    }
  }, [fullscreen])

  // Escape leaves full screen, but only when it is not already spoken for:
  // Monaco marks its own uses (find widget, suggest popup) as handled, and a
  // dialog open over the editor should close before the editor shrinks.
  const dialogOpen =
    prompt !== undefined || deletingPath !== undefined || confirmingDiscard || staleDeploy
  useEffect(() => {
    if (!fullscreen || dialogOpen) return undefined
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) setFullscreen(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [fullscreen, dialogOpen])

  // Monotonic ids rather than Date.now(): two log lines written in the same
  // millisecond (save-then-deploy) would otherwise collide as React keys.
  const logSeq = useRef(0)
  const appendLog = useCallback((level: CodeLogEntry["level"], text: string) => {
    logSeq.current += 1
    setLogEntries((prev) => [
      ...prev,
      { id: `log-${String(logSeq.current)}`, at: new Date(), level, text },
    ])
  }, [])

  /**
   * A toast says this for two seconds; the Output panel is where it stays. An
   * error also raises the panel — a failed deploy is the one thing here nobody
   * should have to go looking for.
   */
  const report = useCallback(
    (level: CodeLogEntry["level"], text: string) => {
      appendLog(level, text)
      if (level === "error") {
        setDockOpen(true)
        setDockCollapsed(false)
        setDockPanel("output")
      }
    },
    [appendLog],
  )

  const openFile = (path: string) => {
    setOpenPaths((prev) => (prev.includes(path) ? prev : [...prev, path]))
    setActivePath(path)
  }

  const closeFile = (path: string) => {
    setOpenPaths((prev) => prev.filter((candidate) => candidate !== path))
    // The buffer survives a close on purpose: reopening the tab should show
    // the edit back, and Save/Deploy still count it as unsaved meanwhile.
  }

  /**
   * The bytes to write for a path: the live buffer, else whatever was last
   * read into the cache, else a fetch. Rename needs this for a file the user
   * may never have opened.
   */
  const contentFor = useCallback(
    async (path: string): Promise<string> => {
      const buffered = buffers[path]
      if (buffered !== undefined) return buffered
      const cached = queryClient.getQueryData<FunctionCodeFile>(
        serverlessKeys.codeFile(fn.name, path, scope),
      )
      if (cached) return cached.content
      if (!transport.getFunctionCodeFile) return ""
      const fetched = await transport.getFunctionCodeFile(fn.name, path)
      return fetched.content
    },
    [buffers, queryClient, fn.name, scope, transport],
  )

  /** Stages every dirty buffer. Resolves false when one of them failed. */
  const saveAll = async (): Promise<boolean> => {
    const pending = Object.entries(buffers)
    for (const [path, content] of pending) {
      if (new TextEncoder().encode(content).length > MAX_CODE_FILE_BYTES) {
        const message = copy.errors.fileTooLarge(formatBytes(MAX_CODE_FILE_BYTES))
        toast.error(message)
        report("error", `${path}: ${message}`)
        return false
      }
      try {
        await putFile.mutateAsync({ path, content })
      } catch (error) {
        const message = errorMessage(error, copy.errors.saveFailed)
        toast.error(message)
        report("error", `${path}: ${message}`)
        return false
      }
      setBuffers((prev) => withoutPath(prev, path))
    }
    return true
  }

  const handleSave = () => {
    void (async () => {
      const paths = Object.keys(buffers)
      if (paths.length === 0) return
      if (await saveAll()) {
        const message =
          paths.length === 1
            ? copy.toasts.saved(paths[0] ?? "")
            : copy.toasts.savedAll(paths.length)
        toast.success(message)
        report("info", message)
      }
    })()
  }

  const runDeploy = (baseSha256: string | undefined) => {
    void (async () => {
      if (Object.keys(buffers).length > 0 && !(await saveAll())) return
      report("info", copy.toolbar.deploying)
      deployDraft.mutate(baseSha256, {
        onSuccess: (deployed) => {
          setStaleDeploy(false)
          const message = copy.toasts.deployed(deployed.version?.version ?? "")
          toast.success(message)
          report("success", message)
        },
        onError: (error) => {
          if (isStaleDeploy(error)) {
            setStaleDeploy(true)
            return
          }
          const message = errorMessage(error, copy.errors.deployFailed)
          toast.error(message)
          report("error", message)
        },
      })
    })()
  }

  const handleDiscard = () => {
    discardDraft.mutate(undefined, {
      onSuccess: () => {
        setBuffers({})
        setConfirmingDiscard(false)
        toast.success(copy.toasts.discarded)
        report("info", copy.toasts.discarded)
      },
      onError: (error) => {
        const message = errorMessage(error, copy.errors.discardFailed)
        toast.error(message)
        report("error", message)
      },
    })
  }

  const handleDelete = (path: string) => {
    deleteFile.mutate(path, {
      onSuccess: () => {
        setDeletingPath(undefined)
        closeFile(path)
        setBuffers((prev) => withoutPath(prev, path))
        toast.success(copy.toasts.deleted(path))
        report("info", copy.toasts.deleted(path))
      },
      onError: (error) => {
        const message = errorMessage(error, copy.errors.deleteFailed)
        toast.error(message)
        report("error", message)
      },
    })
  }

  const handleCreate = (path: string, folder: boolean) => {
    // A zip stores no directory entries, so a folder only exists once a file
    // inside it does — hence the placeholder.
    const target = folder ? `${path}/.gitkeep` : path
    putFile.mutate(
      { path: target, content: "" },
      {
        onSuccess: () => {
          setPrompt(undefined)
          if (!folder) openFile(target)
          toast.success(copy.toasts.created(target))
          report("info", copy.toasts.created(target))
        },
        onError: (error) => {
          const message = errorMessage(error, copy.errors.createFailed)
          toast.error(message)
          report("error", message)
        },
      },
    )
  }

  const handleRename = (from: string, to: string) => {
    void (async () => {
      try {
        // Write first, delete second: a failure between the two leaves a copy
        // rather than losing the file.
        const content = await contentFor(from)
        await putFile.mutateAsync({ path: to, content })
        // Move the open tab while BOTH paths still exist in the tree. Doing it
        // after the delete races the effect that prunes tabs for files that are
        // gone, which would close the tab instead of following the rename.
        setOpenPaths((prev) => swapPath(prev, from, to))
        setActivePath((path) => (path === from ? to : path))
        await deleteFile.mutateAsync(from)
        setBuffers((prev) => withoutPath(prev, from))
        setPrompt(undefined)
        toast.success(copy.toasts.renamed(to))
        report("info", copy.toasts.renamed(to))
      } catch (error) {
        const message = errorMessage(error, copy.errors.renameFailed)
        toast.error(message)
        report("error", message)
      }
    })()
  }

  /** Shared by all three path dialogs; `self` is exempt from the clash check. */
  const validatePath = (raw: string, self?: string): string | undefined => {
    const reason = invalidPathReason(raw)
    if (reason) return copy.errors.invalidPath
    const path = raw.trim()
    if (path !== self && entries.some((entry) => entry.path === path)) {
      return copy.errors.duplicatePath
    }
    return undefined
  }

  // ── States before the workbench ──────────────────────────────────────────

  // No code methods on this console's transport: the same inert panel the tab
  // showed before inline editing existed, with copy saying so.
  if (!capabilities.codeRead) {
    return (
      <CodeEditorPlaceholder
        functionName={fn.name}
        runtime={fn.runtime}
        sizeBytes={fn.version?.codeArtifact?.sizeBytes}
        version={fn.version?.version}
        title={copy.title}
        message={copy.message}
        className={className}
      />
    )
  }

  if (code.isLoading) {
    return (
      <div className={cx(glass2, stateShell, className)}>
        <Skeleton className={skeletonPane} />
      </div>
    )
  }

  if (code.isError || !code.data) {
    return (
      <div className={cx(glass2, stateShell, className)}>
        <EmptyState
          icon={Package}
          title={copy.errors.loadFailed}
          description={errorMessage(code.error, copy.errors.loadFailed)}
        />
      </div>
    )
  }

  if (!code.data.editable) {
    return (
      <div className={cx(glass2, stateShell, className)}>
        <CodeNotEditable reason={code.data.reason} labels={labels} />
      </div>
    )
  }

  // Narrowed once past the guards above, so the render body never re-tests it.
  const codeView = code.data
  const activeEntry = entries.find((entry) => entry.path === activePath)
  const deleteTarget = deletingPath ?? ""
  const promptPath = prompt?.kind === "rename" ? prompt.path : ""

  return (
    <div className={cx(shell, fullscreen && fullscreenShell, className)}>
      <CodeToolbar
        code={codeView}
        labels={labels}
        unsavedCount={dirtyPaths.size}
        canEdit={canEdit}
        saving={putFile.isPending}
        deploying={deployDraft.isPending}
        discarding={discardDraft.isPending}
        fullscreen={fullscreen}
        railOpen={railOpen}
        dockOpen={dockOpen}
        onSave={handleSave}
        onDiscard={() => {
          setConfirmingDiscard(true)
        }}
        onDeploy={() => {
          runDeploy(codeView.baseSha256)
        }}
        onToggleFullscreen={() => {
          setFullscreen((on) => !on)
        }}
        onToggleRail={() => {
          setRailOpen((on) => !on)
        }}
        onToggleDock={() => {
          setDockOpen((on) => !on)
          setDockCollapsed(false)
        }}
      />

      <div className={workbench}>
        <CodeFileTree
          rootLabel={fn.name}
          entries={entries}
          activePath={activePath}
          dirtyPaths={dirtyPaths}
          canEdit={canEdit}
          labels={labels}
          onOpen={openFile}
          onNewFile={(parent) => {
            setPrompt({ kind: "newFile", parent })
          }}
          onNewFolder={(parent) => {
            setPrompt({ kind: "newFolder", parent })
          }}
          onRename={(path) => {
            setPrompt({ kind: "rename", path })
          }}
          onDelete={setDeletingPath}
        />

        <div className={editorColumn}>
          <CodeTabStrip
            openPaths={openPaths}
            activePath={activePath}
            dirtyPaths={dirtyPaths}
            onSelect={setActivePath}
            onClose={closeFile}
            closeLabel={copy.toolbar.close}
          />
          <CodeEditorPane
            functionName={fn.name}
            scope={scope}
            path={activePath}
            binary={activeEntry?.binary === true}
            buffer={buffers[activePath]}
            readOnly={!canEdit}
            labels={labels}
            onChange={(path, value) => {
              setBuffers((prev) => ({ ...prev, [path]: value }))
            }}
            onSave={handleSave}
            onCursorChange={(line, column) => {
              setCursor({ line, column })
            }}
          />
        </div>

        {railOpen && (
          <CodeDeployRail
            fn={fn}
            code={codeView}
            urls={urls}
            labels={labels}
            onManageEnv={onManageEnv}
          />
        )}
      </div>

      {dockOpen && (
        <CodeDock
          functionName={fn.name}
          scope={scope}
          labels={labels}
          entries={logEntries}
          panel={dockPanel}
          onPanelChange={setDockPanel}
          collapsed={dockCollapsed}
          onToggleCollapsed={() => {
            setDockCollapsed((on) => !on)
          }}
          onClose={() => {
            setDockOpen(false)
          }}
          onClear={() => {
            setLogEntries([])
          }}
          canInvoke={capabilities.invoke}
        />
      )}

      <CodeStatusBar
        path={activeEntry?.binary === true ? "" : activePath}
        language={languageFor(activePath)}
        line={cursor.line}
        column={cursor.column}
        readOnly={!canEdit}
        sha256={codeView.sha256}
        labels={labels}
      />

      <PathDialog
        open={prompt?.kind === "newFile"}
        onOpenChange={(open) => {
          if (!open) setPrompt(undefined)
        }}
        title={copy.dialogs.newFile.title}
        label={copy.dialogs.newFile.label}
        placeholder={copy.dialogs.newFile.placeholder}
        confirmLabel={copy.dialogs.newFile.confirm}
        cancelLabel={copy.dialogs.cancel}
        initialValue={prompt?.kind === "newFile" ? joinPath(prompt.parent, "") : ""}
        validate={(path) => validatePath(path)}
        loading={putFile.isPending}
        onSubmit={(path) => {
          handleCreate(path, false)
        }}
      />

      <PathDialog
        open={prompt?.kind === "newFolder"}
        onOpenChange={(open) => {
          if (!open) setPrompt(undefined)
        }}
        title={copy.dialogs.newFolder.title}
        label={copy.dialogs.newFolder.label}
        hint={copy.dialogs.newFolder.hint}
        confirmLabel={copy.dialogs.newFolder.confirm}
        cancelLabel={copy.dialogs.cancel}
        initialValue={prompt?.kind === "newFolder" ? joinPath(prompt.parent, "") : ""}
        validate={(path) => {
          const reason = invalidPathReason(path)
          return reason ? copy.errors.invalidPath : undefined
        }}
        loading={putFile.isPending}
        onSubmit={(path) => {
          handleCreate(path, true)
        }}
      />

      <PathDialog
        open={prompt?.kind === "rename"}
        onOpenChange={(open) => {
          if (!open) setPrompt(undefined)
        }}
        title={copy.dialogs.rename.title}
        label={copy.dialogs.rename.label}
        confirmLabel={copy.dialogs.rename.confirm}
        cancelLabel={copy.dialogs.cancel}
        initialValue={promptPath}
        validate={(path) => validatePath(path, promptPath)}
        loading={putFile.isPending || deleteFile.isPending}
        onSubmit={(path) => {
          handleRename(promptPath, path)
        }}
      />

      <ConfirmDialog
        open={deletingPath !== undefined}
        onOpenChange={(open) => {
          if (!open) setDeletingPath(undefined)
        }}
        title={copy.dialogs.deleteFile.title(deleteTarget)}
        description={copy.dialogs.deleteFile.description}
        confirmLabel={copy.dialogs.deleteFile.confirm}
        cancelLabel={copy.dialogs.cancel}
        loading={deleteFile.isPending}
        onConfirm={() => {
          handleDelete(deleteTarget)
        }}
      />

      <ConfirmDialog
        open={confirmingDiscard}
        onOpenChange={setConfirmingDiscard}
        title={copy.dialogs.discard.title}
        description={copy.dialogs.discard.description}
        confirmLabel={copy.dialogs.discard.confirm}
        cancelLabel={copy.dialogs.cancel}
        loading={discardDraft.isPending}
        onConfirm={handleDiscard}
      />

      {/* Not a ConfirmDialog: this one offers two different resolutions, not
          confirm-or-cancel. */}
      <Dialog open={staleDeploy} onOpenChange={setStaleDeploy}>
        <DialogContent className={cx(glass3, staleContent)}>
          <DialogHeader>
            <DialogTitle>{copy.dialogs.stale.title}</DialogTitle>
            <DialogDescription>{copy.dialogs.stale.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setStaleDeploy(false)
                void code.refetch()
              }}
            >
              {copy.dialogs.stale.reload}
            </Button>
            <Button
              type="button"
              variant="destructive"
              loading={deployDraft.isPending}
              onClick={() => {
                runDeploy(undefined)
              }}
            >
              {copy.dialogs.stale.overwrite}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
