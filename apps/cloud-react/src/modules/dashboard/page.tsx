import { useTranslation } from "react-i18next"
import { useScreen } from "@/services/api/screen"

import { PageHeader } from "@/components/console"

import { QuickActions } from "./partials/QuickActions"
import { ServiceHealth } from "./partials/ServiceHealth"
import { SovereignServices } from "./partials/SovereignServices"

export function DashboardPage() {
    useScreen("dashboard")
    const { t } = useTranslation()

    return (
        <div className="mx-auto flex max-w-[1440px] flex-col gap-6">
            <PageHeader title={t("dashboard.home.title")} className="mb-0" />

            <div className="flex flex-col gap-6">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
                    <QuickActions />
                    <ServiceHealth />
                </div>
                <SovereignServices />
            </div>
        </div>
    )
}
