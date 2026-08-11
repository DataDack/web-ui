// Colour for one line of build output.
//
// A build log is a wall of grey in which the two lines that matter — the
// warning that explains the deprecation and the error that ended the run — look
// exactly like the 300 lines of dependency noise around them. Tinting them is
// the difference between reading a log and searching one.
//
// The patterns are deliberately narrow. A tool that prints "0 errors" or
// "no warnings" is reporting success, and colouring that red teaches people to
// ignore the colour, which is worse than having none. Everything here is either
// a machine-readable annotation or a prefix a build tool emits at the START of
// the line it is describing.

export type LogTone = "normal" | "warning" | "danger"

/** GitHub Actions annotations — unambiguous, whatever printed them. */
const ANNOTATION_ERROR = "::error"
const ANNOTATION_WARNING = "::warning"

/**
 * Line-leading markers. Anchored, because "error" inside a sentence is usually
 * a tool talking ABOUT errors ("run with --verbose to see the error"), while a
 * line that opens with it is one.
 */
const DANGER_PREFIXES = [
  "error",
  "error:",
  "err!",
  "npm err!",
  "npm error",
  "fatal:",
  "failed",
  "panic:",
  "✗",
  "×",
]

const WARNING_PREFIXES = ["warn", "warn:", "warning", "warning:", "npm warn", "deprecated"]

/** Anywhere in the line: these carry their own context and cannot be softened. */
const DANGER_ANYWHERE = [
  "error:",
  " failed with ",
  "exit code 1",
  "traceback (most recent call last)",
]

function startsWithAny(line: string, prefixes: string[]): boolean {
  return prefixes.some(
    (prefix) =>
      line.startsWith(prefix) &&
      (line.length === prefix.length || !/[a-z]/.test(line[prefix.length])),
  )
}

/**
 * How one raw log line should read. Cheap on purpose: it runs for every line of
 * a log that can be tens of thousands of lines long, so it is prefix and
 * substring checks on one lower-cased copy, never a regular expression.
 */
export function lineTone(line: string): LogTone {
  const trimmed = line.trim()
  if (trimmed === "") return "normal"
  const lower = trimmed.toLowerCase()

  if (lower.startsWith(ANNOTATION_ERROR)) return "danger"
  if (lower.startsWith(ANNOTATION_WARNING)) return "warning"

  // "0 errors" and "no errors found" are the tool saying the opposite, and are
  // the reason this is not a bare substring match on "error".
  if (/^(0|no)\s/.test(lower)) return "normal"

  if (startsWithAny(lower, DANGER_PREFIXES)) return "danger"
  if (DANGER_ANYWHERE.some((needle) => lower.includes(needle))) return "danger"
  if (startsWithAny(lower, WARNING_PREFIXES)) return "warning"

  return "normal"
}
