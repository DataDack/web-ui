/**
 * Schedules, in the shapes the control plane actually accepts.
 *
 * The platform does NOT take general cron. `nextTriggerFire` in the control
 * plane (common/platform/service.go) understands exactly six forms, and
 * everything else is a 400:
 *
 *   @once                  fire immediately, then the trigger completes
 *   @hourly                on the hour
 *   @daily                 00:00 UTC
 *   @every <duration>      a Go duration — 30s, 15m, 2h, 1h30m (no day unit)
 *   rate(N unit)           second(s) | minute(s) | hour(s) | day(s)
 *   M H * * *              five-field cron, but day/month/weekday MUST be *
 *
 * So "every Monday at 09:00" is not expressible, and a console that let someone
 * type it would be promising something the scheduler cannot keep. The picker
 * built on this module offers the forms that work and validates the escape
 * hatch against the same rules the server uses — a schedule this file accepts
 * is one the control plane accepts.
 *
 * Everything is UTC. The control plane computes fire times with `time.UTC` and
 * stores them that way; showing a local time here would drift by the viewer's
 * offset and mean two people reading the same trigger disagree about when it
 * runs.
 */

import type { PutTriggerInput } from "../../../data/types"

/** How the user is describing the schedule. */
export type ScheduleMode = "interval" | "daily" | "hourly" | "once" | "expression"

/** Units the simple interval picker offers. Sub-minute lives in `expression`. */
export type IntervalUnit = "minutes" | "hours" | "days"

const UNIT_SECONDS: Record<IntervalUnit, number> = {
  minutes: 60,
  hours: 3600,
  days: 86400,
}

/** The form's state. Kept as strings — it mirrors what is in the inputs. */
export interface ScheduleDraft {
  mode: ScheduleMode
  /** Interval mode: how many `unit`s between runs. */
  every: string
  unit: IntervalUnit
  /** Daily mode, 24-hour UTC. */
  hour: string
  minute: string
  /** Expression mode: the raw schedule string. */
  expression: string
}

export const EMPTY_SCHEDULE_DRAFT: ScheduleDraft = {
  mode: "interval",
  every: "5",
  unit: "minutes",
  hour: "09",
  minute: "00",
  expression: "",
}

/**
 * A schedule reduced to something renderable in one short sentence.
 *
 * A structure rather than a string because the package carries no i18n: the
 * caller turns this into words with its own labels. `raw` is the honest
 * fallback for an expression that parses server-side but has no tidier phrasing.
 */
export type ScheduleSummary =
  | { kind: "seconds"; value: number }
  | { kind: "minutes"; value: number }
  | { kind: "hours"; value: number }
  | { kind: "days"; value: number }
  | { kind: "dailyAt"; time: string }
  | { kind: "hourly" }
  | { kind: "once" }
  | { kind: "raw"; text: string }

/** Why a schedule was refused. The caller maps these to sentences. */
export type ScheduleProblem = "empty" | "cronUnsupported" | "unrecognised"

export type ScheduleCheck =
  | { ok: true; summary: ScheduleSummary }
  | { ok: false; problem: ScheduleProblem }

/**
 * A whole number of the largest unit that divides evenly, so 3600s reads as
 * "every hour" rather than "every 3600 seconds" and 5400s stays "every 90
 * minutes" instead of rounding to a lie.
 */
export function secondsToSummary(seconds: number): ScheduleSummary {
  if (seconds > 0 && seconds % 86400 === 0) return { kind: "days", value: seconds / 86400 }
  if (seconds > 0 && seconds % 3600 === 0) return { kind: "hours", value: seconds / 3600 }
  if (seconds > 0 && seconds % 60 === 0) return { kind: "minutes", value: seconds / 60 }
  return { kind: "seconds", value: seconds }
}

/**
 * Go's `time.ParseDuration`, in seconds, or null.
 *
 * Reimplemented rather than approximated because `@every` is validated by that
 * exact function upstream: accepting `1d` here (Go has no day unit) would hand
 * back a 400 from a field that had already said the value was fine.
 */
