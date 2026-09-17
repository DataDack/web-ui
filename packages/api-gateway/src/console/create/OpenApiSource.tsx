import { useRef, useState } from "react"

import { FileUp } from "lucide-react"

import { Button, Textarea } from "@datadack/common-ui"

import { Field } from "./parts"

/** What a pasted or uploaded document parses to, before anything is sent. */
export interface ParsedDefinition {
  title: string
  version: string
  /** "GET /pets" — the operations the import can turn into routes. */
  operations: string[]
}

const OPERATIONS = new Set(["get", "post", "put", "patch", "delete", "head", "options"])

/**
 * Reads the document the way the control plane will, so the operator sees
 * what an import is about to create BEFORE creating it.
 *
 * JSON only, and said so: the control plane parses the body as JSON, and a
 * YAML document would come back as a parse error about a character the
 * operator never typed.
 */
export function parseDefinition(text: string): { parsed?: ParsedDefinition; error?: string } {
  if (text.trim() === "") return { error: "Paste or upload an OpenAPI definition." }
  let doc: unknown
  try {
    doc = JSON.parse(text)
  } catch {
    return {
      error: text.trimStart().startsWith("{")
        ? "This is not valid JSON."
        : "The definition must be JSON. Convert a YAML document to JSON first.",
    }
  }
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) {
    return { error: "The definition must be a JSON object." }
  }
  const record = doc as Record<string, unknown>
  if (typeof record.openapi !== "string" && typeof record.swagger !== "string") {
    return { error: 'This does not look like an OpenAPI document: it has no "openapi" field.' }
  }
  const info = (record.info ?? {}) as Record<string, unknown>
  const operations: string[] = []
  const paths = (record.paths ?? {}) as Record<string, unknown>
  for (const [path, item] of Object.entries(paths)) {
    if (!item || typeof item !== "object") continue
    for (const method of Object.keys(item)) {
      if (OPERATIONS.has(method.toLowerCase())) operations.push(`${method.toUpperCase()} ${path}`)
    }
  }
  return {
    parsed: {
      title: typeof info.title === "string" ? info.title : "",
      version: typeof info.version === "string" ? info.version : "",
      operations,
    },
  }
}

export function OpenApiSource({
  value,
  onChange,
  error,
}: Readonly<{ value: string; onChange: (value: string) => void; error?: string }>) {
  const input = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState("")
  const { parsed } = parseDefinition(value)

  return (
    <Field
      label="API definition"
      htmlFor="openapi-body"
      hint="An OpenAPI 3 document in JSON. Each operation becomes a route; operations with no backend are created without an integration."
      error={error}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            input.current?.click()
          }}
        >
          <FileUp /> Choose file
        </Button>
        <span className="text-muted-foreground truncate text-xs">
          {fileName || "or paste the definition below"}
        </span>
        <input
          ref={input}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (!file) return
            setFileName(file.name)
            void file.text().then(onChange)
            event.target.value = ""
          }}
        />
      </div>
      <Textarea
        id="openapi-body"
        value={value}
        rows={12}
        spellCheck={false}
        aria-invalid={Boolean(error)}
        placeholder={
          '{\n  "openapi": "3.0.0",\n  "info": { "title": "Orders", "version": "1.0" },\n  "paths": { "/orders": { "get": {} } }\n}'
        }
        onChange={(event) => {
          onChange(event.target.value)
        }}
        className="font-mono text-xs leading-5"
      />
      {parsed ? (
        <div className="border-border bg-muted/20 rounded-lg border px-3 py-2.5">
          <p className="text-foreground text-[13px]">
            <span className="font-medium">{parsed.title || "Untitled"}</span>
            {parsed.version ? (
              <span className="text-muted-foreground"> · {parsed.version}</span>
            ) : null}
            <span className="text-muted-foreground">
              {" "}
              · {parsed.operations.length} {parsed.operations.length === 1 ? "route" : "routes"}
            </span>
          </p>
          {parsed.operations.length > 0 ? (
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {parsed.operations.slice(0, 12).map((operation) => (
                <li
                  key={operation}
                  className="border-border text-muted-foreground rounded border px-1.5 py-0.5 font-mono text-[11px]"
                >
                  {operation}
                </li>
              ))}
              {parsed.operations.length > 12 ? (
                <li className="text-muted-foreground text-[11px]">
                  +{parsed.operations.length - 12} more
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
      ) : null}
    </Field>
  )
}

/** A small, complete document the "Example API" option imports. */
export const EXAMPLE_DEFINITION = JSON.stringify(
  {
    openapi: "3.0.0",
    info: { title: "PetStore", version: "1.0.0", description: "An example API." },
    paths: {
      "/pets": {
        get: { operationId: "listPets", summary: "List all pets" },
        post: { operationId: "createPet", summary: "Create a pet" },
      },
      "/pets/{petId}": {
        get: { operationId: "getPet", summary: "Get one pet" },
        delete: { operationId: "deletePet", summary: "Delete a pet" },
      },
    },
  },
  null,
  2,
)
