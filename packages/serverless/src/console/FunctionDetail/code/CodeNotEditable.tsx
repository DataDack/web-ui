import { Container, FileWarning, PackageX, ShieldAlert, Weight, type LucideIcon } from "lucide-react"

import { EmptyState, formatBytes } from "@datadack/common-ui"

import { MAX_INLINE_EDIT_BYTES, type CodeNotEditableReason } from "../../../data/types"
import type { FunctionDetailLabels } from "../labels"

const ICONS: Record<CodeNotEditableReason, LucideIcon> = {
  ImagePackage: Container,
  NoCodeArtifact: PackageX,
  ArchiveMissing: FileWarning,
  PackageTooLarge: Weight,
  NotAZipArchive: FileWarning,
}

export interface CodeNotEditableProps {
  reason: CodeNotEditableReason | undefined
  labels: FunctionDetailLabels
  className?: string
}

/**
 * The read-only state, one per reason the control plane gives for refusing to
 * open a package inline. It is deliberately a full panel rather than a banner
 * over a disabled editor: there is nothing behind it to read.
 */
export function CodeNotEditable({ reason, labels, className }: Readonly<CodeNotEditableProps>) {
  const copy = labels.code.notEditable
  const icon = (reason && ICONS[reason]) ?? ShieldAlert

  let description = copy.unknown
  if (reason === "PackageTooLarge") description = copy.PackageTooLarge(formatBytes(MAX_INLINE_EDIT_BYTES))
  else if (reason) description = copy[reason]

  return (
    <EmptyState icon={icon} title={copy.title} description={description} className={className} />
  )
}
