import path from "path"

import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
    server: {
        host: "::",
        port: 3000,
        // Dev server accepts any Host header, so it can be reached through
        // hostnames/reverse proxies other than localhost.
        allowedHosts: true,
        proxy: {
            // Must match the backend's PORT (cloud-be-go/.env). Override
            // with VITE_API_PROXY if you run the API elsewhere.
            "/api": {
                target: process.env.VITE_API_PROXY ?? "http://localhost:8080",
                changeOrigin: false,
                // ws:true forwards the WebSocket upgrade for the VM console
                // (/api/v1/console/terminal/ws). Prod reverse proxies must
                // likewise pass Upgrade/Connection headers on this path.
                ws: true,
            },
            // The aggregate health endpoint is mounted at the API root, not
            // under /api/v1, so it needs its own proxy entry.
            "/actuator": {
                target: process.env.VITE_API_PROXY ?? "http://localhost:8080",
                changeOrigin: false,
            },
        },
    },
    plugins: [
        {
            name: "global-shim",
            transformIndexHtml() {
                return [
                    {
                        tag: "script",
                        children: "window.global = window;",
                        injectTo: "head-prepend",
                    },
                ]
            },
        },
        tailwindcss(),
        react(),
    ],
    build: {
        // JS code-splitting left on (rolldown default) so the route-level lazy
        // imports in the routers actually produce separate chunks instead of one
        // monolithic bundle — the superadmin console loads only when entered.
        // cssCodeSplit stays off: a single stylesheet avoids per-chunk CSS
        // flashes and keeps Tailwind's layer ordering intact.
        cssCodeSplit: false,
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
})
