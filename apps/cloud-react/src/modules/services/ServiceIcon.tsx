import { FALLBACK_SERVICE_ICON, SERVICE_ICONS } from "./service-icons"

/** Renders the lucide icon named by `name`, falling back to a neutral Box. */
export function ServiceIcon({
    name,
    className,
}: Readonly<{ name: string; className?: string }>) {
    const Icon = SERVICE_ICONS[name] ?? FALLBACK_SERVICE_ICON
    return <Icon className={className} aria-hidden />
}
