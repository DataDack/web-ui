import { Bell } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function NotificationsMenu() {
    const { t } = useTranslation()

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-lg text-muted-foreground hover:text-foreground"
                    aria-label={t("nav.notifications")}
                >
                    <Bell className="size-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel>{t("nav.notifications")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                    {t("console.shell.noNotifications")}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
