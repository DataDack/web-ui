import { TriangleAlert } from "lucide-react"

import { Button } from "@datadack/common-ui"

import type { ImportApiResult } from "../../data/schemas"

/**
 * Shown instead of navigating away when an import succeeded WITH warnings.
 * An import that mapped four operations out of six is a success the operator
 * still needs told about, before the detail page makes it look complete.
 */
export function ImportWarnings({
  result,
  onOpen,
}: Readonly<{ result: ImportApiResult; onOpen: () => void }>) {
  return (
    <div
      role="status"
      className="border-status-warning/40 bg-status-warning-bg mb-5 rounded-xl border px-5 py-4"
    >
      <p className="text-foreground flex items-center gap-2 text-sm font-semibold">
        <TriangleAlert className="text-status-warning size-4" />
        {result.api.name} was imported, but {result.warnings.length}{" "}
        {result.warnings.length === 1 ? "part" : "parts"} of the definition could not be mapped
      </p>
      <ul className="text-foreground mt-2 list-disc pl-6 font-mono text-xs leading-6">
        {result.warnings.map((warning) => (
          <li key={warning}>{warning}</li>
        ))}
      </ul>
      <Button variant="gold" size="sm" className="mt-3" onClick={onOpen}>
        Open API
      </Button>
    </div>
  )
}
