<script setup lang="ts">
// Ortam ilerleme çubuğu: her useApi isteği useRequestActivity üzerinden buraya düşer.
// Manuel "yükleniyor" toast'ı YOK (B2B kuralı korunur). Kırmızı = aktif gösterge
// (The One Red Rule kapsamında meşru kullanım); hata olursa Pressed Red'e koyulaşır.
const activity = useRequestActivity();

const visible = computed(
  () => activity.active.value || activity.progress.value > 0,
);
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5"
    role="progressbar"
    aria-label="İstek durumu"
    :aria-hidden="!visible"
  >
    <div
      class="h-full transition-[width] duration-150 ease-out"
      :class="activity.hasError.value ? 'bg-action-deep' : 'bg-action'"
      :style="{ width: `${visible ? activity.progress.value : 0}%`, opacity: visible ? 1 : 0 }"
    />
  </div>
</template>
