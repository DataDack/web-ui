import { useMemo, useState } from "react"

import { ChevronDown, ChevronRight, FilePlus2, FolderOpen, FolderPlus, Search } from "lucide-react"

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  Input,
  css,
  cx,
  fontMono,
  formatBytes,
  media,
  mix,
} from "@datadack/common-ui"

import type { FunctionCodeEntry } from "../../../data/types"
import type { FunctionDetailLabels } from "../labels"
import { iconFor } from "./fileIcon"
import { buildTree, filterEntries, visibleRows, type TreeNode } from "./tree"

const sidebar = css`
  display: flex;
  width: 100%;
  max-height: 184px;
  flex-shrink: 0;
  flex-direction: column;
  min-height: 0;
  border-bottom: 1px solid ${mix("--border", 60)};
  background: var(--glass-1-bg);

  ${media.md} {
    width: 248px;
    max-height: none;
    border-right: 1px solid ${mix("--border", 60)};
    border-bottom: 0;
  }
`

const head = css`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 10px 6px;
`

const heading = css`
  flex: 1;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted-foreground);
`

const headButton = css`
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  padding: 2px;
  color: var(--muted-foreground);
  cursor: pointer;

  &:hover {
    color: var(--foreground);
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`

const searchRow = css`
  position: relative;
  padding: 0 10px 8px;
`

const searchIcon = css`
  position: absolute;
  left: 18px;
  top: 50%;
  transform: translateY(-50%);
  width: 12px;
  height: 12px;
  color: ${mix("--muted-foreground", 70)};
  pointer-events: none;
`

const searchInput = css`
  height: 28px;
  padding-left: 26px;
  font-size: 12px;
`

const list = css`
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 0 6px 10px;
`

const rootRow = css`
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 12px 5px;
  font-family: ${fontMono};
  font-size: 11px;
  font-weight: 600;
  color: var(--foreground);
`

const rootIcon = css`
  width: 13px;
  height: 13px;
  color: var(--brand-gold);
`

const row = css`
  display: flex;
  width: 100%;
  align-items: center;
  gap: 7px;
  border: none;
  border-radius: 0.375rem;
  background: transparent;
  padding: 5px 8px;
  font-family: ${fontMono};
  font-size: 11.5px;
  color: var(--muted-foreground);
  text-align: left;
  cursor: pointer;

  &:hover {
    background: ${mix("--accent", 45)};
    color: var(--foreground);
  }
`

const rowActive = css`
  background: ${mix("--accent", 75)};
  color: var(--foreground);
`

const rowIcon = css`
  width: 12px;
  height: 12px;
  flex-shrink: 0;
`

const rowName = css`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const rowMeta = css`
  flex-shrink: 0;
  font-size: 10px;
  color: ${mix("--muted-foreground", 55)};
`

const binaryChip = css`
  flex-shrink: 0;
  border-radius: 9999px;
  padding: 0 6px;
  font-size: 9.5px;
  color: var(--muted-foreground);
  box-shadow: inset 0 0 0 1px ${mix("--border", 70)};
`

const emptyNote = css`
  padding: 16px 10px;
  font-size: 12px;
  color: var(--muted-foreground);
