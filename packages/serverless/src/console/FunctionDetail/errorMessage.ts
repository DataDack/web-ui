/**
 * The message to toast for a failed mutation. The package deliberately knows
 * neither console's error envelope — a transport that wants a friendlier
 * message throws an Error carrying it; anything else falls back to the label.
 */
export function errorMessage(error: unknown, fallback: string): string {
  return (error instanceof Error && error.message) || fallback
}
