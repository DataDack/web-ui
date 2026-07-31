import { lazy, Suspense, useMemo } from 'react'

import { AlertTriangle, FileCode2, Loader2, Rocket, Trash2 } from 'lucide-react'

import { apiErrorMessage } from '@/lib/api'
import {
  useCodeSources,
  useCodeTree,
  useDeployDraft,
  useDiscardDraft,
  useSaveCodeFile,
} from '../lib/queries'
import type { CodeTree } from '../lib/schemas'
import { cn, formatBytes } from '@/lib/utils'
import { WorkbenchBoundary } from './vscode/WorkbenchBoundary'

// Kept out of the main chunk: the VS Code workbench and its default extensions
// are tens of megabytes, and most sessions never open the Code tab.
const VscodeWorkbench = lazy(() => import('./vscode/VscodeWorkbench'))

export interface FunctionCodeEditorProps {
  /** Function whose deployment package is edited. */
  functionName: string
  theme?: 'light' | 'dark'
  className?: string
}

const REASON_TEXT: Record<string, string> = {
  ImagePackage: 'This function deploys a container image, so its code cannot be edited here.',
  NoCodeArtifact: 'This function has no stored deployment package to edit.',
  ArchiveMissing: 'The deployment package is no longer in the artifact store.',
  PackageTooLarge: 'The deployment package is above the 3 MB limit for inline editing.',
  NotAZipArchive: 'The stored deployment package is not a readable zip archive.',
}

/**
 * Edit a deployed function's zip package: a file tree, a Monaco buffer, save to
 * draft, and a deploy that publishes the draft as a new version. Nothing reaches
 * a worker until Deploy — saving only stages a draft.
 *
 * Standalone-capable: pass `baseUrl` and it brings its own data layer.
 *
 *   <FunctionCodeEditor baseUrl="https://faas.example.com" functionName="my-fn" />
 */
export function FunctionCodeEditor({
  functionName,
  theme = 'light',
  className,
}: Readonly<FunctionCodeEditorProps>) {
  return (
    <div className={cn('fs-root', theme === 'dark' && 'fs-dark')}>
      <CodeEditorView functionName={functionName} theme={theme} className={className} />
    </div>
  )
}

function CodeEditorView({
  functionName,
  theme,
  className,
}: Readonly<{ functionName: string; theme: 'light' | 'dark'; className?: string }>) {
  const tree = useCodeTree(functionName)
  const save = useSaveCodeFile(functionName)
  const deploy = useDeployDraft(functionName)
  const discard = useDiscardDraft(functionName)

  const files = useMemo(() => tree.data?.files ?? [], [tree.data])
  const sourcesQuery = useCodeSources(functionName, files)
  const sources = useMemo(() => sourcesQuery.data ?? [], [sourcesQuery.data])

  if (tree.isLoading) {
    return (
      <div className={cn('fs-editor-loading', className)}>
        <Loader2 className="fs-size-4 fs-spin" /> Loading deployment package…
      </div>
    )
  }

  if (tree.isError) {
    return (
      <div className={cn('fs-alert fs-alert-danger', className)}>
        <AlertTriangle className="fs-size-4" />
        {apiErrorMessage(tree.error)}
      </div>
    )
  }

  if (tree.data && !tree.data.editable) {
    return <ReadOnly tree={tree.data} className={className} />
  }

  return (
    <div className={cn('fs-editor', className)}>
      <header className="fs-editor-bar">
        <span className="fs-editor-title">
          <FileCode2 className="fs-size-4" />
          {functionName}
        </span>
        <span className="fs-editor-meta">
          {tree.data?.runtime} · {formatBytes(tree.data?.sizeBytes ?? 0)} · v{tree.data?.version}
        </span>
        {tree.data?.draft && <span className="fs-tag fs-tag-warn">draft not deployed</span>}
        {save.isPending && (
          <span className="fs-tag">
            <Loader2 className="fs-size-3 fs-spin" /> saving
          </span>
        )}

        <div className="fs-editor-actions">
          {tree.data?.draft && (
            <button
              type="button"
              className="fs-btn fs-btn-sm"
              disabled={discard.isPending}
              onClick={() => {
                discard.mutate()
              }}
            >
              <Trash2 className="fs-size-3" /> Discard
            </button>
          )}
          <button
            type="button"
            className="fs-btn fs-btn-sm fs-btn-primary"
            disabled={!tree.data?.draft || deploy.isPending || save.isPending}
            onClick={() => {
              deploy.mutate(tree.data?.baseSha256)
            }}
          >
            {deploy.isPending ? (
              <Loader2 className="fs-size-3 fs-spin" />
            ) : (
              <Rocket className="fs-size-3" />
            )}
            Deploy
          </button>
        </div>
      </header>

      {(save.isError || deploy.isError || discard.isError) && (
        <div className="fs-alert fs-alert-danger fs-alert-flat">
          <AlertTriangle className="fs-size-4" />
          {apiErrorMessage(save.error ?? deploy.error ?? discard.error)}
        </div>
      )}
      {deploy.isSuccess && !deploy.isPending && (
        <div className="fs-alert fs-alert-ok fs-alert-flat">
          Deployed version {deploy.data.version?.version ?? '?'}
        </div>
      )}

      <div className="fs-editor-body">
        <WorkbenchBoundary>
          <Suspense fallback={<div className="fs-wb-loading">Loading editor…</div>}>
            <VscodeWorkbench
              functionName={functionName}
              files={sources}
              theme={theme}
              onSave={(path, content) => {
                save.mutate({ path, content })
              }}
            />
          </Suspense>
        </WorkbenchBoundary>
      </div>
    </div>
  )
}

function ReadOnly({ tree, className }: Readonly<{ tree: CodeTree; className?: string }>) {
  return (
    <div className={cn('fs-alert fs-alert-warn', className)}>
      <AlertTriangle className="fs-size-4" />
      <span>
        <strong>Inline editing unavailable.</strong>{' '}
        {REASON_TEXT[tree.reason ?? ''] ?? 'This function’s code cannot be edited here.'}
        {tree.imageUri && (
          <>
            {' '}
            <code>{tree.imageUri}</code>
          </>
        )}
      </span>
    </div>
  )
}
