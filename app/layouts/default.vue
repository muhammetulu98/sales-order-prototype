<script setup lang="ts">
// PROTOTİP kabuğu: yalnız üst bar + içerik (sidebar, sekme şeridi ve diğer ekranlar yok).
</script>

<template>
  <div class="min-h-screen bg-surface">
    <header class="flex h-14 items-center justify-between border-t-[3px] border-t-action bg-graphite px-6 text-white">
      <span class="text-sm font-semibold">Timon ERP</span>
      <span class="font-mono text-[11px] uppercase tracking-[0.08em] text-white/60">Prototip · kayıt yapılmaz</span>
    </header>
    <main class="mx-auto w-full max-w-[1800px] px-6 py-6">
      <slot />
    </main>
  </div>
</template>
