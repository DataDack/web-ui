import { useEffect, useState, type CSSProperties } from "react"

import type { IconType } from "react-icons"
import { FaWindows } from "react-icons/fa6"
import {
  SiAlmalinux,
  SiAlpinelinux,
  SiArchlinux,
  SiCentos,
  SiDebian,
  SiFedora,
  SiFreebsd,
  SiKalilinux,
  SiLinux,
  SiLinuxmint,
  SiOpensuse,
  SiRedhat,
  SiRockylinux,
  SiSuse,
  SiUbuntu,
} from "react-icons/si"

import { cn } from "@datadack/common-ui"

/**
 * OS family → colored brand icon (from react-icons) + official brand color.
 *
 * `dark` is the color used under the dark theme, set only where the official
 * brand color is too close to black to read on a dark surface (AlmaLinux and
 * CentOS ship near-black marks). Where it is absent the brand color is used in
 * both themes.
 */
interface OSIconEntry {
  icon: IconType
  color: string
  dark?: string
}

const OS_ICONS: Record<string, OSIconEntry> = {
  ubuntu: { icon: SiUbuntu, color: "#E95420" },
  debian: { icon: SiDebian, color: "#A81D33", dark: "#D94A63" },
  fedora: { icon: SiFedora, color: "#51A2DA" },
  rocky: { icon: SiRockylinux, color: "#10B981" },
  rockylinux: { icon: SiRockylinux, color: "#10B981" },
  almalinux: { icon: SiAlmalinux, color: "#1D1D1D", dark: "#F5F5F5" },
  alma: { icon: SiAlmalinux, color: "#1D1D1D", dark: "#F5F5F5" },
  centos: { icon: SiCentos, color: "#262577", dark: "#8C8BE0" },
  "centos-stream": { icon: SiCentos, color: "#262577", dark: "#8C8BE0" },
  alpine: { icon: SiAlpinelinux, color: "#0D597F", dark: "#4FA3CC" },
  alpinelinux: { icon: SiAlpinelinux, color: "#0D597F", dark: "#4FA3CC" },
  opensuse: { icon: SiOpensuse, color: "#73BA25" },
  "opensuse-leap": { icon: SiOpensuse, color: "#73BA25" },
  suse: { icon: SiSuse, color: "#0C322C", dark: "#30BA78" },
  rhel: { icon: SiRedhat, color: "#EE0000" },
  redhat: { icon: SiRedhat, color: "#EE0000" },
  kali: { icon: SiKalilinux, color: "#268BEE" },
  mint: { icon: SiLinuxmint, color: "#87CF3E" },
  linuxmint: { icon: SiLinuxmint, color: "#87CF3E" },
  freebsd: { icon: SiFreebsd, color: "#AB2B28", dark: "#E05C58" },
  arch: { icon: SiArchlinux, color: "#1793D1" },
  archlinux: { icon: SiArchlinux, color: "#1793D1" },
  windows: { icon: FaWindows, color: "#0078D6" },
}

const FALLBACK: OSIconEntry = { icon: SiLinux, color: "var(--muted-foreground)" }

/* ── Dark-artwork probe ─────────────────────────────────────────────────── */

/**
 * Admin-uploaded artwork is arbitrary — several distro logos (AlmaLinux,
 * CentOS) are near-black marks on a transparent background, which vanish
 * against the dark theme's surfaces. The URL tells us nothing about the
 * artwork, so sample it once per URL off-DOM and, when it is essentially a
 * dark monochrome mark, render it as a white silhouette under `.dark`.
 *
 * The probe uses its own CORS-enabled Image so a CDN without the header only
 * costs us the probe (result: "unknown", artwork renders untouched) rather
 * than breaking the visible <img>, which stays plain.
 */
type Tone = "unknown" | "dark" | "light"

/** Mean perceptual luminance (0–255) below which a mark counts as near-black. */
const DARK_LUMA = 70

