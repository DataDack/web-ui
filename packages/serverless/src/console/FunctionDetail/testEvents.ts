export interface TestEventTemplate {
  id: string
  label: string
  /** Pretty-printed JSON, ready to drop into the event textarea. */
  body: string
}

const pretty = (value: unknown) => JSON.stringify(value, null, 2)

/**
 * Starter payloads for the Test tab.
 *
 * Only HTTP-shaped events: the tab calls the function's public URL, so the
 * payload is a request body. An S3 notification or a scheduled event never
 * arrives that way — those come from a trigger, and offering them here invited
 * people to "test" a delivery path this tab cannot exercise.
 *
 * Data rather than labels: a console that wants different starters passes its
 * own list through `TestTabProps.templates`.
 */
export const TEST_EVENT_TEMPLATES: readonly TestEventTemplate[] = [
  {
    id: "hello-world",
    label: "Hello world",
    body: pretty({ key1: "value1", key2: "value2", key3: "value3" }),
  },
  {
    id: "api-gateway-proxy",
    label: "API Gateway proxy",
    body: pretty({
      version: "2.0",
      routeKey: "POST /orders",
      rawPath: "/orders",
      headers: { "content-type": "application/json" },
      body: '{"orderId":"1234"}',
    }),
  },
]
