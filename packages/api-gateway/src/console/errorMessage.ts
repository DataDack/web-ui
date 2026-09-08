/**
 * The message to show for a failed call.
 *
 * The package deliberately knows no console's error envelope — the /v2 surface
 * answers in the AWS shape and a different host may not — so a transport that
 * wants a friendlier message throws an Error carrying it. Anything else falls
 * back to the label of the thing that was being attempted, which at least says
 * what failed.
 */
export function errorMessage(error: unknown, fallback: string): string {
  return (error instanceof Error && error.message) || fallback
}
