import { baseName } from "./language"
import type { FunctionCodeEntry } from "../../../data/types"

/**
 * The flat archive listing, rendered as a tree.
 *
 * A zip has no directory entries — the control plane drops them on unpack — so
 * folders exist only as prefixes shared by file paths. They are synthesised
 * here, which also means an "empty folder" is not representable: creating one
 * writes a placeholder file, and deleting a folder's last file makes the folder
 * disappear. Both are stated in the UI rather than worked around.
 */

export interface TreeFile {
  kind: "file"
  /** Full archive path — the id every mutation uses. */
  path: string
  name: string
  depth: number
  sizeBytes: number
  binary: boolean
}

export interface TreeFolder {
  kind: "folder"
  /** Folder path with no trailing slash; also its collapse-state key. */
  path: string
  name: string
  depth: number
  children: TreeNode[]
}

export type TreeNode = TreeFile | TreeFolder

interface FolderDraft {
  folders: Map<string, FolderDraft>
  files: TreeFile[]
}

function emptyDraft(): FolderDraft {
  return { folders: new Map(), files: [] }
}

/**
 * Builds the nested tree. Folders sort before files and both sort by name, so
 * the listing is stable across saves — the archive's own order is packing
 * order, which changes whenever a file is added.
 */
export function buildTree(entries: readonly FunctionCodeEntry[]): TreeNode[] {
  const root = emptyDraft()

  for (const entry of entries) {
    const segments = entry.path.split("/")
    let node = root
    for (let index = 0; index < segments.length - 1; index += 1) {
      const segment = segments[index] ?? ""
      let child = node.folders.get(segment)
      if (!child) {
        child = emptyDraft()
        node.folders.set(segment, child)
      }
      node = child
    }
    node.files.push({
      kind: "file",
      path: entry.path,
      name: baseName(entry.path),
      depth: segments.length - 1,
      sizeBytes: entry.sizeBytes,
      binary: entry.binary,
    })
  }

  return materialise(root, "", 0)
}

function materialise(draft: FolderDraft, prefix: string, depth: number): TreeNode[] {
  const folders: TreeFolder[] = [...draft.folders.entries()]
    .map(([name, child]) => {
      const path = prefix === "" ? name : `${prefix}/${name}`
      return {
        kind: "folder" as const,
        path,
        name,
        depth,
        children: materialise(child, path, depth + 1),
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  const files = [...draft.files].sort((a, b) => a.name.localeCompare(b.name))
  return [...folders, ...files]
}

/**
 * The tree flattened to the rows actually visible, honouring collapsed
 * folders. Rendering a flat list keeps keyboard navigation and the filter
 * trivial, and avoids a recursive component that re-renders whole subtrees.
 */
export function visibleRows(nodes: readonly TreeNode[], collapsed: ReadonlySet<string>): TreeNode[] {
  const rows: TreeNode[] = []
  for (const node of nodes) {
    rows.push(node)
    if (node.kind === "folder" && !collapsed.has(node.path)) {
      rows.push(...visibleRows(node.children, collapsed))
    }
  }
  return rows
}

/**
 * Entries whose path matches the filter, plus every ancestor folder needed to
 * reach them. Matching on the full path (not just the name) is what lets
 * "lib/" narrow to a folder's contents.
 */
export function filterEntries(
  entries: readonly FunctionCodeEntry[],
  query: string,
): FunctionCodeEntry[] {
  const needle = query.trim().toLowerCase()
  if (needle === "") return [...entries]
  return entries.filter((entry) => entry.path.toLowerCase().includes(needle))
}

/** Every folder path in a tree — what "collapse all" and first-render expand need. */
export function folderPaths(nodes: readonly TreeNode[]): string[] {
  const paths: string[] = []
  for (const node of nodes) {
    if (node.kind === "folder") {
      paths.push(node.path)
      paths.push(...folderPaths(node.children))
    }
  }
  return paths
}
