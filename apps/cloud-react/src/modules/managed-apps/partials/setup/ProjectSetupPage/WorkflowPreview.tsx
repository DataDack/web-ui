import { useState } from "react"

import { Button } from "@datadack/common-ui"
import { Check, ChevronDown, ChevronRight, Copy } from "lucide-react"
import { toast } from "sonner"

interface WorkflowPreviewProps {
  yaml: string
}

/** How many lines are shown before the reader has to ask for the rest. */
const PREVIEW_LINES = 16

/**
 * Minimal YAML colouring, done by hand.
 *
 * A syntax-highlighting library would be tens of kilobytes to render one
 * generated file we control the shape of. Four token classes — comment, key,
 * string, list marker — are all this file contains, and they are what make it
 * skimmable rather than a wall of monospace.
 */
function highlight(line: string, key: string) {
  const comment = line.indexOf("#")
  // A whole-line comment (the header block explaining the file) is the most
  // common case and reads best fully muted.
  if (line.trimStart().startsWith("#")) {
    return (
      <span key={key} className="text-muted-foreground/60 italic">
        {line || " "}
      </span>
    )
  }

  const code = comment === -1 ? line : line.slice(0, comment)
  const trailing = comment === -1 ? "" : line.slice(comment)

  // `  key: value` — split so the key can be tinted without touching indent.
  // Scanned rather than matched with a regex: the obvious pattern
  // (/^(\s*-?\s*)([\w.-]+):/) nests quantifiers and backtracks badly, and this
  // runs over every line of every render.
  let cursor = 0
  while (cursor < code.length && (code[cursor] === " " || code[cursor] === "\t")) cursor += 1
  if (code[cursor] === "-" && code[cursor + 1] === " ") cursor += 2
  const nameStart = cursor
  while (cursor < code.length && /[\w.-]/.test(code[cursor] ?? "")) cursor += 1

  if (cursor === nameStart || code[cursor] !== ":") {
    return (
      <span key={key} className="text-foreground/80">
        {code || " "}
        {trailing && <span className="text-muted-foreground/60 italic">{trailing}</span>}
      </span>
    )
  }

  const indent = code.slice(0, nameStart)
  const name = code.slice(nameStart, cursor)
  const colon = ":"
  const rest = code.slice(cursor + 1)

  return (
    <span key={key}>
      <span className="text-muted-foreground/70">{indent}</span>
      <span className="text-status-info">{name}</span>
      <span className="text-muted-foreground/70">{colon}</span>
      <span className="text-foreground/80">{rest}</span>
      {trailing && <span className="text-muted-foreground/60 italic">{trailing}</span>}
    </span>
  )
}

/**
 * The exact file the pull request adds.
 *
 * Shown here rather than only on GitHub: the merge is the customer's security
 * decision — it is what lets our workflow run on their runners with their
 * minutes — and nobody should have to leave to find out what they are
 * approving.
 */
export function WorkflowPreview({ yaml }: Readonly<WorkflowPreviewProps>) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const lines = yaml.split("\n")
  const truncated = lines.length > PREVIEW_LINES
  const shown = expanded || !truncated ? lines : lines.slice(0, PREVIEW_LINES)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(yaml)
      setCopied(true)
      toast.success("Workflow copied")
      setTimeout(() => {
        setCopied(false)
      }, 1500)
    } catch {
      toast.error("Could not copy the workflow")
    }
  }

  return (
    <div className="w-full min-w-0 space-y-2">
      <div className="relative w-full min-w-0">
        {/* An icon-only control. The shared CopyButton falls back to
				    rendering its `value` when given no label, which for a 109-line
				    file paints the whole workflow across the page. */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Copy the workflow file"
          className="absolute top-2 right-2 z-10 size-7 bg-background/80 backdrop-blur"
          onClick={() => void copy()}
        >
          {copied ? (
            <Check className="size-3.5 text-status-success" />
          ) : (
            <Copy className="size-3.5" />
          )}
        </Button>

        <pre className="max-h-[32rem] w-full min-w-0 overflow-auto rounded-lg border border-border/60 bg-muted/40 py-3 pr-12 pl-0 font-mono text-[11px] leading-[1.6]">
          <code className="block">
            {shown.map((line, index) => (
              // Log-style content: the index IS the line identity,
              // and lines are only ever appended.
              // eslint-disable-next-line react/no-array-index-key
              <span key={index} className="flex">
                <span className="w-11 shrink-0 pr-3 text-right text-muted-foreground/35 select-none">
                  {index + 1}
                </span>
                {highlight(line, `l${String(index)}`)}
              </span>
            ))}
          </code>
        </pre>
      </div>

      {truncated && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-[12px] text-muted-foreground"
          onClick={() => {
            setExpanded((current) => !current)
          }}
        >
          {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          {expanded ? "Show less" : `Show all ${String(lines.length)} lines`}
        </Button>
      )}
    </div>
  )
}
