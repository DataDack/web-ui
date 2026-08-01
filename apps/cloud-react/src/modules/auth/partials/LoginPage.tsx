import { useTranslation } from "react-i18next"

import { useScreen } from "@/services/api/screen"

import { AuthLayout } from "../components/AuthLayout"
import { AuthProviders } from "../components/AuthProviders"

export function LoginPage() {
  useScreen("auth.login")
  const { t } = useTranslation()
  return (
    <AuthLayout
      kicker={t("auth.login.kicker")}
      headline={t("auth.login.title")}
      subtitle={t("auth.login.subtitle")}
      editorial={t("auth.login.editorial")}
      quote={t("auth.login.quote")}
      quoteAttr={""}
    >
      <AuthProviders />
    </AuthLayout>
  )
}
