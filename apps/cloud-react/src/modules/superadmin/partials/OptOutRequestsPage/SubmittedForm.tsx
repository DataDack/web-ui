import type { ReactNode } from "react"

import { Mail } from "lucide-react"
import { useTranslation } from "react-i18next"

import { OPTOUT_RIGHTS, isIrreversible } from "./optout-constants"
import type { OptOutRequest } from "../../superadmin.types"

/**
 * The opt-out form exactly as the visitor filled it in.
 *
 * Every field the website asks for, in the order it is asked, under the label it
 * is asked under — including the ones left blank and the request types NOT
 * chosen. That completeness is the point: a rights request is a record of what
 * somebody asked for, and an operator deciding what to action needs to see the
 * whole submission rather than a summary of the parts that happened to be
 * filled. "They did not ask for erasure" and "the erasure flag went missing
 * somewhere" must not look the same.
 *
 * Nothing here is editable. The triage controls live below it, deliberately
 * separated: what was submitted is a fact, what we did about it is a decision.
 */
export function SubmittedForm({ request }: Readonly<{ request: OptOutRequest }>) {
  const { t } = useTranslation()
  const selected = new Set(request.request_types)

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
        {t("superAdmin.optOutRequests.submittedForm")}
      </p>

      <div className="rounded-lg border border-border divide-y divide-border">
        <Field label={t("superAdmin.optOutRequests.form.firstName")}>
          {request.first_name || "—"}
        </Field>
        <Field label={t("superAdmin.optOutRequests.form.lastName")}>
          {request.last_name || "—"}
        </Field>
        <Field label={t("superAdmin.optOutRequests.form.email")}>
          <a
            href={`mailto:${request.email}`}
            className="inline-flex items-center gap-1.5 text-primary hover:underline"
          >
            <Mail className="size-3.5" />
            {request.email}
          </a>
        </Field>

        {/* The checkbox group as it appeared: every option, ticked or not, with
            the description the visitor read underneath it. */}
        <div className="px-3 py-2.5 space-y-2">
          <p className="text-[11px] font-medium text-muted-foreground">
            {t("superAdmin.optOutRequests.form.requestType")}
          </p>
          <ul className="space-y-1.5">
            {OPTOUT_RIGHTS.map((right) => {
              const ticked = selected.has(right)
              return (
                <li key={right} className="flex gap-2.5">
                  <span
                    aria-hidden
                    className={
                      ticked
                        ? "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-primary bg-primary text-[10px] font-bold text-primary-foreground"
                        : "mt-0.5 size-4 shrink-0 rounded-[4px] border border-border"
                    }
                  >
                    {ticked ? "✓" : ""}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={
                        ticked
                          ? isIrreversible(right)
                            ? "text-sm font-semibold text-status-danger"
                            : "text-sm font-semibold text-foreground"
                          : "text-sm text-muted-foreground line-through decoration-border"
                      }
                    >
                      {t(`superAdmin.optOutRequests.rights.${right}`, { defaultValue: right })}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      {t(`superAdmin.optOutRequests.rightsDescriptions.${right}`, {
                        defaultValue: "",
                      })}
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="px-3 py-2.5 space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground">
            {t("superAdmin.optOutRequests.form.additionalInfo")}
          </p>
          {/* pre-wrap: their line breaks survive without anybody reflowing
              the words of a request we may have to quote back. */}
          <p className="text-sm text-foreground whitespace-pre-wrap">
            {request.additional_info || (
              <span className="text-muted-foreground">
                {t("superAdmin.optOutRequests.noneGiven")}
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
}: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <div className="flex items-baseline gap-3 px-3 py-2.5">
      <p className="w-28 shrink-0 text-[11px] font-medium text-muted-foreground">{label}</p>
      <div className="min-w-0 flex-1 text-sm break-words text-foreground">{children}</div>
    </div>
  )
}
