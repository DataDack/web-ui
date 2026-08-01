// Shapes mirror cloud-be-go: apps/console/terminal (dto.SessionTicket).

/** Single-use ticket returned by POST /console/terminal/sessions. The browser
 *  opens the WebSocket at ws_path with ?ticket=ticket (browsers cannot send an
 *  Authorization header on a WebSocket upgrade). */
export interface SessionTicket {
  ticket: string
  ws_path: string
  /** Absolute origin to open the socket on (e.g. "wss://ws.datadack.cloud")
   *  when the API ingress can't carry WebSocket upgrades (AWS API Gateway
   *  strips them). Empty/absent → same-origin. */
  ws_origin?: string
  session_id: string
  expires_in: number
}
