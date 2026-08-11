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
 * The tab invokes through the platform's Lambda Invoke API, so whatever is here
 * reaches the handler as its `event` argument, unwrapped. A plain object is
 * therefore a plain object — the HTTP envelope below is one starter among
 * others, for a function that sits behind a URL and expects to be given the
 * request, not the default shape everything is forced into.
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
