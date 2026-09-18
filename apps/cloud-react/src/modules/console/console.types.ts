// Shapes mirror cloud-be-go: apps/console/terminal (dto.SessionTicket).

/** Close code a console uses to say "this session could not be opened"; the
 *  close reason carries the sentence to show. Sent by whichever side terminates
 *  the socket — cloud-be-go, or the node's proxmox-manager when the console is
 *  served by the node the instance runs on. */
export const CLOSE_CONSOLE_FAILED = 4001

/** Single-use ticket returned by POST /console/terminal/sessions. The browser
 *  opens the WebSocket at ws_path with ?ticket=ticket (browsers cannot send an
 *  Authorization header on a WebSocket upgrade). */
export interface SessionTicket {
  ticket: string
  ws_path: string
  /** Absolute origin to open the socket on. Two things set it:
   *   - the node that runs the instance, when consoles are served there
   *     ("wss://n-01a063bb.console.ap-south-3a.datadack.cloud:8443") — the
   *     socket then never touches AWS at all;
   *   - CONSOLE_WS_PUBLIC_ORIGIN, when the console still terminates in
   *     cloud-be-go and the API's own ingress can't carry a WebSocket upgrade
   *     (AWS API Gateway strips them).
   *  Empty/absent → same-origin. Either way the browser does the same thing,
   *  which is what let the console move without a client release. */
  ws_origin?: string
  session_id: string
  expires_in: number
}
