import { useMemo, useState } from "react"

import { ChevronDown, ChevronRight, File, Folder, FolderOpen, Search } from "lucide-react"

import { formatBytes, Input, ScrollArea } from "@datadack/common-ui"

import { buildTree, searchPaths, type TreeNode } from "./source-tree"
import type { SourceEntry } from "../../../managed-apps.types"

interface FileTreeProps {
  entries: SourceEntry[]
  selected: string
  onSelect: (path: string) => void
  /** Directories open on first render — the built subtree and the opened file. */
  initialExpanded: string[]
  repoName?: string
}

const ROW =
  "flex w-full items-center gap-1.5 border-l-2 px-1.5 py-1 text-left text-[12px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring"

function FileRow({
  node,
  depth,
  selected,
  onSelect,
  expanded,
  onToggle,
}: Readonly<{
  node: TreeNode
  depth: number
  selected: string
  onSelect: (path: string) => void
  expanded: ReadonlySet<string>
  onToggle: (path: string) => void
}>) {
  const isOpen = expanded.has(node.path)
  const isSelected = node.type === "blob" && node.path === selected
  // Indent is inline rather than a class: the depth is data, and a Tailwind
  // class per level would need a lookup table capped at whatever nesting we
  // guessed at.
  const indent = { paddingLeft: `${String(depth * 12 + 6)}px` }

  return (
    <>
      <button
        type="button"
        style={indent}
        className={`${ROW} ${
          isSelected
            ? "border-primary bg-primary/10 font-medium text-foreground"
            : "border-transparent text-muted-foreground hover:glass-1-bg-raised hover:text-foreground"
        }`}
        onClick={() => {
          if (node.type === "tree") onToggle(node.path)
          else onSelect(node.path)
        }}
      >
        {node.type === "tree" ? (
          <>
            {isOpen ? (
              <ChevronDown className="size-3 shrink-0" />
            ) : (
              <ChevronRight className="size-3 shrink-0" />
            )}
            {isOpen ? (
              <FolderOpen className="size-3.5 shrink-0 text-status-info/70" />
            ) : (
              <Folder className="size-3.5 shrink-0 text-status-info/70" />
            )}
          </>
        ) : (
          // The chevron column is held open for files too, so names line up
          // with the directories they sit beside.
          <>
            <span className="size-3 shrink-0" />
            <File className="size-3.5 shrink-0 opacity-60" />
          </>
        )}
        <span className="min-w-0 flex-1 truncate">{node.name}</span>
        {node.type === "blob" && node.size > 0 && (
          <span className="shrink-0 font-mono text-[10px] text-muted-foreground/50">
            {formatBytes(node.size)}
          </span>
        )}
      </button>

      {node.type === "tree" &&
        isOpen &&
        node.children?.map((child) => (
          <FileRow
            key={child.path}
            node={child}
            depth={depth + 1}
            selected={selected}
            onSelect={onSelect}
            expanded={expanded}
            onToggle={onToggle}
          />
        ))}
    </>
  )
}

/**
 * The repository's files at the commit being viewed.
 *
 * Two modes in one pane: the tree, and — the moment anything is typed — a flat
 * list of matching paths. A repository large enough to need a search box is one
 * where the answer to "where is this file" matters more than where it sits in
 * the hierarchy.
 */
export function FileTree({
  entries,
  selected,
  onSelect,
  initialExpanded,
  repoName,
}: Readonly<FileTreeProps>) {
  const [query, setQuery] = useState("")
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set(initialExpanded))

  const nodes = useMemo(() => buildTree(entries), [entries])
  const results = useMemo(() => searchPaths(entries, query), [entries, query])

  const toggle = (path: string) => {
    setExpanded((current) => {
      const next = new Set(current)
      if (!next.delete(path)) next.add(path)
      return next
    })
  }

  const pane = () => {
    if (query.trim() === "") {
      return (
        <>
          {nodes.map((node) => (
            <FileRow
              key={node.path}
              node={node}
              depth={0}
              selected={selected}
              onSelect={onSelect}
              expanded={expanded}
              onToggle={toggle}
            />
          ))}
        </>
      )
    }
    if (results.length === 0) {
      return (
        <p className="px-2 py-3 text-[12px] text-muted-foreground">
          No file matches “{query.trim()}”
        </p>
      )
    }
    return (
      <>
        {results.map((entry) => {
          const cut = entry.path.lastIndexOf("/") + 1
          return (
            <button
              key={entry.path}
              type="button"
              className={`${ROW} ${
                entry.path === selected
                  ? "border-primary bg-primary/10 font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:glass-1-bg-raised hover:text-foreground"
              }`}
              onClick={() => {
                onSelect(entry.path)
              }}
            >
              <File className="size-3.5 shrink-0 opacity-60" />
              {/* The directory is muted and the file name is not: in a result
                  list the last segment is what was searched for. */}
              <span className="min-w-0 flex-1 truncate text-left" title={entry.path}>
                <span className="opacity-60">{entry.path.slice(0, cut)}</span>
                {entry.path.slice(cut)}
              </span>
            </button>
          )
        })}
      </>
    )
  }

  return (
    <div className="flex h-52 min-h-0 w-full shrink-0 flex-col border-b border-border/60 glass-1-bg md:h-full md:w-64 md:border-r md:border-b-0">
      <div className="flex min-h-11 items-center justify-between border-b border-border/60 px-3">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-foreground">Explorer</p>
          {repoName && (
            <p className="truncate font-mono text-[10px] text-muted-foreground">{repoName}</p>
          )}
        </div>
        <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
          {entries.length}
        </span>
      </div>
      <div className="relative border-b border-border/60 p-2">
        <Search className="absolute top-1/2 left-4 size-3.5 -translate-y-1/2 text-muted-foreground/60" />
        <Input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
          }}
          placeholder="Find a file"
          className="h-7 pl-7 text-[12px]"
        />
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="p-1.5">{pane()}</div>
      </ScrollArea>
    </div>
  )
}
