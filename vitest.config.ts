import { defineConfig } from "vitest/config";

// Yalnız saf yardımcılar test edilir (app/utils/*); Nuxt runtime gerektiren
// composable'lar sözleşme düzeyinde bu saf fonksiyonlara yaslanır.
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
