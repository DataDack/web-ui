import { ShieldCheck } from "lucide-react"
import { useScreen } from "@/services/api/screen"
import { useTranslation } from "react-i18next"

import { ComingSoon } from "@/components/console"

export function RolesListPage() {
    useScreen("iam.roles-list")
    const { t } = useTranslation()

    return (
        <ComingSoon
            icon={ShieldCheck}
            title={t("iam.roles.pageTitle")}
            description={t("iam.roles.subtitle")}
            breadcrumbs={[
                { label: t("console.nav.groups.iam") },
                { label: t("iam.roles.pageTitle") },
            ]}
        />
    )
}
