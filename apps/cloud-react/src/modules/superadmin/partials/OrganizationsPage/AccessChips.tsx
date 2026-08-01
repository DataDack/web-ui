import { Crown, ShieldCheck } from "lucide-react"
import { useTranslation } from "react-i18next"

import type { OverviewUser } from "../../superadmin.types"

/** Root / super-admin markers for a user row; an em dash when neither applies. */
export function AccessChips({ user }: Readonly<{ user: OverviewUser }>) {
    const { t } = useTranslation()
    if (!user.is_root && !user.is_super_admin)
        return <span className="text-[12px] text-muted-foreground">—</span>
    return (
        <div className="flex items-center gap-1.5">
            {user.is_root && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                    <Crown className="size-3" />
                    {t("superAdmin.organizations.root")}
                </span>
            )}
            {user.is_super_admin && (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-600 dark:text-violet-400">
                    <ShieldCheck className="size-3" />
                    {t("superAdmin.organizations.superAdmin")}
                </span>
            )}
        </div>
    )
}
