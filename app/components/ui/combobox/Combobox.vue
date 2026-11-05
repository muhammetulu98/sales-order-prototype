<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { ref, computed } from 'vue'
import { Check, ChevronsUpDown, Loader2, Search, X } from 'lucide-vue-next'
import { PopoverRoot, PopoverTrigger, PopoverPortal, PopoverContent } from 'reka-ui'
import { cn } from '@/utils'

export interface ComboboxOption {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

export interface ComboboxOptionGroup {
  label: string
  options: ComboboxOption[]
}

const props = withDefaults(defineProps<{
  options: ComboboxOption[] | ComboboxOptionGroup[]
  modelValue?: string | null
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  loading?: boolean
  disabled?: boolean
  /** When true, disables client-side filtering. Parent updates options based on @search event. */
  async?: boolean
  clearable?: boolean
  /** Liste genişliği tetikleyiciye değil içeriğe göre (en az tetikleyici kadar, en çok 360px). */
  fitContent?: boolean
  class?: HTMLAttributes['class']
}>(), {
  placeholder: 'Seçiniz...',
  searchPlaceholder: 'Ara...',
  emptyText: 'Sonuç bulunamadı.',
  clearable: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
  'search': [query: string]
}>()

const open = ref(false)
const search = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

const isGrouped = computed(() =>
  // length > 0 kontrolü hemen öncesinde; index 0 bu dalda garanti tanımlı.
  props.options.length > 0 && 'options' in props.options[0]!,
)

const flatOptions = computed((): ComboboxOption[] => {
  if (isGrouped.value) {
    return (props.options as ComboboxOptionGroup[]).flatMap(g => g.options)
  }
  return props.options as ComboboxOption[]
})

const selectedLabel = computed(() => {
  if (!props.modelValue) return null
  return flatOptions.value.find(o => o.value === props.modelValue)?.label ?? props.modelValue
})

const filteredFlat = computed((): ComboboxOption[] => {
  if (!search.value || props.async) return flatOptions.value
  const q = search.value.toLocaleLowerCase('tr')
  return flatOptions.value.filter(o =>
    o.label.toLocaleLowerCase('tr').includes(q) || o.description?.toLocaleLowerCase('tr').includes(q),
  )
})

const filteredGrouped = computed((): ComboboxOptionGroup[] => {
  if (!isGrouped.value) return []
  if (!search.value || props.async) return props.options as ComboboxOptionGroup[]
  const q = search.value.toLocaleLowerCase('tr')
  return (props.options as ComboboxOptionGroup[])
    .map(g => ({
      ...g,
      options: g.options.filter(o =>
        o.label.toLocaleLowerCase('tr').includes(q) || o.description?.toLocaleLowerCase('tr').includes(q),
      ),
    }))
    .filter(g => g.options.length > 0)
})

const isEmpty = computed(() => {
  if (isGrouped.value) return filteredGrouped.value.length === 0
  return filteredFlat.value.length === 0
})

function onSearchInput(e: Event) {
  search.value = (e.target as HTMLInputElement).value
  emit('search', search.value)
}

function select(value: string) {
  const next = value === props.modelValue && props.clearable ? null : value
  emit('update:modelValue', next)
  open.value = false
  search.value = ''
}

function clear(e: MouseEvent) {
  e.stopPropagation()
  emit('update:modelValue', null)
}

function onOpenChange(val: boolean) {
  open.value = val
  if (!val) {
    search.value = ''
  } else {
    setTimeout(() => inputRef.value?.focus(), 0)
  }
}
</script>

<template>
  <PopoverRoot :open="open" @update:open="onOpenChange">
    <PopoverTrigger as-child>
      <button
        type="button"
        :disabled="disabled"
        :aria-expanded="open"
        :aria-haspopup="'listbox'"
        :class="cn(
          'flex h-8 w-full items-center justify-between rounded-md border border-input bg-paper px-2 text-[13px]',
          'transition-colors duration-200 hover:border-ink-300',
          'focus:outline-hidden focus:border-action-deep focus:ring-2 focus:ring-ring/20',
          'disabled:cursor-not-allowed disabled:opacity-50',
          props.class,
        )"
      >
        <span :class="cn('flex-1 truncate text-left', !selectedLabel && 'text-ink-muted/70')">
          {{ selectedLabel ?? placeholder }}
        </span>
        <div class="flex shrink-0 items-center gap-1">
          <button
            v-if="clearable && modelValue && !loading"
            type="button"
            class="text-muted-foreground transition-colors hover:text-foreground"
            @click="clear"
          >
            <X class="size-3.5" />
          </button>
          <Loader2 v-if="loading" class="size-4 animate-spin text-muted-foreground" />
          <ChevronsUpDown v-else class="size-4 text-muted-foreground" />
        </div>
      </button>
    </PopoverTrigger>

