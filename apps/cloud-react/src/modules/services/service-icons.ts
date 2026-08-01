import {
  Activity,
  Boxes,
  Box,
  Cloud,
  Container,
  Cpu,
  CreditCard,
  Database,
  Gauge,
  GitBranch,
  Globe,
  HardDrive,
  Key,
  KeyRound,
  Layers,
  LayoutDashboard,
  Lock,
  Network,
  Server,
  Shield,
  ShieldCheck,
  Wallet,
  Wifi,
  type LucideIcon,
} from "lucide-react"

// The catalog stores an icon as a lucide name string (admin-selected). This map
// resolves it to a component; SERVICE_ICON_NAMES drives the admin form dropdown
// so admins can only pick icons that actually render. Rendering lives in the
// <ServiceIcon> component (ServiceIcon.tsx).
export const SERVICE_ICONS: Record<string, LucideIcon> = {
  Server,
  Cpu,
  Network,
  GitBranch,
  Globe,
  Wifi,
  Database,
  HardDrive,
  Container,
  Boxes,
  Cloud,
  ShieldCheck,
  Shield,
  Lock,
  Key,
  KeyRound,
  Wallet,
  CreditCard,
  Layers,
  Activity,
  Gauge,
  LayoutDashboard,
  Box,
}

export const SERVICE_ICON_NAMES = Object.keys(SERVICE_ICONS)

export const FALLBACK_SERVICE_ICON = Box
