import { Boxes } from "lucide-react"
import {
  SiAngular,
  SiAstro,
  SiDjango,
  SiDocusaurus,
  SiEleventy,
  SiEmberdotjs,
  SiExpress,
  SiFastapi,
  SiFlask,
  SiGatsby,
  SiGo,
  SiHtml5,
  SiJekyll,
  SiHugo,
  SiLit,
  SiMarkdown,
  SiNestjs,
  SiNextdotjs,
  SiNuxtdotjs,
  SiPreact,
  SiQwik,
  SiReact,
  SiRemix,
  SiRust,
  SiSolid,
  SiStorybook,
  SiSvelte,
  SiVite,
  SiVitepress,
  SiVuedotjs,
} from "react-icons/si"

import type { FrameworkMark } from "./project-type"

/**
 * A brand mark per CATALOGUE framework id.
 *
 * Keyed by catalogue id rather than by project type, because the catalogue is
 * what the create form renders now — it lives in a bucket and can name a
 * framework this build has never heard of. That is the whole reason for the
 * fallback below: a missing entry must degrade to a generic card, never to a
 * blank one or a crash. A framework added to the bucket appears immediately,
 * with a neutral mark, and gets a logo whenever somebody adds one here.
 *
 * `colorDark` is set only where the official mark is near-black and would
 * disappear against a dark surface.
 */
export const CATALOG_MARKS: Record<string, FrameworkMark> = {
  nextjs: { icon: SiNextdotjs, color: "#000000", colorDark: "#FFFFFF" },
  // static
  react: { icon: SiReact, color: "#61DAFB" },
  vite: { icon: SiVite, color: "#646CFF" },
  vue: { icon: SiVuedotjs, color: "#4FC08D" },
  angular: { icon: SiAngular, color: "#DD0031" },
  svelte: { icon: SiSvelte, color: "#FF3E00" },
  solid: { icon: SiSolid, color: "#2C4F7C" },
  preact: { icon: SiPreact, color: "#673AB8" },
  qwik: { icon: SiQwik, color: "#AC7EF4" },
  lit: { icon: SiLit, color: "#324FFF" },
  ember: { icon: SiEmberdotjs, color: "#E04E39" },

  // generated
  astro: { icon: SiAstro, color: "#BC52EE" },
  starlight: { icon: SiAstro, color: "#BC52EE" },
  "nextjs-export": { icon: SiNextdotjs, color: "#000000", colorDark: "#FFFFFF" },
  docusaurus: { icon: SiDocusaurus, color: "#3ECC5F" },
  vitepress: { icon: SiVitepress, color: "#5C73E7" },
  hugo: { icon: SiHugo, color: "#FF4088" },
  jekyll: { icon: SiJekyll, color: "#CC0000" },
  eleventy: { icon: SiEleventy, color: "#000000", colorDark: "#FFFFFF" },
  gatsby: { icon: SiGatsby, color: "#663399" },
  storybook: { icon: SiStorybook, color: "#FF4785" },
  "nuxt-static": { icon: SiNuxtdotjs, color: "#00DC82" },
  slidev: { icon: SiMarkdown, color: "#3AB9D4" },
  mkdocs: { icon: SiMarkdown, color: "#526CFE" },
  zola: { icon: SiRust, color: "#0E7FBF" },
  html: { icon: SiHtml5, color: "#E34F26" },

  // hybrid — a tree AND a handler
  opennext: { icon: SiNextdotjs, color: "#000000", colorDark: "#FFFFFF" },
  remix: { icon: SiRemix, color: "#000000", colorDark: "#FFFFFF" },
  sveltekit: { icon: SiSvelte, color: "#FF3E00" },
  nuxt: { icon: SiNuxtdotjs, color: "#00DC82" },
  "astro-ssr": { icon: SiAstro, color: "#BC52EE" },
  "qwik-city": { icon: SiQwik, color: "#AC7EF4" },

  // dynamic — a server with nothing servable
  express: { icon: SiExpress, color: "#000000", colorDark: "#FFFFFF" },
  nestjs: { icon: SiNestjs, color: "#E0234E" },
  fastapi: { icon: SiFastapi, color: "#009688" },
  flask: { icon: SiFlask, color: "#000000", colorDark: "#FFFFFF" },
  django: { icon: SiDjango, color: "#092E20", colorDark: "#44B78B" },
  go: { icon: SiGo, color: "#00ADD8" },
}

/** The generic mark for a framework this build has no logo for. */
const FALLBACK: FrameworkMark = { icon: Boxes, color: "#8B8B93" }

/**
 * The mark for a catalogue id, never undefined.
 *
 * The total return type is the point: the catalogue can name anything, and a
 * create form that renders a blank card for a framework the platform can
 * genuinely build is worse than one that renders a neutral glyph.
 */
export function markFor(frameworkID: string): FrameworkMark {
  return CATALOG_MARKS[frameworkID] ?? FALLBACK
}
