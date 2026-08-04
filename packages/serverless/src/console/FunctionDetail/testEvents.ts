export interface TestEventTemplate {
  id: string
  label: string
  /** Pretty-printed JSON, ready to drop into the event textarea. */
  body: string
}

const pretty = (value: unknown) => JSON.stringify(value, null, 2)

/**
 * Starter payloads for the Test tab, mirroring Lambda's canned test events.
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
  {
    id: "s3-put",
    label: "S3 put",
    body: pretty({
      Records: [
        {
          s3: {
            bucket: { name: "example-bucket" },
            object: { key: "uploads/photo.png", size: 1024 },
          },
        },
      ],
    }),
  },
  {
    id: "scheduled-event",
    label: "Scheduled event",
    body: pretty({ source: "aws.events", "detail-type": "Scheduled Event", detail: {} }),
  },
]
