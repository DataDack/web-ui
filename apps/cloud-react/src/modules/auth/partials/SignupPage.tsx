import { useTranslation } from "react-i18next"

import { useScreen } from "@/services/api/screen"

import { AuthLayout } from "../components/AuthLayout"
import { AuthProviders } from "../components/AuthProviders"

export function SignupPage() {
  useScreen("auth.signup")
  const { t } = useTranslation()
  return (
    <AuthLayout
      kicker={t("auth.signup.kicker")}
      headline={t("auth.signup.title")}
      subtitle={t("auth.signup.subtitle")}
      editorial={t("auth.signup.editorial")}
      quote={t("auth.signup.quote")}
      quoteAttr={t("auth.signup.quoteAttr")}
      footerLeft={t("auth.signup.haveAccount")}
      footerLinkTo="/login"
      footerLinkText={t("auth.signup.loginLink")}
    >
      <AuthProviders flow="signup" />
    </AuthLayout>
  )
}