/**
 * Families whose official artwork is a near-black mark. Used when the probe
 * can't run — object storage that serves the icons without an
 * Access-Control-Allow-Origin header fails the CORS-enabled probe load, and
 * these are exactly the logos that would then stay invisible in dark mode.
 */
const DARK_ARTWORK_FAMILIES = new Set([
  "alma",
  "almalinux",
  "centos",
  "centos-stream",
  "kali",
  "kalilinux",
])

const toneCache = new Map<string, Tone>()

function measureTone(image: HTMLImageElement): Tone {
  const size = 32
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) return "unknown"
  ctx.drawImage(image, 0, 0, size, size)
  // Throws a SecurityError when the CDN served no CORS header.
  const { data } = ctx.getImageData(0, 0, size, size)

  // Alpha-weighted so the transparent padding around a logo doesn't count.
  let luma = 0
  let weight = 0
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3] / 255
    if (alpha < 0.1) continue
    luma += alpha * (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2])
    weight += alpha
  }
  if (weight === 0) return "unknown"
  return luma / weight < DARK_LUMA ? "dark" : "light"
}

/** Resolve an icon URL's tone, caching per URL so a grid of cards probes once. */
function useArtworkTone(url?: string): Tone {
  const [tone, setTone] = useState<Tone>(
    () => (url ? toneCache.get(url) : undefined) ?? "unknown",
  )

  useEffect(() => {
    if (!url) return
    const cached = toneCache.get(url)
    if (cached) {
      setTone(cached)
      return
    }

    let cancelled = false
    const probe = new Image()
    probe.crossOrigin = "anonymous"
    probe.onload = () => {
      let measured: Tone = "unknown"
      try {
        measured = measureTone(probe)
      } catch {
        // Tainted canvas — no CORS header on the asset. Leave the artwork as-is.
      }
      toneCache.set(url, measured)
      if (!cancelled) setTone(measured)
    }
    probe.onerror = () => {
      toneCache.set(url, "unknown")
      if (!cancelled) setTone("unknown")
    }
    probe.src = url

    return () => {
      cancelled = true
    }
  }, [url])

  return tone
}

/**
 * The OS badge shown before an image or instance name.
 *
 * iconUrl is the artwork the admin set on the image family (served from the
 * CDN) and is what we show whenever it exists — it covers every OS in the
 * catalog, including the ones react-icons has no brand glyph for (Amazon
 * Linux, Oracle Linux).
 *
 * osFamily drives the built-in brand glyph, used when a family carries no
 * icon_url or when the remote asset fails to load — so a broken CDN never
 * leaves an empty cell. It must be the family KEY ("ubuntu"), not a display
 * label like "Ubuntu 26.04", which matches nothing and falls through to Tux.
 */
export function OSIcon({
  osFamily,
  iconUrl,
  className,
}: Readonly<{ osFamily?: string; iconUrl?: string; className?: string }>) {
  const [failedUrl, setFailedUrl] = useState<string>()
  const tone = useArtworkTone(iconUrl)

  if (iconUrl && failedUrl !== iconUrl) {
    const darkArtwork =
      tone === "dark" ||
      (tone === "unknown" && !!osFamily && DARK_ARTWORK_FAMILIES.has(osFamily.toLowerCase()))
    return (
      <img
        src={iconUrl}
        alt=""
        // A near-black mark is flattened to a white silhouette in dark mode;
        // artwork that already has enough luminance is left alone.
        className={cn(className, darkArtwork && "dark:brightness-0 dark:invert")}
        style={{ objectFit: "contain" }}
        onError={() => {
          setFailedUrl(iconUrl)
        }}
        aria-hidden
      />
    )
  }

  const entry = osFamily ? (OS_ICONS[osFamily.toLowerCase()] ?? FALLBACK) : FALLBACK
  const { icon: Icon, color, dark } = entry
  return (
    <Icon
      className={cn(className, "text-[var(--os-icon)] dark:text-[var(--os-icon-dark)]")}
      style={
        {
          "--os-icon": color,
          "--os-icon-dark": dark ?? color,
        } as CSSProperties
      }
      aria-hidden
    />
  )
}
