<script setup lang="ts">
// Çoklu seçim: tetikleyicide seçilenler çip olarak, açılan listede onay kutulu seçenekler.
// Görünüm Combobox ile aynı aileden (h-8 tetikleyici, aynı popover).
import type { HTMLAttributes } from "vue"
import { Check, ChevronDown, Search, X } from "lucide-vue-next"
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from "reka-ui"
import { cn } from "@/utils"

export interface MultiSelectOption {
  value: string
  label: string
}

const props = withDefaults(defineProps<{
  options: MultiSelectOption[]
  modelValue: string[]
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  /** Seçenek sayısı bunu aşarsa listede arama kutusu çıkar. */
  searchThreshold?: number
  class?: HTMLAttributes["class"]
}>(), {
  placeholder: "Seçiniz...",
  searchPlaceholder: "Ara...",
  emptyText: "Sonuç bulunamadı.",
  searchThreshold: 8,
})

const emit = defineEmits<{ "update:modelValue": [value: string[]] }>()

const open = ref(false)
const search = ref("")

const selected = computed(() =>
  props.modelValue
    .map(value => props.options.find(option => option.value === value) ?? { value, label: value }),
)

const filtered = computed(() => {
  const query = search.value.trim().toLocaleLowerCase("tr")
  if (!query) return props.options
  return props.options.filter(option => option.label.toLocaleLowerCase("tr").includes(query))
})

const toggle = (value: string) => {
  emit(
    "update:modelValue",
    props.modelValue.includes(value)
      ? props.modelValue.filter(existing => existing !== value)
      : [...props.modelValue, value],
  )
}

const onOpenChange = (value: boolean) => {
  open.value = value
  if (!value) search.value = ""
}
</script>

<template>
  <div :class="cn('relative w-full', props.class)">
    <PopoverRoot :open="open" @update:open="onOpenChange">
      <PopoverTrigger as-child>
        <button
          type="button"
          :disabled="disabled"
          :aria-expanded="open"
          aria-haspopup="listbox"
          class="flex min-h-8 w-full items-center gap-1 rounded-md border border-input bg-paper py-1 pl-1.5 pr-14 text-left text-[13px] transition-colors duration-200 hover:border-ink-300 focus:border-action-deep focus:outline-hidden focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span v-if="!selected.length" class="truncate px-0.5 text-ink-muted/70">{{ placeholder }}</span>
          <span v-else class="flex flex-wrap gap-1">
            <span
              v-for="item in selected"
              :key="item.value"
              class="rounded-full border border-tier-highest bg-tier px-2 py-0.5 text-[12px] leading-4 text-ink"
            >
              {{ item.label }}
            </span>
          </span>
        </button>
      </PopoverTrigger>

      <PopoverPortal>
        <PopoverContent
          align="start"
          :side-offset="4"
          :style="{ width: 'var(--reka-popover-trigger-width)', minWidth: '200px' }"
          class="z-50 overflow-hidden rounded-xl border bg-popover p-0 text-popover-foreground shadow-xl"
        >
          <div v-if="options.length > searchThreshold" class="flex items-center gap-2 border-b border-border/60 px-3">
            <Search class="size-4 shrink-0 text-muted-foreground" />
            <input
              v-model="search"
              :placeholder="searchPlaceholder"
              class="h-10 flex-1 bg-transparent text-sm outline-hidden placeholder:text-muted-foreground"
            >
          </div>
          <div role="listbox" aria-multiselectable="true" class="max-h-64 overflow-y-auto p-1">
            <p v-if="!filtered.length" class="py-6 text-center text-sm text-muted-foreground">{{ emptyText }}</p>
            <button
              v-for="option in filtered"
              :key="option.value"
              type="button"
              role="option"
              :aria-selected="modelValue.includes(option.value)"
              class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent focus:bg-accent focus:outline-hidden"
              @click="toggle(option.value)"
            >
              <span
                class="flex size-4 shrink-0 items-center justify-center rounded border"
                :class="modelValue.includes(option.value) ? 'border-ink bg-ink text-paper' : 'border-input bg-paper'"
              >
                <Check v-if="modelValue.includes(option.value)" class="size-3" />
              </span>
              <span class="truncate">{{ option.label }}</span>
            </button>
          </div>
        </PopoverContent>
      </PopoverPortal>
    </PopoverRoot>

    <div class="pointer-events-none absolute inset-y-0 right-2 flex items-center gap-1">
      <button
        v-if="modelValue.length && !disabled"
        type="button"
        class="pointer-events-auto text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Seçimi temizle"
        @click="emit('update:modelValue', [])"
      >
        <X class="size-3.5" />
      </button>
      <ChevronDown class="size-4 text-muted-foreground" />
    </div>
  </div>
</template>
