import type { RouteObject } from "react-router-dom"

export const authRoutes: RouteObject[] = [
    {
        path: "login",
        lazy: async () => {
            const { LoginPage } = await import("./partials/LoginPage")
            return { Component: LoginPage }
        },
    },
    {
        path: "signup",
        lazy: async () => {
            const { SignupPage } = await import("./partials/SignupPage")
            return { Component: SignupPage }
        },
    },
]
