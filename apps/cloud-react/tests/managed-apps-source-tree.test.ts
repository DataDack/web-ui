import { describe, expect, test } from "bun:test"

import type { SourceEntry } from "@/modules/managed-apps/managed-apps.types"
import {
  ancestors,
  buildTree,
  initialFile,
  searchPaths,
} from "@/modules/managed-apps/partials/project/SourceBrowser/source-tree"

/* ── Fixtures ──────────────────────────────────────────────────────────── */

function blob(path: string, size = 100): SourceEntry {
  return { path, type: "blob", size }
}

function tree(path: string): SourceEntry {
  return { path, type: "tree", size: 0 }
}

/* ── buildTree ─────────────────────────────────────────────────────────── */

describe("buildTree", () => {
  test("nests files under the directories they belong to", () => {
    const roots = buildTree([
      tree("src"),
      blob("src/main.tsx"),
      blob("package.json"),
      tree("src/lib"),
      blob("src/lib/util.ts"),
    ])

    // Directories first, then files, each alphabetically.
    expect(roots.map((n) => n.path)).toEqual(["src", "package.json"])
    const src = roots[0]
    expect(src.children?.map((n) => n.path)).toEqual(["src/lib", "src/main.tsx"])
    expect(src.children?.[0].children?.map((n) => n.path)).toEqual(["src/lib/util.ts"])
  })

  test("keeps a file whose parent directory entry never arrived", () => {
    // GitHub truncates very large listings, so a blob can outlive its tree
    // entry. Dropping it would hide code that exists in the commit.
    const roots = buildTree([blob("apps/web/index.html")])
    expect(roots.map((n) => n.path)).toEqual(["apps"])
    expect(roots[0].children?.[0].children?.map((n) => n.path)).toEqual(["apps/web/index.html"])
  })

  test("orders case-insensitively", () => {
    const roots = buildTree([blob("Zeta.ts"), blob("alpha.ts"), blob("Beta.ts")])
    expect(roots.map((n) => n.name)).toEqual(["alpha.ts", "Beta.ts", "Zeta.ts"])
  })
})

/* ── ancestors ─────────────────────────────────────────────────────────── */

describe("ancestors", () => {
  test("lists every directory on the way down, excluding the path itself", () => {
    expect(ancestors("apps/web/src/main.tsx")).toEqual(["apps", "apps/web", "apps/web/src"])
  })

  test("a root-level file has none", () => {
    expect(ancestors("package.json")).toEqual([])
  })
})

/* ── initialFile ───────────────────────────────────────────────────────── */

describe("initialFile", () => {
  const entries = [
    blob("package.json"),
    blob("README.md"),
    tree("apps/web"),
    blob("apps/web/package.json"),
    blob("apps/web/src/main.tsx"),
  ]

  test("opens on the manifest of the subtree the project builds from", () => {
    expect(initialFile(entries, "apps/web")).toBe("apps/web/package.json")
  })

  test("falls back to the repository root when nothing is configured", () => {
    expect(initialFile(entries, "")).toBe("package.json")
  })

  test("prefers a readme when there is no manifest", () => {
    expect(initialFile([blob("README.md"), blob("src/main.tsx")], "")).toBe("README.md")
  })

  test("an empty commit selects nothing rather than guessing", () => {
    expect(initialFile([], "")).toBe("")
  })
})

/* ── searchPaths ───────────────────────────────────────────────────────── */

describe("searchPaths", () => {
  const entries = [
    tree("src/button"),
    blob("src/button/styles.css"),
    blob("src/Button.tsx"),
    blob("docs/buttons.md"),
  ]

  test("ranks a hit in the file name above one in its directory chain", () => {
    expect(searchPaths(entries, "button").map((e) => e.path)).toEqual([
      "src/Button.tsx",
      "docs/buttons.md",
      "src/button/styles.css",
    ])
  })

  test("never returns directories — they are not openable", () => {
    expect(searchPaths(entries, "src").every((e) => e.type === "blob")).toBe(true)
  })

  test("an empty term is not a search", () => {
    expect(searchPaths(entries, "   ")).toEqual([])
  })
})
