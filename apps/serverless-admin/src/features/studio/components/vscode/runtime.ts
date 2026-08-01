import { initialize as initializeVscodeServices } from '@codingame/monaco-vscode-api/services'
// The package's exports map rewrites "./vscode/*" to "./vscode/src/*", so the
// specifier carries neither the `src/` segment nor a file extension.
import { URI } from '@codingame/monaco-vscode-api/vscode/vs/base/common/uri'
import getConfigurationServiceOverride, {
  updateUserConfiguration,
} from '@codingame/monaco-vscode-configuration-service-override'
import getExplorerServiceOverride from '@codingame/monaco-vscode-explorer-service-override'
import getFilesServiceOverride, {
  RegisteredFileSystemProvider,
  RegisteredMemoryFile,
  registerFileSystemOverlay,
} from '@codingame/monaco-vscode-files-service-override'
import getKeybindingsServiceOverride from '@codingame/monaco-vscode-keybindings-service-override'
import getLifecycleServiceOverride from '@codingame/monaco-vscode-lifecycle-service-override'
import getQuickAccessServiceOverride from '@codingame/monaco-vscode-quickaccess-service-override'
import getTextmateServiceOverride from '@codingame/monaco-vscode-textmate-service-override'
import getThemeServiceOverride from '@codingame/monaco-vscode-theme-service-override'
import getViewsServiceOverride from '@codingame/monaco-vscode-views-service-override'

/**
 * Default extensions: real themes, and real TextMate grammars for the runtimes
 * the catalog exposes.
 *
 * Loaded dynamically *after* initialize() rather than as top-level imports.
 * A static import runs at module evaluation, before the services exist, and the
 * contribution points are then registered against an empty registry — every
 * grammar fails with "Unknown language in contributes.grammars.language".
 */
async function loadDefaultExtensions(): Promise<void> {
  await Promise.all([
    import('@codingame/monaco-vscode-theme-defaults-default-extension'),
    import('@codingame/monaco-vscode-javascript-default-extension'),
    import('@codingame/monaco-vscode-typescript-basics-default-extension'),
    import('@codingame/monaco-vscode-python-default-extension'),
    import('@codingame/monaco-vscode-ruby-default-extension'),
    import('@codingame/monaco-vscode-json-default-extension'),
  ])
}

/** Scheme the virtual workspace is mounted under. */
const SCHEME = 'faas'

export function workspaceUri(functionName: string): URI {
  return URI.from({ scheme: SCHEME, path: `/${functionName}` })
}

function fileUri(functionName: string, filePath: string): URI {
  return URI.from({ scheme: SCHEME, path: `/${functionName}/${filePath}` })
}

function settings(theme: 'light' | 'dark'): string {
  return JSON.stringify({
    'workbench.colorTheme': theme === 'dark' ? 'Default Dark Modern' : 'Default Light Modern',
    'editor.minimap.enabled': false,
    'editor.fontSize': 13,
    'editor.tabSize': 2,
    'editor.renderWhitespace': 'none',
    'files.autoSave': 'off',
    'workbench.startupEditor': 'none',
    'workbench.activityBar.location': 'default',
    'telemetry.telemetryLevel': 'off',
    'update.mode': 'none',
  })
}

let provider: RegisteredFileSystemProvider | undefined
let started: Promise<void> | undefined

/**
 * Start-up progress, surfaced in the UI.
 *
 * VS Code's initialize() awaits participants contributed by each service
 * override; if one never settles the whole promise hangs with no error. Naming
 * the stage turns "it just spins" into something diagnosable.
 */
export type Stage = 'idle' | 'services' | 'extensions' | 'settings' | 'ready'
let stage: Stage = 'idle'
const stageListeners = new Set<(value: Stage) => void>()

export function onStage(listener: (value: Stage) => void): () => void {
  stageListeners.add(listener)
  listener(stage)
  return () => stageListeners.delete(listener)
}

