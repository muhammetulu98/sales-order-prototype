<script setup lang="ts">
import { Toaster } from "vue-sonner";
import "vue-sonner/style.css";
import { APP_NAME } from "#shared/branding";

useHead({ titleTemplate: (title) => (title ? `${title} · ${APP_NAME}` : APP_NAME) });
</script>

<template>
  <div>
    <RequestProgressBar />
    <NuxtLayout>
      <NuxtPage :page-key="(route) => route.fullPath" />
    </NuxtLayout>
    <Toaster position="top-right" rich-colors close-button />
  </div>
</template>
