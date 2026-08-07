/**
 * File-name → editor language, and the display name the status bar shows.
 *
 * Monaco resolves a language from a model URI, but the editor here is fed
 * values rather than URIs (a deployment package is not a filesystem, and two
 * functions can hold the same path), so the mapping is done explicitly.
 *
 * Only languages whose Monaco contribution the apps actually bundle appear
 * here — see each console's `lib/monaco-setup.ts`. An unknown extension falls
 * back to `plaintext`, which always works.
 */

/** Extension (no dot, lowercased) → Monaco language id. */
const BY_EXTENSION: Record<string, string> = {
  js: "javascript",
  cjs: "javascript",
  mjs: "javascript",
  jsx: "javascript",
  ts: "typescript",
  cts: "typescript",
  mts: "typescript",
  tsx: "typescript",
  py: "python",
  pyi: "python",
  go: "go",
  rb: "ruby",
  java: "java",
  cs: "csharp",
  rs: "rust",
  php: "php",
  json: "json",
  jsonc: "json",
  md: "markdown",
  markdown: "markdown",
  yml: "yaml",
  yaml: "yaml",
  toml: "ini",
  ini: "ini",
  cfg: "ini",
  sh: "shell",
  bash: "shell",
  zsh: "shell",
  env: "shell",
  sql: "sql",
  html: "html",
  htm: "html",
  css: "css",
  xml: "xml",
  txt: "plaintext",
}

/** Whole file names that carry no extension but are still recognisable. */
const BY_FILENAME: Record<string, string> = {
  dockerfile: "dockerfile",
  makefile: "plaintext",
  ".gitignore": "plaintext",
  ".dockerignore": "plaintext",
  ".npmrc": "ini",
  "go.mod": "plaintext",
  "go.sum": "plaintext",
  "requirements.txt": "plaintext",
}

/** Human names for the status bar; anything absent shows its language id. */
const DISPLAY_NAMES: Record<string, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  go: "Go",
  ruby: "Ruby",
  java: "Java",
  csharp: "C#",
  rust: "Rust",
  php: "PHP",
  json: "JSON",
  markdown: "Markdown",
  yaml: "YAML",
  ini: "INI",
  shell: "Shell",
  sql: "SQL",
  html: "HTML",
  css: "CSS",
  xml: "XML",
  dockerfile: "Dockerfile",
  plaintext: "Plain Text",
}

/** The last path segment. */
export function baseName(path: string): string {
  const cut = path.lastIndexOf("/")
  return cut === -1 ? path : path.slice(cut + 1)
}

/** Everything before the last segment, or "" for a root-level file. */
export function dirName(path: string): string {
  const cut = path.lastIndexOf("/")
  return cut === -1 ? "" : path.slice(0, cut)
}

/** The extension without its dot, lowercased. Empty when there is none. */
export function extensionOf(path: string): string {
  const name = baseName(path)
  // A leading dot is part of the name (".gitignore"), not an extension.
  const cut = name.lastIndexOf(".")
  return cut <= 0 ? "" : name.slice(cut + 1).toLowerCase()
}

/** The Monaco language id for a path. */
export function languageFor(path: string): string {
  const name = baseName(path).toLowerCase()
  const byName = BY_FILENAME[name]
  if (byName) return byName
  return BY_EXTENSION[extensionOf(path)] ?? "plaintext"
}

/** The language's display name, for the status bar. */
export function languageLabel(language: string): string {
  return DISPLAY_NAMES[language] ?? language
}

/**
 * The file a function's handler points at, so the editor opens on the code
 * someone came to read rather than on whatever sorted first.
 *
 * A handler is `<module path>.<exported symbol>` ("index.handler",
 * "src/app.lambda_handler"), and the module is a path with the extension left
 * off — which extension is the runtime's business, not ours. So the module
 * part is matched against each file's path minus its extension.
 */
export function handlerFile(handler: string | undefined, paths: readonly string[]): string {
  const editable = paths[0]
  if (!handler) return editable ?? ""
  const cut = handler.lastIndexOf(".")
  const modulePath = cut === -1 ? handler : handler.slice(0, cut)
  const match = paths.find((path) => {
    const ext = extensionOf(path)
    return (ext === "" ? path : path.slice(0, -(ext.length + 1))) === modulePath
  })
  return match ?? editable ?? ""
}
