import { FileCode2, FileJson, FileText, type LucideIcon } from "lucide-react"

import { extensionOf } from "./language"

/**
 * The icon for a file, by extension. Its own module so both the tree and the
 * tab strip can use it without either importing the other's component.
 */
export function iconFor(path: string): LucideIcon {
  const ext = extensionOf(path)
  if (ext === "json") return FileJson
  if (ext === "md" || ext === "txt" || ext === "") return FileText
  return FileCode2
}