`

/** Indent per nesting level; matches the chevron's own width so it lines up. */
const INDENT_PX = 12

export interface CodeFileTreeProps {
  rootLabel: string
  entries: readonly FunctionCodeEntry[]
  activePath: string
  /** Paths whose buffer differs from the draft — shown with a gold name. */
  dirtyPaths: ReadonlySet<string>
  canEdit: boolean
  labels: FunctionDetailLabels
  onOpen: (path: string) => void
  onNewFile: (parentFolder: string) => void
  onNewFolder: (parentFolder: string) => void
  onRename: (path: string) => void
  onDelete: (path: string) => void
  className?: string
}

/**
 * The package's file tree.
 *
 * Folders are synthesised from shared path prefixes (a zip carries no
 * directory entries), which is why every action is expressed as a path rather
 * than a node id: the control plane only ever knows paths.
 */
export function CodeFileTree({
  rootLabel,
  entries,
  activePath,
  dirtyPaths,
  canEdit,
  labels,
  onOpen,
  onNewFile,
  onNewFolder,
  onRename,
  onDelete,
  className,
}: Readonly<CodeFileTreeProps>) {
  const copy = labels.code.tree
  const [query, setQuery] = useState("")
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set())

  const filtered = useMemo(() => filterEntries(entries, query), [entries, query])
  const tree = useMemo(() => buildTree(filtered), [filtered])
  // A search that hides a folder's contents behind a collapse is a search that
  // found nothing, so filtering expands everything for as long as it is active.
  const rows = useMemo(
    () => visibleRows(tree, query.trim() === "" ? collapsed : new Set<string>()),
    [tree, collapsed, query],
  )

  const toggle = (path: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  return (
    <aside className={cx(sidebar, className)}>
      <div className={head}>
        <span className={heading}>{copy.heading}</span>
        {/* Native `title` rather than <Tooltip>: that primitive needs a
            TooltipProvider ancestor, and only one of the two consoles mounts
            one — a shared component must not depend on which. */}
        <button
          type="button"
          className={headButton}
          aria-label={copy.newFile}
          title={copy.newFile}
          disabled={!canEdit}
          onClick={() => {
            onNewFile("")
          }}
        >
          <FilePlus2 size={14} />
        </button>
        <button
          type="button"
          className={headButton}
          aria-label={copy.newFolder}
          title={copy.newFolder}
          disabled={!canEdit}
          onClick={() => {
            onNewFolder("")
          }}
        >
          <FolderPlus size={14} />
        </button>
      </div>

      <div className={searchRow}>
        <Search className={searchIcon} aria-hidden />
        <Input
          value={query}
          placeholder={copy.filter}
          aria-label={copy.filter}
          className={searchInput}
          onChange={(event) => {
            setQuery(event.target.value)
          }}
        />
      </div>

      <div className={rootRow} title={rootLabel}>
        <FolderOpen className={rootIcon} aria-hidden />
        <span className={rowName}>{rootLabel}</span>
      </div>

      <div className={list}>
        {entries.length === 0 && <p className={emptyNote}>{copy.empty}</p>}
        {entries.length > 0 && rows.length === 0 && <p className={emptyNote}>{copy.noMatches}</p>}

        {rows.map((node) => (
          <TreeRow
            key={`${node.kind}:${node.path}`}
            node={node}
            active={node.kind === "file" && node.path === activePath}
            dirty={node.kind === "file" && dirtyPaths.has(node.path)}
            collapsed={node.kind === "folder" && collapsed.has(node.path)}
            canEdit={canEdit}
            labels={labels}
            onActivate={() => {
              if (node.kind === "folder") toggle(node.path)
              else onOpen(node.path)
            }}
            onNewFile={onNewFile}
            onNewFolder={onNewFolder}
            onRename={onRename}
            onDelete={onDelete}
          />
        ))}
      </div>
    </aside>
  )
}

interface TreeRowProps {
  node: TreeNode
  active: boolean
  dirty: boolean
  collapsed: boolean
  canEdit: boolean
  labels: FunctionDetailLabels
  onActivate: () => void
  onNewFile: (parentFolder: string) => void
  onNewFolder: (parentFolder: string) => void
  onRename: (path: string) => void
  onDelete: (path: string) => void
}

function TreeRow({
  node,
  active,
  dirty,
  collapsed,
  canEdit,
  labels,
  onActivate,
  onNewFile,
  onNewFolder,
  onRename,
  onDelete,
}: Readonly<TreeRowProps>) {
  const copy = labels.code.tree
  const isFolder = node.kind === "folder"
  const folderIcon = collapsed ? ChevronRight : ChevronDown
  const Icon = isFolder ? folderIcon : iconFor(node.path)
  // A file's context menu acts on the file; a folder's creates inside it.
  const parentFolder = isFolder ? node.path : node.path.split("/").slice(0, -1).join("/")

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          type="button"
          className={cx(row, active && rowActive)}
          style={{ paddingLeft: `${String(8 + node.depth * INDENT_PX)}px` }}
          title={node.path}
          onClick={onActivate}
        >
          <Icon className={rowIcon} aria-hidden />
          <span
            className={rowName}
            style={dirty ? { color: "var(--brand-gold)" } : undefined}
          >
            {node.name}
          </span>
          {node.kind === "file" && node.binary && (
            <span className={binaryChip}>{copy.binary}</span>
          )}
          {node.kind === "file" && !node.binary && (
            <span className={rowMeta}>{formatBytes(node.sizeBytes)}</span>
          )}
        </button>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuItem
          disabled={!canEdit}
          onSelect={() => {
            onNewFile(parentFolder)
          }}
        >
          <FilePlus2 size={14} />
          {copy.newFile}
        </ContextMenuItem>
        <ContextMenuItem
          disabled={!canEdit}
          onSelect={() => {
            onNewFolder(parentFolder)
          }}
        >
          <FolderPlus size={14} />
          {copy.newFolder}
        </ContextMenuItem>
        {node.kind === "file" && (
          <>
            <ContextMenuItem
              disabled={!canEdit}
              onSelect={() => {
                onRename(node.path)
              }}
            >
              {copy.rename}
            </ContextMenuItem>
            <ContextMenuItem
              variant="destructive"
              disabled={!canEdit}
              onSelect={() => {
                onDelete(node.path)
              }}
            >
              {copy.delete}
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}
