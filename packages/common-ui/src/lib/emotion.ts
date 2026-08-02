import createEmotion from "@emotion/css/create-instance"

/**
 * The design system's emotion instance, and the only one this package uses.
 *
 * ## Why the styles are layered
 *
 * Components merge a caller's `className` with `cx()`. Unlike the `cn()` this
 * package used before, `cx()` does not run tailwind-merge, so it cannot delete a
 * conflicting base class — a caller's `<DialogContent className="sm:max-w-md" />`
 * only takes effect if it beats the component's own rule on the cascade. Two
 * single-class selectors tie on specificity, and emotion injects at runtime into
 * the end of <head>, so by default the component wins on source order and the
 * caller's override is silently dropped.
 *
 * Being unlayered does not merely fail to fix that — it guarantees it. An
 * unlayered rule beats every layered one, and Tailwind emits its utilities in
 * `@layer utilities`. So `css` wraps every rule in `@layer datadack-ui`.
 *
 * ## Why the layer's POSITION is the whole game
 *
 * Layers are compared before specificity, which cuts both ways:
 *
 *   - the layer must sort AFTER `base`, because Tailwind's preflight sets
 *     `padding: 0` and `border: 0` on `*` in that layer. A layer below `base`
 *     loses to it despite `*` being the weakest possible selector, and every
 *     component silently loses its padding and borders.
 *   - it must sort BEFORE `utilities`, or a caller's `className` cannot win.
 *
 * Layer order follows first appearance, and emotion injects at runtime — so the
 * order cannot be established from here. **The consuming app declares it**, as
 * the first line of its stylesheet:
 *
 *   @layer theme, base, datadack-ui, components, utilities;
 *
 * Both apps do (see apps/&#42;/src/index.css). Without it the layer lands wherever
 * emotion's first insertion happens to fall, and the console renders wrong.
 *
 * Note there is deliberately no `prepend` here: prepending would register
 * `datadack-ui` before the app's stylesheet is parsed, making it the FIRST and
 * therefore lowest-priority layer — below `base`, which is the broken case
 * above.
 *
 * tests/cascade.test.ts pins this down, including that both apps declare the
 * order.
 */
const instance = createEmotion({
  key: "ddui",
  // Emotion's own convention, made explicit because bun resolves the
  // non-development build and would otherwise pick speedy everywhere. Speedy
  // inserts through CSSOM `insertRule`, which is faster but leaves the <style>
  // tag empty — unreadable in devtools and untestable. Production keeps it; dev
  // and test get real, inspectable CSS text.
  speedy: process.env.NODE_ENV === "production",
})

/** The cascade layer every rule in this package is emitted into. */
export const LAYER = "datadack-ui"

type CssArgs = Parameters<typeof instance.css>

function isTemplate(value: unknown): value is TemplateStringsArray {
  // A tagged template's strings array is the only array carrying `raw`.
  return Array.isArray(value) && Object.hasOwn(value, "raw")
}

/**
 * Re-wrap a tagged template's static chunks so the rule body lands inside the
 * layer, leaving the interpolation slots — and so any interpolated values —
 * untouched.
 */
function wrapInLayer(strings: TemplateStringsArray): TemplateStringsArray {
  const chunks = [...strings]
  const last = chunks.length - 1
  chunks[0] = `@layer ${LAYER}{${chunks[0]}`
  chunks[last] = `${chunks[last]}}`
  ;(chunks as unknown as { raw: readonly string[] }).raw = chunks
  return chunks as unknown as TemplateStringsArray
}

/**
 * `css`, but layered. Same signature and return value as @emotion/css's: takes a
 * tagged template or style objects, returns a generated class name.
 */
export function css(...args: CssArgs): string {
  const [first, ...rest] = args
  if (isTemplate(first)) return instance.css(wrapInLayer(first), ...rest)
  // Object and string forms nest under the layer key instead. Multiple
  // arguments pass through as an array, which emotion flattens.
  return instance.css({ [`@layer ${LAYER}`]: args as never })
}

// keyframes are deliberately NOT layered: @keyframes carries no selector and so
// takes no part in the cascade, and animation names stay globally resolvable
// either way. Wrapping them buys nothing and risks surprising a browser.
//
// injectGlobal is likewise left alone — lib/tokens.ts wraps its selectors in
// :where(), which zeroes their specificity, so a consumer's own token
// definitions already win without a layer.
/* eslint-disable @typescript-eslint/unbound-method -- emotion returns standalone
   closures bound at creation, not prototype methods; destructuring them is the
   documented way to use an instance. */
export const { cache, cx, injectGlobal, keyframes, merge, getRegisteredStyles, flush, sheet } =
  instance
/* eslint-enable @typescript-eslint/unbound-method */