function parseGoDuration(raw: string): number | null {
  const text = raw.trim()
  if (text === "" || text === "0") return text === "0" ? 0 : null

  const unitSeconds: Record<string, number> = {
    ns: 1e-9,
    us: 1e-6,
    "µs": 1e-6,
    "μs": 1e-6,
    ms: 1e-3,
    s: 1,
    m: 60,
    h: 3600,
  }

  // Go accepts a sequence of <number><unit> pairs: "2h45m", "1.5h".
  //
  // The number alternates rather than using `\d*\.?\d+`: that form lets the
  // leading and trailing digit runs both match the same characters, which is a
  // backtracking blowup on a long digit string that ends in no unit.
  const pattern = /(\d+(?:\.\d*)?|\.\d+)(ns|us|µs|μs|ms|s|m|h)/y
  let total = 0
  let consumed = 0
  let match = pattern.exec(text)
  while (match) {
    total += Number(match[1]) * (unitSeconds[match[2] ?? ""] ?? 0)
    // Tracked here rather than read off `pattern.lastIndex` afterwards: the
    // exec that ENDS the loop is a failed one, and a failed match on a sticky
    // regex resets lastIndex to 0 — so checking it after the fact rejected
    // every well-formed duration.
    consumed = pattern.lastIndex
    match = pattern.exec(text)
  }
  // `y` anchors each match to the end of the previous one, so a trailing
  // remainder means the string had junk in it ("30mins", "1h ago").
  if (consumed !== text.length) return null
  return total
}

/** `rate(N unit)`'s interior, in seconds, or null. */
function parseRateBody(raw: string): number | null {
  const parts = raw.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (parts.length !== 2) return null
  const count = Number(parts[0])
  if (!Number.isInteger(count) || count <= 0) return null
  // The control plane trims one trailing "s", so "minute" and "minutes" are
  // the same word to it — and "minutess" is not.
  const unit = (parts[1] ?? "").replace(/s$/, "")
  const seconds: Record<string, number> = { second: 1, minute: 60, hour: 3600, day: 86400 }
  const multiplier = seconds[unit]
  return multiplier === undefined ? null : count * multiplier
}

/** Two digits, so "9:5" renders as "09:05". */
function pad(value: number): string {
  return String(value).padStart(2, "0")
}

/** Whether `value` is a whole number in [0, max]. */
function inRange(value: string, max: number): boolean {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= max
}

/**
 * The five-field form, which the control plane restricts to a daily time.
 *
 * A five-field expression is unambiguously an attempt at cron, so every failure
 * here reports the one restriction that matters rather than the generic
 * "unrecognised" a typo elsewhere earns.
 */
function checkCronFields(fields: readonly string[]): ScheduleCheck {
  const [minute = "", hour = "", day = "", month = "", weekday = ""] = fields
  if (day !== "*" || month !== "*" || weekday !== "*") {
    return { ok: false, problem: "cronUnsupported" }
  }
  if (!inRange(minute, 59) || !inRange(hour, 23)) {
    return { ok: false, problem: "cronUnsupported" }
  }
  return { ok: true, summary: { kind: "dailyAt", time: `${pad(Number(hour))}:${pad(Number(minute))}` } }
}

/**
 * Checks one schedule expression against the control plane's rules.
 *
 * The order of the tests mirrors `nextTriggerFire` so the two agree on the
 * awkward cases — the whole string is lower-cased first there, which is why
 * `@HOURLY` is accepted here too.
 */
export function checkExpression(raw: string): ScheduleCheck {
  const text = raw.trim().toLowerCase()
  // An empty schedule is technically accepted upstream, but it fires once and
  // then marks the trigger completed — almost never what someone typing into
  // a schedule box meant. @once says that out loud instead.
  if (text === "") return { ok: false, problem: "empty" }

  if (text === "@once") return { ok: true, summary: { kind: "once" } }
  if (text === "@hourly") return { ok: true, summary: { kind: "hourly" } }
  if (text === "@daily") return { ok: true, summary: { kind: "dailyAt", time: "00:00" } }

  if (text.startsWith("@every ")) {
    const seconds = parseGoDuration(text.slice("@every ".length))
    if (seconds === null || seconds <= 0) return { ok: false, problem: "unrecognised" }
    return { ok: true, summary: secondsToSummary(seconds) }
  }

  if (text.startsWith("rate(") && text.endsWith(")")) {
    const seconds = parseRateBody(text.slice("rate(".length, -1))
    if (seconds === null) return { ok: false, problem: "unrecognised" }
    return { ok: true, summary: secondsToSummary(seconds) }
  }

  const fields = text.split(/\s+/).filter(Boolean)
  if (fields.length === 5) return checkCronFields(fields)

  return { ok: false, problem: "unrecognised" }
}

