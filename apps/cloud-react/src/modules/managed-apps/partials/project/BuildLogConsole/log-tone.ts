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

/**
 * A line the runner stamped, split into its time and its text.
 *
 * Workflow v9 prefixes every captured line with the wall-clock time it was
 * read, so the log carries its own timeline: a step that took four minutes is
 * visible as a gap rather than something to infer. Rendering that in the gutter
 * keeps the text column aligned; leaving it inline would push every line right
 * by nine characters and read as part of the output.
 */
export interface SplitLine {
  time: string
  text: string
}

/** HH:MM:SS at the very start, exactly as dd_stamp writes it. */
const STAMP = /^(\d{2}:\d{2}:\d{2}) (.*)$/s

/**
 * Terminal escape sequences: CSI (colours, cursor movement, erase-line), OSC
 * (titles, hyperlinks), and any other lone ESC pair. Build tools emit these
 * freely — vite and bun colour everything — and rendered literally they turn
 * "vite v8.2.1 building…" into "[36mvite v8.2.1 [32mbuilding…", which reads
 * as a corrupted log rather than a styled one.
 *
 * Stripped rather than rendered: the viewer already colours the lines that
 * matter (lineTone), and honouring cursor movement in a scrollback viewer is
 * a terminal emulator, not a log pane. The download keeps the raw bytes.
 */
// eslint-disable-next-line no-control-regex, sonarjs/no-control-regex -- matching control bytes is this regex's whole job
const ANSI = /\x1b\[[0-9;?]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)?|\x1b[@-_]/g

/** Remove terminal escape sequences. */
export function stripAnsi(text: string): string {
  return text.replace(ANSI, "")
}

/**
 * A progress bar redraws its line with carriage returns; in a scrollback pane
 * only the final frame is the line's content. Applied after the stamp split so
 * the stamp - which precedes any \r the content carries - survives.
 */
function lastFrame(text: string): string {
  const cr = text.lastIndexOf("\r")
  return cr === -1 ? text : text.slice(cr + 1)
}

/**
 * Split a stamped line. Logs from workflows before v9 carry no stamp and are
 * returned whole with an empty time, which is what keeps an old build readable
 * rather than showing its first eight characters in the wrong column.
 */
export function splitStamp(line: string): SplitLine {
  const clean = stripAnsi(line)
  const match = STAMP.exec(clean)
  if (!match) return { time: "", text: lastFrame(clean) }
  return { time: match[1], text: lastFrame(match[2]) }
}

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
