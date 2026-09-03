import { Button } from "@datadack/common-ui"
import { CheckCircle2, XCircle } from "lucide-react"
import { useTranslation } from "react-i18next"

/**
 * One hostname's outcome from a batch submit.
 *
 * Kept per hostname rather than as a single pass/fail, because a batch really
 * does land half-and-half: a quota that runs out partway, one name already
 * claimed on another project, one typo the server rejects that the client's
 * looser check let through. Reporting "3 of 5 added" without saying WHICH two
 * failed leaves the tenant to diff the list by eye.
 */
export interface BatchResult {
  hostname: string
  ok: boolean
  /** The server's sentence, on failure. */
  error?: string
}

/**
 * What happened to each hostname in a multi-domain add.
 *
 * Its own component so the dialog stays legible, and its own file so the shared
 * BatchResult type does not turn the dialog module into a mixed export that
 * breaks fast refresh.
 */
export function AddDomainBatchResults({
  results,
  onViewRecords,
}: Readonly<{
  results: BatchResult[]
  /**
   * Open one added hostname's DNS records without leaving the dialog. Absent
   * when there are none to open — an internal name is answering already — and
   * the button is then not rendered at all rather than leading to an empty
   * step.
   */
  onViewRecords?: (hostname: string) => void
}>) {
  const { t } = useTranslation()

  return (
    <div className="max-h-72 divide-y divide-border/60 overflow-y-auto rounded-md border border-border/60">
      {results.map((result) => (
        <div key={result.hostname} className="flex items-start gap-2.5 p-3">
          {result.ok ? (
            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-status-success" />
          ) : (
            <XCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-[12px] text-foreground">{result.hostname}</p>
            {/* The server's own sentence — "already claimed", the quota
                refusal, the zone rule. Ours would say less. */}
            {!result.ok && result.error && (
              <p className="mt-0.5 break-words text-[11px] text-destructive">{result.error}</p>
            )}
          </div>
          {/* Every added row still needs its DNS records, and they differ per
              hostname. This is the way to each one without closing the dialog
              and hunting for the row in the table. */}
          {result.ok && onViewRecords && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="-my-1 h-7 shrink-0 px-2 text-[12px]"
              onClick={() => {
                onViewRecords(result.hostname)
              }}
            >
              {t("domains.actions.viewRecords")}
            </Button>
          )}
        </div>
      ))}
    </div>
  )
}