    <PopoverPortal>
      <PopoverContent
        align="start"
        :side-offset="4"
        :style="fitContent
          ? { width: 'max-content', minWidth: 'var(--reka-popover-trigger-width)', maxWidth: '360px' }
          : { width: 'var(--reka-popover-trigger-width)', minWidth: '200px' }"
        class="z-50 overflow-hidden rounded-xl border bg-popover p-0 text-popover-foreground shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
      >
        <!-- Search input -->
        <div class="flex items-center gap-2 border-b border-border/60 px-3">
          <Search class="size-4 shrink-0 text-muted-foreground" />
          <input
            ref="inputRef"
            :value="search"
            :placeholder="searchPlaceholder"
            class="h-10 flex-1 bg-transparent text-sm outline-hidden placeholder:text-muted-foreground"
            @input="onSearchInput"
            @keydown.esc="open = false"
          />
        </div>

        <!-- Options list -->
        <div role="listbox" class="max-h-64 overflow-y-auto p-1">
          <!-- Empty state -->
          <div v-if="isEmpty" class="py-6 text-center text-sm text-muted-foreground">
            {{ loading ? 'Yükleniyor...' : emptyText }}
          </div>

          <!-- Grouped options -->
          <template v-if="isGrouped && !isEmpty">
            <template v-for="(group, gi) in filteredGrouped" :key="group.label">
              <div v-if="gi > 0" class="mx-1 my-1 h-px bg-border/60" />
              <div class="px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                {{ group.label }}
              </div>
              <button
                v-for="opt in group.options"
                :key="opt.value"
                type="button"
                role="option"
                :aria-selected="modelValue === opt.value"
                :disabled="opt.disabled"
                :class="cn(
                  'relative flex w-full cursor-default select-none items-center rounded-md py-1.5 pl-8 pr-3 text-sm transition-colors',
                  'hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-hidden',
                  modelValue === opt.value && 'bg-accent/50',
                  'disabled:pointer-events-none disabled:opacity-50',
                )"
                @click="select(opt.value)"
              >
                <span class="absolute left-2 flex size-4 items-center justify-center">
                  <Check v-if="modelValue === opt.value" class="size-3.5" />
                </span>
                <div class="text-left">
                  <div>{{ opt.label }}</div>
                  <div v-if="opt.description" class="text-xs text-muted-foreground">{{ opt.description }}</div>
                </div>
              </button>
            </template>
          </template>

          <!-- Flat options -->
          <template v-else-if="!isGrouped && !isEmpty">
            <button
              v-for="opt in filteredFlat"
              :key="opt.value"
              type="button"
              role="option"
              :aria-selected="modelValue === opt.value"
              :disabled="opt.disabled"
              :class="cn(
                'relative flex w-full cursor-default select-none items-center rounded-md py-1.5 pl-8 pr-3 text-sm transition-colors',
                'hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-hidden',
                modelValue === opt.value && 'bg-accent/50',
                'disabled:pointer-events-none disabled:opacity-50',
              )"
              @click="select(opt.value)"
            >
              <span class="absolute left-2 flex size-4 items-center justify-center">
                <Check v-if="modelValue === opt.value" class="size-3.5" />
              </span>
              <div class="text-left">
                <div>{{ opt.label }}</div>
                <div v-if="opt.description" class="text-xs text-muted-foreground">{{ opt.description }}</div>
              </div>
            </button>
          </template>
        </div>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
