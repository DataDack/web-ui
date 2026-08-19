import {
  Activity,
  Boxes,
  Box,
  Cloud,
  Container,
  Cpu,
  CreditCard,
  Database,
  FolderKanban,
  Gauge,
  GitBranch,
  Globe,
  HardDrive,
  Key,
  KeyRound,
  Layers,
  LayoutDashboard,
  LifeBuoy,
  Lock,
  Network,
  Rocket,
  Server,
  Shield,
  ShieldCheck,
  Wallet,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react"

// The catalog stores an icon as a lucide name string (admin-selected). This map
// resolves it to a component; SERVICE_ICON_NAMES drives the admin form dropdown
// so admins can only pick icons that actually render. Rendering lives in the
// <ServiceIcon> component (ServiceIcon.tsx).
// Every name a catalog row can carry. A service whose icon is missing here
// silently renders the neutral Box — which is how Managed Apps (Rocket) and
// Serverless (Zap) came to be seeded with icons this map did not hold.
export const SERVICE_ICONS: Record<string, LucideIcon> = {
  Server,
  Cpu,
  Zap,
  Rocket,
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
  FolderKanban,
  LifeBuoy,
  Box,
}

export const SERVICE_ICON_NAMES = Object.keys(SERVICE_ICONS)

export const FALLBACK_SERVICE_ICON = Box
