import { readFileSync } from "node:fs";
import tailwindcss from "@tailwindcss/vite";
import { APP_NAME } from "./shared/branding";

// Durum çubuğu (AppStatusBar): sürüm package.json'dan, derleme tarihi her `nuxt build`'de
// yeniden damgalanır (B2B AdminFooter ile aynı desen).
const appVersion = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8")).version as string;
const appBuildDate = new Date().toISOString();

// Backend iç adresi — yalnız Nitro proxy'si sunucu tarafında kullanır; tarayıcı
// her zaman same-origin /api/... çağırır (B2B ile aynı desen).
const apiInternal =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    ?.NUXT_API_INTERNAL || "http://127.0.0.1:7004";

export default defineNuxtConfig({
  compatibilityDate: "2026-08-26",
  devtools: { enabled: true },
  nitro: {
    output: {
      dir: "dist",
    },
  },
  // İç ERP uygulaması — auth durumu localStorage'da; SSR her zaman yanlış
  // (çıkış yapılmış) kabuk üretir ve hydration uyuşmazlığı doğurur.
  ssr: false,
  devServer: {
    port: 3007,
  },
  vite: {
    plugins: [tailwindcss()],
  },
  modules: ["shadcn-nuxt"],
  shadcn: {
    prefix: "",
    componentDir: "app/components/ui",
  },
  css: ["~/assets/css/main.css"],
  runtimeConfig: {
    apiInternal,
    public: {
      // Boş base: $fetch sayfa origin'ine gider → aşağıdaki proxy'den geçer.
      apiBase: "",
      appVersion,
      appBuildDate,
    },
  },
  // /api/v1 (auth) ve /api/erp (iş uçları) aynı .NET API'sine proxy'lenir.
  routeRules: {
    "/api/v1/**": { proxy: `${apiInternal}/api/v1/**` },
    "/api/erp/**": { proxy: `${apiInternal}/api/erp/**` },
  },
  app: {
    // Belge sekmesi şeridi (WorkspaceTabs) IDE sekmesi gibi davranır: bir sekmeye dönünce
    // filtre/scroll/form state korunur. page-key app.vue'da tam URL'e bağlanır, aksi halde
    // aynı [id] route'unda farklı kayıtlar arasında geçiş component'i yeniden mount etmez.
    keepalive: true,
    pageTransition: { name: "page", mode: "out-in" },
    head: {
      title: APP_NAME,
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
      ],
      link: [
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossorigin: "",
        },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap",
        },
      ],
    },
  },
});
