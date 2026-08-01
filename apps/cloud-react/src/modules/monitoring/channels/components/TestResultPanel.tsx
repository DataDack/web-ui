import { CheckCircle2, ExternalLink, XCircle } from "lucide-react"

import type { TestChannelResult } from "../../monitoring.types"

export function TestResultPanel({ result }: Readonly<{ result: TestChannelResult }>) {
    if (result.delivered) {
        return (
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm">
                <div className="flex items-center gap-2 font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="size-4 shrink-0" />
                    Delivered
                    {typeof result.status_code === "number" && (
                        <span className="font-mono text-xs opacity-80">
                            HTTP {result.status_code}
                        </span>
                    )}
                </div>
                {result.issue_url && (
                    <a
                        href={result.issue_url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="mt-1.5 inline-flex items-center gap-1 font-mono text-xs text-emerald-600 underline underline-offset-2 hover:opacity-80 dark:text-emerald-400"
                    >
                        {result.issue_key ?? result.issue_url}
                        <ExternalLink className="size-3" />
                    </a>
                )}
            </div>
        )
    }
    return (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
            <div className="flex items-center gap-2 font-medium text-destructive">
                <XCircle className="size-4 shrink-0" />
                Not delivered
                {typeof result.status_code === "number" && (
                    <span className="font-mono text-xs opacity-80">HTTP {result.status_code}</span>
                )}
            </div>
            {result.error && (
                <p className="mt-1.5 break-all font-mono text-xs text-destructive/90">
                    {result.error}
                </p>
            )}
        </div>
    )
}
