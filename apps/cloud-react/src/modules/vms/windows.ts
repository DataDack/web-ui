import type { ImageCatalogFamily } from "@/modules/catalog/catalog.types"

import type { Instance } from "./vms.types"

// Windows guests log in with an Administrator password instead of an SSH key,
// are reached over RDP, and have a graphical console rather than a serial one.
// The rules below mirror cloud-be-go common/guestos — the backend enforces the
// same ones, so a password this accepts is never refused on submit.

/** The only account a Windows instance's password is set on. */
export const WINDOWS_ADMIN_USER = "Administrator"

export const RDP_PORT = 3389

export const WINDOWS_PASSWORD_MIN = 12
export const WINDOWS_PASSWORD_MAX = 72

/** True when the catalog family owning `imageId` is Windows. */
export function isWindowsImage(families: ImageCatalogFamily[], imageId: string): boolean {
  if (!imageId) return false
  const family = families.find((f) => f.versions.some((v) => v.id === imageId))
  return family?.name.toLowerCase() === "windows"
}

/** True for an instance launched from a Windows image. */
export function isWindowsInstance(instance: Pick<Instance, "os_family" | "os">): boolean {
  if (instance.os_family) return instance.os_family.toLowerCase() === "windows"
  return /windows/i.test(instance.os)
}

export type PasswordRule = "length" | "ascii" | "classes" | "username"

export interface PasswordCheck {
  rule: PasswordRule
  ok: boolean
}

/** Every rule with its pass/fail state, in display order. */
export function checkWindowsPassword(pw: string): PasswordCheck[] {
  const printable = /^[\x21-\x7e]*$/.test(pw)
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/].filter((re) => re.test(pw)).length
  return [
    {
      rule: "length",
      ok: pw.length >= WINDOWS_PASSWORD_MIN && pw.length <= WINDOWS_PASSWORD_MAX,
    },
    { rule: "ascii", ok: pw.length > 0 && printable },
    { rule: "classes", ok: printable && classes >= 3 },
    {
      rule: "username",
      ok: pw.length > 0 && !pw.toLowerCase().includes(WINDOWS_ADMIN_USER.toLowerCase()),
    },
  ]
}

export function isValidWindowsPassword(pw: string): boolean {
  return checkWindowsPassword(pw).every((c) => c.ok)
}

const LOWER = "abcdefghijkmnopqrstuvwxyz"
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ"
const DIGITS = "23456789"
// No quotes, backslash or characters that are awkward to type into a VNC
// console or an RDP prompt on a non-US keyboard.
const SYMBOLS = "!#%*+-=?@_"

function pick(chars: string, n: number): string[] {
  // Rejection sampling keeps the choice uniform: a plain modulo over a byte
  // favours the first characters of any alphabet whose size does not divide 256.
  const out: string[] = []
  const limit = 256 - (256 % chars.length)
  while (out.length < n) {
    for (const b of crypto.getRandomValues(new Uint8Array(n * 2))) {
      if (b < limit && out.length < n) out.push(chars[b % chars.length])
    }
  }
  return out
}

/** A random 20-character password that satisfies every rule. */
export function generateWindowsPassword(length = 20): string {
  const all = LOWER + UPPER + DIGITS + SYMBOLS
  const chars = [
    ...pick(LOWER, 2),
    ...pick(UPPER, 2),
    ...pick(DIGITS, 2),
    ...pick(SYMBOLS, 2),
    ...pick(all, length - 8),
  ]
  // Fisher-Yates, so the guaranteed classes are not always in front.
  const order = crypto.getRandomValues(new Uint32Array(chars.length))
  for (let i = chars.length - 1; i > 0; i--) {
    const j = order[i] % (i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join("")
}

/**
 * The .rdp connection file for an instance. It names the address and the
 * account only — never the password; Remote Desktop prompts for it.
 */
export function buildRdpFile(address: string): string {
  return [
    `full address:s:${address}:${String(RDP_PORT)}`,
    `username:s:${WINDOWS_ADMIN_USER}`,
    "prompt for credentials:i:1",
    "administrative session:i:1",
    "screen mode id:i:2",
    "use multimon:i:0",
    "desktopwidth:i:1600",
    "desktopheight:i:900",
    "session bpp:i:32",
    "authentication level:i:2",
    "redirectclipboard:i:1",
    "",
  ].join("\r\n")
}

/** Trigger a browser download of the instance's .rdp file. */
export function downloadRdpFile(instanceName: string, address: string): void {
  const blob = new Blob([buildRdpFile(address)], { type: "application/x-rdp" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `${instanceName.replace(/[^\w.-]+/g, "_") || "instance"}.rdp`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
