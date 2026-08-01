// Client-side Ed25519 SSH keypair generation.
//
// The backend (cloud-be-go apps/compute/sshkeys) only ever accepts a `public_key`
// and derives the fingerprint from it — there is no server-side generation.
// So when a user chooses "generate", we mint the keypair here with Web Crypto,
// hand them the private key to save locally, and submit only the public key.
// The private key never leaves the browser.

export interface GeneratedKeyPair {
  /** OpenSSH single-line public key — `ssh-ed25519 AAAA... comment` */
  publicKey: string
  /** OpenSSH PEM private key — the contents of an `id_ed25519` file */
  privateKey: string
}

const textEncoder = new TextEncoder()
const KEY_TYPE = textEncoder.encode("ssh-ed25519")
const AUTH_MAGIC = textEncoder.encode("openssh-key-v1\0")

function uint32(value: number): Uint8Array {
  const out = new Uint8Array(4)
  new DataView(out.buffer).setUint32(0, value, false) // big-endian
  return out
}

/** Length-prefixed SSH `string`: 4-byte big-endian length followed by bytes. */
function sshString(bytes: Uint8Array): Uint8Array {
  return concat(uint32(bytes.length), bytes)
}

function concat(...chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}

function toBase64(bytes: Uint8Array): string {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function wrapPem(base64: string, width = 70): string {
  const lines: string[] = []
  for (let i = 0; i < base64.length; i += width) {
    lines.push(base64.slice(i, i + width))
  }
  return lines.join("\n")
}

/** `ssh-ed25519` || rawPublicKey — shared by the public key and private blob. */
function publicKeyBlob(rawPublicKey: Uint8Array): Uint8Array {
  return concat(sshString(KEY_TYPE), sshString(rawPublicKey))
}

function encodeOpenSSHPublicKey(rawPublicKey: Uint8Array, comment: string): string {
  const body = toBase64(publicKeyBlob(rawPublicKey))
  return comment ? `ssh-ed25519 ${body} ${comment}` : `ssh-ed25519 ${body}`
}

function encodeOpenSSHPrivateKey(
  rawPublicKey: Uint8Array,
  seed: Uint8Array,
  comment: string,
): string {
  // OpenSSH stores the Ed25519 private key as seed(32) || publicKey(32).
  const privateKeyMaterial = concat(seed, rawPublicKey)
  const commentBytes = textEncoder.encode(comment)

  // Two matching random "check" integers guard against corrupt decryption.
  const check = crypto.getRandomValues(new Uint8Array(4))
  let privateSection = concat(
    check,
    check,
    sshString(KEY_TYPE),
    sshString(rawPublicKey),
    sshString(privateKeyMaterial),
    sshString(commentBytes),
  )

  // Pad to the "none" cipher block size (8) with the sequence 1, 2, 3, …
  const blockSize = 8
  const padLen = (blockSize - (privateSection.length % blockSize)) % blockSize
  if (padLen > 0) {
    const padding = new Uint8Array(padLen)
    for (let i = 0; i < padLen; i++) padding[i] = i + 1
    privateSection = concat(privateSection, padding)
  }

  const none = textEncoder.encode("none")
  const blob = concat(
    AUTH_MAGIC,
    sshString(none), // ciphername
    sshString(none), // kdfname
    sshString(new Uint8Array(0)), // kdfoptions
    uint32(1), // number of keys
    sshString(publicKeyBlob(rawPublicKey)),
    sshString(privateSection),
  )

  return `-----BEGIN OPENSSH PRIVATE KEY-----\n${wrapPem(toBase64(blob))}\n-----END OPENSSH PRIVATE KEY-----\n`
}

/** True when the current browser exposes Ed25519 in the Web Crypto API. */
export function canGenerateKeyPair(): boolean {
  return typeof crypto !== "undefined" && typeof crypto.subtle.generateKey === "function"
}

/**
 * Generate a fresh Ed25519 keypair in OpenSSH format. The returned private key
 * is the only copy — it is never transmitted anywhere.
 *
 * @throws if the browser does not support Ed25519 in Web Crypto.
 */
export async function generateEd25519KeyPair(comment: string): Promise<GeneratedKeyPair> {
  let keyPair: CryptoKeyPair
  try {
    keyPair = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"])
  } catch {
    throw new Error("ED25519_UNSUPPORTED")
  }

  const rawPublicKey = new Uint8Array(await crypto.subtle.exportKey("raw", keyPair.publicKey))
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey("pkcs8", keyPair.privateKey))
  // The 32-byte Ed25519 seed is the trailing segment of the fixed-layout PKCS#8.
  const seed = pkcs8.slice(-32)

  return {
    publicKey: encodeOpenSSHPublicKey(rawPublicKey, comment),
    privateKey: encodeOpenSSHPrivateKey(rawPublicKey, seed, comment),
  }
}
