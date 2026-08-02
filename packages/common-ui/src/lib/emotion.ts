import createEmotion from "@emotion/css/create-instance"

/**
 * The design system's own emotion instance, and the only one this package uses.
 *
 * `prepend` is the whole point. Emotion normally appends its <style> tags to the
 * end of <head>, which puts them after the app's stylesheet. Emotion classes and
 * Tailwind utilities are both single-class selectors, and Tailwind's utilities
 * are emitted unlayered, so the two tie on specificity and source order decides —
 * with the default behaviour the component's own style silently beats every
 * `className` a caller passes.
 *
 * That is not academic: consumers pass Tailwind overrides at hundreds of call
 * sites (`<InputOTPGroup className="gap-2" />`), and under `cn()` those worked
 * because tailwind-merge deleted the conflicting base class outright. `cx()` does
 * not do that — it only dedupes emotion classes — so the override has to win on
 * the cascade instead. Prepending puts the whole design system ahead of the app's
 * stylesheet, which is exactly where a base layer belongs.
 *
 * Everything in this package imports css/cx/keyframes/injectGlobal from here
 * rather than from @emotion/css directly, so there is one cache and one
 * insertion point.
 */
const instance = createEmotion({ key: "ddui", prepend: true })

export const {
  cache,
  css,
  cx,
  injectGlobal,
  keyframes,
  merge,
  getRegisteredStyles,
  flush,
  hydrate,
  sheet,
} = instance
