import { GlobalRegistrator } from "@happy-dom/global-registrator"

GlobalRegistrator.register()

await import("@testing-library/jest-dom")
