import { useState } from "react"

import type { IconType } from "react-icons"
import { FaWindows } from "react-icons/fa6"
import {
    SiArchlinux,
    SiCentos,
    SiDebian,
    SiFedora,
    SiLinux,
    SiRockylinux,
    SiUbuntu,
} from "react-icons/si"

// OS family → colored brand icon (from react-icons) + official brand color.
const OS_ICONS: Record<string, { icon: IconType; color: string }> = {
    ubuntu: { icon: SiUbuntu, color: "#E95420" },
    debian: { icon: SiDebian, color: "#A81D33" },
    fedora: { icon: SiFedora, color: "#51A2DA" },
    rocky: { icon: SiRockylinux, color: "#10B981" },
    rockylinux: { icon: SiRockylinux, color: "#10B981" },
    centos: { icon: SiCentos, color: "#262577" },
    arch: { icon: SiArchlinux, color: "#1793D1" },
    windows: { icon: FaWindows, color: "#0078D6" },
}

const FALLBACK = { icon: SiLinux, color: "var(--muted-foreground)" }

/**
 * The OS badge shown before an image or instance name.
 *
 * iconUrl is the artwork the admin set on the image family (served from the
 * CDN) and is what we show whenever it exists — it covers every OS in the
 * catalog, including the ones react-icons has no brand glyph for (Alpine,
 * AlmaLinux, Amazon Linux, openSUSE, Oracle Linux).
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
    const [failed, setFailed] = useState(false)

    if (iconUrl && !failed) {
        return (
            <img
                src={iconUrl}
                alt=""
                className={className}
                style={{ objectFit: "contain" }}
                onError={() => {
                    setFailed(true)
                }}
                aria-hidden
            />
        )
    }

    const { icon: Icon, color } = osFamily ? (OS_ICONS[osFamily.toLowerCase()] ?? FALLBACK) : FALLBACK
    return <Icon className={className} style={{ color }} aria-hidden />
}
