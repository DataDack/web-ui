import { useEffect, useState } from "react"

import * as Sentry from "@sentry/react"
import { ArrowRight, RefreshCw } from "lucide-react"
import { motion, useReducedMotion } from "motion/react"
import { useTranslation } from "react-i18next"
import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom"

import { Logo } from "@/components/Logo"
import { useScreen } from "@/services/api/screen"

const RELOAD_GUARD_KEY = "dd:chunk-reload-at"
// If a reload was attempted within this window we stop auto-reloading and show
// the manual UI instead — prevents an infinite loop when the asset is truly gone.
const RELOAD_WINDOW_MS = 10_000

/**
 * Messages Vite/browsers emit when a lazily-imported route chunk fails to load.
 * The usual cause is a redeploy: the running app still references hashed asset
 * files that the new build replaced, so the fetch 404s. A single hard reload
 * pulls the fresh index.html + chunks and recovers.
 */
function toText(value: unknown): string {
  if (value == null) return "Unknown error"
  if (typeof value === "string") return value
  if (value instanceof Error) return value.message
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return "Unknown error"
  }
}

// Matches only the browser's module-loading failures — Chrome/Firefox ("failed
// to fetch dynamically imported module", "error loading dynamically imported
// module") and Safari ("importing a module script failed"). A bare "failed to
// fetch" is NOT included: that's any network error, and treating an API outage
// as a stale deploy would silently reload the page instead of showing what
// broke.
//
// The MIME-type variant is the same failure wearing a different message. When
// the server answers a missing chunk with the SPA shell instead of a 404, the
// browser rejects it for its content type rather than for being absent:
//
//	Failed to load module script: Expected a JavaScript-or-Wasm module script
//	but the server responded with a MIME type of "text/html".
//
// That is always a stale deploy — nothing else serves HTML where a module was
// expected — and until it was matched here, every stale tab landed on the
// generic error page with a reload button, one press away from a fix it could
// have done itself.
function isDynamicImportError(error: unknown): boolean {
  if (isRouteErrorResponse(error)) return false
  const msg = toText(error)
  return (
    /dynamically imported module|importing a module script failed/i.test(msg) ||
    /expected a javascript(-or-wasm)? module script/i.test(msg)
  )
}

/** True when this tab already tried a recovery reload inside the guard window. */
function reloadedRecently(): boolean {
  try {
    return Date.now() - Number(sessionStorage.getItem(RELOAD_GUARD_KEY) ?? 0) < RELOAD_WINDOW_MS
  } catch {
    // sessionStorage blocked — no guard available, so treat every failure as
    // first-time and let the reload attempt happen.
    return false
  }
}

function errorMessage(error: unknown): string {
  if (isRouteErrorResponse(error)) return `${String(error.status)} ${error.statusText}`
  return toText(error)
}

/**
 * Root route `errorElement`. Replaces React Router's default developer error
 * screen with a branded page. For stale-deploy chunk-load failures it silently
 * reloads once to fetch the latest assets; for everything else it reports to
 * Sentry and offers a retry / return-home path.
 */
export function RouteErrorBoundary() {
  useScreen("errors.boundary")
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const error = useRouteError()

  const isChunk = isDynamicImportError(error)

  // Whether a recovery reload is actually going to happen, decided ONCE during
  // the first render (hence the lazy initializer, not an effect): the spinner
  // below must not promise a reload the guard is about to suppress. When the
  // previous reload didn't fix it — a stale cached index.html pointing at
  // chunks the deploy replaced, say — this is false on the second pass and the
  // manual UI appears with the real error instead of an endless spinner.
  const [isRecovering] = useState(() => isChunk && !reloadedRecently())

  // Recover from a stale deploy by reloading once. Guarded so a genuinely
  // missing asset can't trap the user in a reload loop.
  useEffect(() => {
    if (!isRecovering) return
    try {
      sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()))
    } catch {
      /* ignore — reload still helps even without the guard */
    }
    window.location.reload()
  }, [isRecovering])

  // Surface unexpected errors to Sentry (chunk errors are expected churn from
  // deploys, so we don't spam the tracker with those).
  useEffect(() => {
    if (isChunk) return
    Sentry.captureException(error)
  }, [error, isChunk])

  return (
    <main className="relative isolate flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden bg-[#050505] px-6 text-white">
      {/* Ambient cloud glow — matches the 404 canvas */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-20">
        <motion.div
          className="absolute left-[16%] top-[20%] h-[40vmax] w-[40vmax] rounded-full bg-[#D4AF37]/[0.06] blur-[120px]"
          animate={reduce ? undefined : { x: [0, 36, 0], y: [0, -24, 0] }}
          transition={
            reduce
              ? undefined
              : { duration: 28, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
          }
        />
        <motion.div
          className="absolute bottom-[14%] right-[12%] h-[36vmax] w-[36vmax] rounded-full bg-[#2387ad]/[0.09] blur-[130px]"
          animate={reduce ? undefined : { x: [0, -30, 0], y: [0, 26, 0] }}
          transition={
            reduce
              ? undefined
              : { duration: 34, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
          }
        />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 [background:radial-gradient(ellipse_62%_52%_at_50%_45%,transparent,rgba(5,5,5,0.9))]"
      />

      {/* Brand mark */}
      <div className="absolute left-6 top-6">
        <Logo wordmarkClassName="text-sm text-white/85" iconClassName="size-6" />
      </div>

      {isRecovering ? (
        // A reload is already in flight — keep the screen calm and quiet.
        <div className="relative flex flex-col items-center text-center">
          <RefreshCw className="size-7 animate-spin text-[#E8C766]" />
          <p className="mt-5 text-base text-white/70">{t("error.updating")}</p>
        </div>
      ) : (
        <div className="relative flex max-w-xl flex-col items-center text-center">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-[#E8C766] backdrop-blur-sm">
            {t("error.kicker")}
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {t("error.title")}
          </h1>
          <p className="mt-3 text-base italic text-white/55 sm:text-lg">{t("error.subtitle")}</p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                window.location.reload()
              }}
              className="group inline-flex h-11 items-center gap-2 rounded-full px-6 text-sm font-semibold text-[#1c1503] outline-none transition hover:brightness-[1.06] focus-visible:ring-2 focus-visible:ring-[#FFD700]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]"
              style={{
                backgroundImage: "linear-gradient(180deg,#FFD700,#D4AF37)",
                boxShadow: "0 0 30px rgba(212,175,55,0.35), inset 0 1px 0 rgba(255,255,255,0.5)",
              }}
            >
              <RefreshCw className="size-4 transition-transform group-hover:rotate-90" />
              {t("error.retry")}
            </button>
            <Link
              to="/"
              className="group inline-flex h-11 items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-6 text-sm font-semibold text-white/85 outline-none backdrop-blur-sm transition hover:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-white/40"
            >
              {t("error.cta")}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          {/* Technical detail — muted; useful in dev and for support screenshots */}
          <details className="mt-8 w-full max-w-md text-left">
            <summary className="cursor-pointer select-none text-xs uppercase tracking-[0.18em] text-white/35 outline-none transition hover:text-white/55">
              {t("error.detailsLabel")}
            </summary>
            <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-white/[0.03] p-3 text-[11px] leading-relaxed text-white/55">
              {errorMessage(error)}
            </pre>
          </details>
        </div>
      )}

      {/* Reliability cue — even the error state stays composed */}
      <div className="absolute bottom-6 flex items-center gap-2 text-xs text-white/40">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400/60" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
        </span>
        {t("error.status")}
      </div>
    </main>
  )
}
