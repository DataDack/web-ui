import {
  SiGithub,
  SiGoogledrive,
  SiGooglesheets,
  SiGmail,
  SiGooglecalendar,
  SiInstagram,
  SiJira,
  SiTelegram,
  SiThreads,
  SiWhatsapp,
  SiDiscord,
} from "react-icons/si"
import { FaSlack, FaMicrosoft, FaGoogle, FaPlug } from "react-icons/fa"

// Display metadata for the trigger sources and OAuth providers the
// integrations surface renders.
//
// Deliberately keyed on the SAME strings the control plane stores in
// `integrations.platform` and `connected_accounts.provider` — not on the
// studio's registryKey ("githubTrigger"). The two vocabularies are different,
// and mapping between them at the render site is how a row ends up with a
// generic plug icon and the label "github_trigger".
//
// react-icons/si has NO Microsoft glyphs at all — no SiSlack, and no
// SiMicrosoftoutlook / SiMicrosoftonedrive / SiMicrosoftexcel either. Every
// Microsoft-family entry below therefore uses FaMicrosoft, differentiated by
// colour and label rather than by mark. This is not a style choice: a named
// export that does not exist in react-icons fails the whole admin build, not
// just this page, and the failure names the bundle rather than the import.
const META = {
  // Trigger sources
  github: { label: "GitHub", icon: SiGithub, color: "#8b949e" },
  slack: { label: "Slack", icon: FaSlack, color: "#4A154B" },
  telegram: { label: "Telegram", icon: SiTelegram, color: "#26A5E4" },
  discord: { label: "Discord", icon: SiDiscord, color: "#5865F2" },
  jira: { label: "Jira", icon: SiJira, color: "#0052CC" },
  whatsapp: { label: "WhatsApp", icon: SiWhatsapp, color: "#25D366" },
  instagram: { label: "Instagram", icon: SiInstagram, color: "#E4405F" },
  threads: { label: "Threads", icon: SiThreads, color: "#000000" },
  google_drive: { label: "Google Drive", icon: SiGoogledrive, color: "#4285F4" },
  google_sheets: { label: "Google Sheets", icon: SiGooglesheets, color: "#34A853" },
  google_gmail: { label: "Gmail", icon: SiGmail, color: "#EA4335" },
  google_calendar: { label: "Google Calendar", icon: SiGooglecalendar, color: "#4285F4" },
  microsoft_outlook: { label: "Outlook", icon: FaMicrosoft, color: "#0078D4" },
  microsoft_onedrive: { label: "OneDrive", icon: FaMicrosoft, color: "#0364B8" },
  microsoft_calendar: { label: "Microsoft Calendar", icon: FaMicrosoft, color: "#0078D4" },
  microsoft_excel: { label: "Excel", icon: FaMicrosoft, color: "#217346" },

  // OAuth providers. `github` and `jira` are shared with the trigger names
  // above, which is correct: one row, one label.
  google: { label: "Google", icon: FaGoogle, color: "#4285F4" },
  microsoft: { label: "Microsoft", icon: FaMicrosoft, color: "#0078D4" },
}

const FALLBACK = { icon: FaPlug, color: "#71717a" }

/**
 * Display metadata for a platform or provider key.
 *
 * Never returns undefined: an unknown key is a trigger source this build does
 * not know about yet — a newer control plane, most likely — and rendering it
 * with a plug and its raw name is strictly better than crashing the table.
 */
export function getPlatformMeta(key) {
  const known = META[key]
  if (known) return known
  return { ...FALLBACK, label: humanise(key) }
}

function humanise(key) {
  if (!key) return "Unknown"
  return key
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}
