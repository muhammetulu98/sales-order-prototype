<script setup lang="ts">
// Yazma ucu henüz olmayan ekran bölümlerinde dürüst uyarı: kullanıcı değişikliğin kalıcı
// olmadığını bilsin. Uç gelince kaldırılır (BEKLEYEN_API_DEGISIKLIKLERI.md).
import { Info } from "lucide-vue-next";

defineProps<{ message: string }>();
</script>

<template>
  <div
    class="flex items-start gap-2 rounded-md border border-status-pending-border bg-status-pending-bg px-3 py-2 text-[12px] text-status-pending-text"
    role="note"
  >
    <Info class="mt-px size-3.5 shrink-0" aria-hidden="true" />
    <span>{{ message }}</span>
  </div>
</template>
