<script setup lang="ts">
// Kod + ad alanı (legacy ERP deseni): dar, mono bir kod kutusu (tıklayınca aranabilir liste)
// ve yanında seçili kaydın adı. Sözlük büyük olabilir (marka ~4.400) — liste ilk 100 eşleşmeyi çizer.
import { Loader2, Search, X } from "lucide-vue-next";
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from "reka-ui";

export interface CodeLookupOption {
  code: string;
  name: string | null;
}

const props = withDefaults(
  defineProps<{
    modelValue: string;
    options: readonly CodeLookupOption[];
    /** Seçenekler arasında yoksa gösterilecek ad (ör. kayıttan gelen tedarikçi unvanı). */
    fallbackName?: string | null;
    placeholder?: string;
    searchPlaceholder?: string;
    disabled?: boolean;
    /** true: süzmeyi üst bileşen yapar (@search), liste olduğu gibi çizilir. */
    async?: boolean;
    loading?: boolean;
    id?: string;
  }>(),
  { fallbackName: null, placeholder: "", searchPlaceholder: "Kod veya ad ara...", async: false, loading: false },
);

const emit = defineEmits<{ "update:modelValue": [value: string]; search: [query: string] }>();

const MAX_RENDERED = 100;
const open = ref(false);
const query = ref("");

const displayName = computed(() => {
  if (!props.modelValue) return null;
  return props.options.find((option) => option.code === props.modelValue)?.name ?? props.fallbackName;
});

const matches = computed(() => {
  if (props.async) return props.options;
  const term = query.value.trim().toLocaleLowerCase("tr");
  if (!term) return props.options;
  return props.options.filter(
    (option) =>
      option.code.toLocaleLowerCase("tr").includes(term) || (option.name ?? "").toLocaleLowerCase("tr").includes(term),
  );
});

const pick = (code: string) => {
  emit("update:modelValue", code);
  open.value = false;
};

const onOpenChange = (value: boolean) => {
  open.value = value;
  if (!value) query.value = "";
};

watch(query, (value) => {
  if (props.async) emit("search", value);
});
</script>

<template>
  <div class="flex min-w-0 items-center gap-3">
    <PopoverRoot :open="open" @update:open="onOpenChange">
      <PopoverTrigger as-child>
        <button
          :id="id"
          type="button"
          :disabled="disabled"
          class="flex h-8 w-36 shrink-0 items-center justify-between gap-1 rounded-md border border-input bg-paper px-2 text-left font-mono text-[13px] tabular-nums transition-colors hover:border-ink-300 focus:border-action-deep focus:outline-hidden focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:bg-tier-low disabled:opacity-80"
        >
          <span class="truncate" :class="modelValue ? 'text-ink' : 'text-ink-muted/70'">{{ modelValue || placeholder || "—" }}</span>
          <Search class="size-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverContent
          align="start"
          :side-offset="4"
          class="z-50 w-[360px] overflow-hidden rounded-xl border bg-popover p-0 text-popover-foreground shadow-xl"
        >
          <div class="flex items-center gap-2 border-b border-border/60 px-3">
            <Search class="size-4 shrink-0 text-muted-foreground" />
            <input
              v-model="query"
              :placeholder="searchPlaceholder"
              class="h-10 flex-1 bg-transparent text-sm outline-hidden placeholder:text-muted-foreground"
              @keydown.esc="open = false"
            >
            <Loader2 v-if="loading" class="size-4 animate-spin text-muted-foreground" />
          </div>
          <div role="listbox" class="max-h-72 overflow-y-auto p-1">
            <button
              v-if="modelValue"
              type="button"
              class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-ink-muted hover:bg-accent"
              @click="pick('')"
            >
              <X class="size-3.5" />
              Seçimi kaldır
            </button>
            <p v-if="!matches.length" class="py-6 text-center text-sm text-muted-foreground">
              {{ loading ? "Yükleniyor..." : "Sonuç bulunamadı." }}
            </p>
            <button
              v-for="option in matches.slice(0, MAX_RENDERED)"
              :key="option.code"
              type="button"
              role="option"
              :aria-selected="option.code === modelValue"
              class="flex w-full items-baseline gap-3 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-accent"
              :class="option.code === modelValue ? 'bg-tier font-medium' : ''"
              @click="pick(option.code)"
            >
              <span class="w-28 shrink-0 truncate font-mono tabular-nums text-ink-muted">{{ option.code }}</span>
              <span class="min-w-0 truncate text-ink">{{ option.name ?? "—" }}</span>
            </button>
            <p v-if="matches.length > MAX_RENDERED" class="px-2 py-1.5 text-[12px] text-ink-muted">
              {{ matches.length - MAX_RENDERED }} kayıt daha — aramayı daraltın.
            </p>
          </div>
        </PopoverContent>
      </PopoverPortal>
    </PopoverRoot>
    <span class="min-w-0 truncate text-[13px]" :class="displayName ? 'text-ink' : 'text-ink-muted'" :title="displayName ?? undefined">
      {{ displayName ?? "" }}
    </span>
  </div>
</template>
