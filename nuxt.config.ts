// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    compatibilityDate: "2025-07-15",
    devtools: { enabled: true },
    modules: ["@pinia/nuxt"],
    css: ["~/assets/css/main.css"],
    app: {
        head: {
            style: [
                // We have to force this at the top level so no styling is inlined before the layers are in place.
                { innerHTML: "@layer vars, reset, base, component, utils;" },
            ],
        },
    },
    nitro: {
        experimental: {
            websocket: true,
        },
        serverAssets: [
            {
                baseName: "data",
                dir: "./server/data",
            },
        ],
    },
    vite: {
        plugins: [
            {
                name: "wrap-scoped-styles-in-layer",
                transform(code, id) {
                    if (id.includes("?vue&type=style") && id.includes("scoped")) {
                        return `@layer component {\n${code}\n}`;
                    }
                },
            },
        ],
        server: {
            allowedHosts: ["shiniest-redder-simone.ngrok-free.dev"],
        },
    },
});
