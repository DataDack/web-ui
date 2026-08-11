import type { SourceEntry } from "../../../managed-apps.types"

/**
 * The flat path list GitHub returns, turned into something a tree can render.
 *
 * The API answers with every path in the commit — `src`, `src/main.tsx`,
 * `src/lib/util.ts` — in no particular order and with no parent/child links.
 * Everything below rebuilds those links once, at open, so scrolling and
 * expanding the tree afterwards is pure rendering.
 */
export interface TreeNode {
  /** The last segment — what the row shows. */
  name: string
  /** The full repo-relative path — the identity used everywhere else. */
  path: string
  type: "blob" | "tree"
  size: number
  /** Present on directories only, already sorted. */
  children?: TreeNode[]
}

/** Directories first, then case-insensitive by name — how every file browser
 *  a developer already uses orders a directory. */
function compareNodes(a: TreeNode, b: TreeNode): number {
  if (a.type !== b.type) return a.type === "tree" ? -1 : 1
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
}

/**
 * Build the nested tree.
 *
 * Directories are created on demand rather than taken from the listing's own
 * "tree" entries: a truncated listing can carry a file whose parent directory
 * never arrived, and dropping that file would be the browser quietly hiding
 * code that exists.
 */
export function buildTree(entries: SourceEntry[]): TreeNode[] {
  const roots: TreeNode[] = []
  const dirs = new Map<string, TreeNode>()

  const directory = (path: string): TreeNode => {
    const existing = dirs.get(path)
    if (existing) return existing
    const cut = path.lastIndexOf("/")
    const node: TreeNode = {
      name: cut === -1 ? path : path.slice(cut + 1),
      path,
      type: "tree",
      size: 0,
      children: [],
    }
    dirs.set(path, node)
    if (cut === -1) roots.push(node)
    else directory(path.slice(0, cut)).children?.push(node)
    return node
  }

  for (const entry of entries) {
    if (entry.type === "tree") {
      directory(entry.path)
      continue
    }
    const cut = entry.path.lastIndexOf("/")
    const node: TreeNode = {
      name: cut === -1 ? entry.path : entry.path.slice(cut + 1),
      path: entry.path,
      type: "blob",
      size: entry.size,
    }
    if (cut === -1) roots.push(node)
    else directory(entry.path.slice(0, cut)).children?.push(node)
  }

  const sortDeep = (nodes: TreeNode[]) => {
    nodes.sort(compareNodes)
    for (const node of nodes) if (node.children) sortDeep(node.children)
  }
  sortDeep(roots)
  return roots
}

/** Every directory on the way to `path`, itself excluded. */
export function ancestors(path: string): string[] {
  const out: string[] = []
  let cut = path.indexOf("/")
  while (cut !== -1) {
    out.push(path.slice(0, cut))
    cut = path.indexOf("/", cut + 1)
  }
  return out
}

/**
 * The file to open on, in the order a reader would look for it: the project's
 * own manifest, then a readme, then the first file in the built subtree.
 *
 * `rootDir` is where the project is actually built from, so in a monorepo this
 * lands on the deployed app rather than on the repository root.
 */
export function initialFile(entries: SourceEntry[], rootDir: string): string {
  const prefix = rootDir === "" ? "" : `${rootDir}/`
  const inRoot = entries.filter((e) => e.type === "blob" && e.path.startsWith(prefix))
  const named = (name: string) => inRoot.find((e) => e.path === prefix + name)?.path
  return (
    named("package.json") ??
    named("README.md") ??
    named("readme.md") ??
    inRoot.at(0)?.path ??
    entries.find((e) => e.type === "blob")?.path ??
    ""
  )
}

/**
 * Paths matching a search term, best matches first.
 *
 * Searching switches the pane to a flat result list rather than a pruned tree:
 * someone typing "route" wants to see where the matches ARE, and a tree with
 * every non-matching sibling removed reads as a broken repository.
 */
export function searchPaths(entries: SourceEntry[], term: string, limit = 200): SourceEntry[] {
  const needle = term.trim().toLowerCase()
  if (needle === "") return []
  const matches = entries.filter((e) => e.type === "blob" && e.path.toLowerCase().includes(needle))
  // A hit in the file NAME beats one anywhere in its directory chain — typing
  // "button" should surface Button.tsx before every file under src/button/.
  matches.sort((a, b) => {
    const aName = a.path
      .slice(a.path.lastIndexOf("/") + 1)
      .toLowerCase()
      .includes(needle)
    const bName = b.path
      .slice(b.path.lastIndexOf("/") + 1)
      .toLowerCase()
      .includes(needle)
    if (aName !== bName) return aName ? -1 : 1
    return a.path.length - b.path.length
  })
  return matches.slice(0, limit)
}