/** Whether the draft describes something the control plane will accept. */
export function checkDraft(draft: ScheduleDraft): ScheduleCheck {
  switch (draft.mode) {
    case "interval": {
      const count = Number(draft.every.trim())
      if (!Number.isInteger(count) || count <= 0) return { ok: false, problem: "empty" }
      return { ok: true, summary: secondsToSummary(count * UNIT_SECONDS[draft.unit]) }
    }
    case "daily": {
      const hour = Number(draft.hour)
      const minute = Number(draft.minute)
      if (!Number.isInteger(hour) || hour < 0 || hour > 23) return { ok: false, problem: "empty" }
      if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
        return { ok: false, problem: "empty" }
      }
      return { ok: true, summary: { kind: "dailyAt", time: `${pad(hour)}:${pad(minute)}` } }
    }
    case "hourly":
      return { ok: true, summary: { kind: "hourly" } }
    case "once":
      return { ok: true, summary: { kind: "once" } }
    case "expression":
      return checkExpression(draft.expression)
  }
}

/**
 * Which trigger type a draft is filed under.
 *
 * Cosmetic to the scheduler — cron and rate travel the same branch of
 * `nextTriggerFire` — but it is what the list's badge shows and what the
 * server's default name is built from, so the dialog's placeholder and the
 * request it eventually sends have to agree. Hence one function rather than the
 * same conditional written twice.
 */
export function triggerTypeFor(draft: ScheduleDraft): "cron" | "rate" {
  if (draft.mode === "interval") return "rate"
  if (draft.mode !== "expression") return "cron"
  const expression = draft.expression.trim().toLowerCase()
  return expression.startsWith("@every ") || expression.startsWith("rate(") ? "rate" : "cron"
}

/**
 * The draft as a create request.
 *
 * The `type` split is cosmetic — cron and rate travel the same branch of the
 * scheduler — but it is what the list's badge shows, so a recurring interval is
 * filed as `rate` and a wall-clock schedule as `cron`. Interval mode sends
 * `intervalSeconds` rather than a `rate(...)` string: it is the same schedule
 * expressed exactly, with no parse to get wrong on either side.
 *
 * Returns null when the draft does not validate, so a caller cannot build a
 * request out of a form it has not checked.
 */
export function toPutTriggerInput(
  functionName: string,
  draft: ScheduleDraft,
  name?: string,
): PutTriggerInput | null {
  if (!checkDraft(draft).ok) return null

  const base = {
    functionName,
    type: triggerTypeFor(draft),
    ...(name?.trim() ? { name: name.trim() } : {}),
  }

  switch (draft.mode) {
    case "interval":
      return { ...base, intervalSeconds: Number(draft.every.trim()) * UNIT_SECONDS[draft.unit] }
    case "daily":
      return {
        ...base,
        schedule: `${String(Number(draft.minute))} ${String(Number(draft.hour))} * * *`,
      }
    case "hourly":
      return { ...base, schedule: "@hourly" }
    case "once":
      return { ...base, schedule: "@once" }
    case "expression":
      return { ...base, schedule: draft.expression.trim() }
  }
}

/**
 * How an existing trigger's schedule reads.
 *
 * `intervalSeconds` wins over `schedule` because that is the order the control
 * plane resolves them in: a trigger carrying both fires on the interval, so
 * showing the string would describe a schedule it is not keeping.
 */
export function summarizeTrigger(trigger: {
  schedule?: string
  intervalSeconds?: number
}): ScheduleSummary | null {
  if (trigger.intervalSeconds != null && trigger.intervalSeconds > 0) {
    return secondsToSummary(trigger.intervalSeconds)
  }
  if (!trigger.schedule) return null
  const check = checkExpression(trigger.schedule)
  return check.ok ? check.summary : { kind: "raw", text: trigger.schedule }
}
