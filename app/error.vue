<script setup lang="ts">
// Yakalanmamış hata ekranı: Nuxt'ın markasız varsayılanı yerine tekrar deneme / ana sayfa.
import type { NuxtError } from "#app";

const props = defineProps<{ error: NuxtError }>();

const isNotFound = computed(() => props.error.statusCode === 404);
const retry = () => clearError({ redirect: useRoute().fullPath });
const goHome = () => clearError({ redirect: "/" });
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-tier-low px-6">
    <div class="w-full max-w-md rounded-lg border border-tier-highest bg-paper p-8 text-center">
      <p class="font-data text-xs tracking-[0.08em] text-action-deep">
        {{ isNotFound ? "SAYFA BULUNAMADI" : `HATA ${error.statusCode ?? ""}`.trim() }}
      </p>
      <h1 class="mt-2 text-lg font-bold text-ink">
        {{ isNotFound ? "Aradığınız sayfa yok" : "Bir şeyler ters gitti" }}
      </h1>
      <p class="mt-2 text-[13px] leading-relaxed text-ink-muted">
        {{ isNotFound
          ? "Adres değişmiş ya da kayıt kaldırılmış olabilir."
          : "Beklenmeyen bir hata oluştu. Tekrar deneyin; sorun sürerse sistem yöneticisine bildirin." }}
      </p>
      <div class="mt-6 flex justify-center gap-2">
        <Button v-if="!isNotFound" @click="retry">Tekrar Dene</Button>
        <Button variant="secondary" @click="goHome">Genel Bakış</Button>
      </div>
    </div>
  </div>
</template>
