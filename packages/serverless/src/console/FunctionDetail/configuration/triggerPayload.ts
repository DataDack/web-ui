import type { Trigger } from "../../../data/types"

/**
 * A representative event body for a trigger, built from the trigger's own
 * fields.
 *
 * This is a SAMPLE, not a recording: nothing in the control plane stores the
 * last payload a function received, so the alternative to synthesising one is
 * showing nothing at all. It is shaped like the real thing and filled from the
 * trigger's actual bucket/schedule/name, so it is worth copying into the Test
 * tab — which is the job it is here to do.
 */
export function samplePayload(trigger: Trigger, functionName: string): string {
  const now = new Date().toISOString()

  if (trigger.type === "s3") {
    return JSON.stringify(
      {
        Records: [
          {
            eventVersion: "2.1",
            eventSource: "aws:s3",
            eventTime: now,
            eventName: "ObjectCreated:Put",
            s3: {
              bucket: { name: trigger.bucket ?? "" },
              object: {
                key: `${trigger.prefix ?? ""}example${trigger.suffix ?? ".json"}`,
                size: 1024,
              },
            },
          },
        ],
      },
      null,
      2,
    )
  }

  // Every remaining type the control plane accepts is a scheduled one, and the
  // scheduler posts the same envelope for all of them.
  return JSON.stringify(
    {
      id: trigger.id,
      "detail-type": "Scheduled Event",
      source: "faas.scheduler",
      time: trigger.nextFireAt ?? now,
      resources: [trigger.name ?? trigger.id],
      detail: {
        functionName,
        schedule: trigger.schedule ?? "",
        ...(trigger.intervalSeconds ? { intervalSeconds: trigger.intervalSeconds } : {}),
      },
    },
    null,
    2,
  )
}