function setStage(next: Stage) {
  stage = next
  for (const listener of stageListeners) listener(next)
}

/** Rejects rather than hanging forever, naming the stage that stalled. */
function withTimeout<T>(work: Promise<T>, ms: number, what: Stage): Promise<T> {
  return Promise.race([
    work,
    new Promise<never>((_resolve, reject) => {
      setTimeout(() => {
        reject(new Error(`timed out after ${String(ms / 1000)}s during "${what}"`))
      }, ms)
    }),
  ])
}
/** Files already mounted, so a remount updates rather than re-registers. */
const mounted = new Map<string, RegisteredMemoryFile>()

/**
 * VS Code's services are process-global and can only be initialised once per
 * page, so every editor instance shares one workbench. The promise is memoised
 * so concurrent mounts await the same start-up instead of racing it.
 */
export function ensureVscode(
  container: HTMLElement,
  functionName: string,
  theme: 'light' | 'dark',
): Promise<void> {
  started ??= (async () => {
    provider = new RegisteredFileSystemProvider(false)
    registerFileSystemOverlay(1, provider)

    setStage('services')
    await withTimeout(
      initializeVscodeServices(
        {
          ...getFilesServiceOverride(),
          ...getConfigurationServiceOverride(),
          ...getKeybindingsServiceOverride(),
          ...getLifecycleServiceOverride(),
          ...getThemeServiceOverride(),
          ...getTextmateServiceOverride(),
          ...getViewsServiceOverride(),
          ...getExplorerServiceOverride(),
          ...getQuickAccessServiceOverride(),
        },
        container,
        {
          workspaceProvider: {
            trusted: true,
            workspace: { folderUri: workspaceUri(functionName) },
            async open() {
              // The console owns navigation; VS Code must not swap workspaces out
              // from under the surrounding page.
              return Promise.resolve(false)
            },
          },
        },
      ),
      30_000,
      'services',
    )

    setStage('extensions')
    await withTimeout(loadDefaultExtensions(), 30_000, 'extensions')

    setStage('settings')
    await withTimeout(updateUserConfiguration(settings(theme)), 10_000, 'settings')

    setStage('ready')
  })()

  return started
}

/**
 * Publishes this function's package into the virtual workspace.
 *
 * Safe to call repeatedly: files arrive again on every refetch, and
 * registerFile throws on a path that is already mounted.
 */
export function mountFiles(functionName: string, files: { path: string; content: string }[]): void {
  if (!provider) return
  const encoder = new TextEncoder()
  for (const file of files) {
    const uri = fileUri(functionName, file.path)
    const key = uri.toString()
    const existing = mounted.get(key)
    if (existing) {
      // Rewriting in place keeps the open editor's model attached to the same
      // resource; re-registering would detach it.
      void existing.write(encoder.encode(file.content))
      continue
    }
    const registered = new RegisteredMemoryFile(uri, file.content)
    provider.registerFile(registered)
    mounted.set(key, registered)
  }
}

/** Fires whenever VS Code writes a file — which is what ⌘S does. */
export function onFileWritten(
  functionName: string,
  handler: (path: string, content: string) => void,
): () => void {
  if (!provider) return () => undefined
  const prefix = `/${functionName}/`
  const disposable = provider.onDidChangeFile((changes) => {
    for (const change of changes) {
      if (!change.resource.path.startsWith(prefix)) continue
      const relative = change.resource.path.slice(prefix.length)
      if (!relative) continue
      void readFile(change.resource).then((content) => {
        if (content !== undefined) handler(relative, content)
        return undefined
      })
    }
  })
  return () => {
    disposable.dispose()
  }
}

async function readFile(uri: URI): Promise<string | undefined> {
  if (!provider) return undefined
  try {
    return new TextDecoder().decode(await provider.readFile(uri))
  } catch {
    return undefined
  }
}

export function applyTheme(theme: 'light' | 'dark'): void {
  if (!started) return
  void updateUserConfiguration(settings(theme))
}
