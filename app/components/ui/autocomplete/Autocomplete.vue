<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { computed } from 'vue'
import { Check, Loader2, Search, X } from 'lucide-vue-next'
import {
  ComboboxAnchor,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxLabel,
  ComboboxPortal,
  ComboboxRoot,
  ComboboxSeparator,
  ComboboxViewport,
} from 'reka-ui'
import { ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { cn } from '@/utils'
import type { ComboboxOption, ComboboxOptionGroup } from '../combobox'

type LooseOption = ComboboxOption & { sublabel?: string }
type LooseGroup = ComboboxOptionGroup & { options: LooseOption[] }

const props = withDefaults(defineProps<{
  options: LooseOption[] | LooseGroup[]
  modelValue?: string | null
  placeholder?: string
  emptyText?: string
  loading?: boolean
  disabled?: boolean
  /** Disable client-side filter; parent updates options via @search event. */
  async?: boolean
  debounce?: number
  /** Override the input's display text when a value is selected (useful when options list rotates after search). */
  displayLabel?: string | null
  /** When true, Enter searches immediately; typing still auto-searches after a pause (deduped). Useful for async API search. */
  searchOnEnter?: boolean
  /** Hide every option until this many characters are typed (0 = show the full list on click). */
  minSearchLength?: number
  class?: HTMLAttributes['class']
  /** Extra classes for the popover content (e.g. raise z-index inside a modal). */
  contentClass?: HTMLAttributes['class']
  /** 'sm' shrinks height/padding/font for dense table rows; default matches other form fields. */
  size?: 'sm' | 'default'
}>(), {
  placeholder: 'Ara...',
  emptyText: 'Sonuç bulunamadı.',
  // Async aramada her tuş vuruşunda istek atmamak için varsayılan bekleme.
  // Kullanıcı yazmayı ~350ms duraklattığında (kelime bitti sayılır) arar.
  debounce: 350,
  searchOnEnter: false,
  minSearchLength: 0,
  size: 'default',
})

const emit = defineEmits<{
  // Boş değer daima '' olarak emit edilir (null değil): tüketicilerin çoğu
  // string tipli form alanları bağlar ve null, trim() gibi çağrılarda
  // runtime hatası üretir (customers/new il-ilçe 500 vakası).
  'update:modelValue': [value: string]
  'search': [query: string]
}>()

const isGrouped = computed(() =>
  // length > 0 kontrolü hemen öncesinde; index 0 bu dalda garanti tanımlı.
  props.options.length > 0 && 'options' in props.options[0]!,
)

const flatOptions = computed((): LooseOption[] => {
  if (isGrouped.value) {
    return (props.options as LooseGroup[]).flatMap(g => g.options)
  }
  return props.options as LooseOption[]
})

function getSublabel(opt: LooseOption): string | undefined {
  return opt.description ?? opt.sublabel
}

// reka-ui bunu seçim/reset akışında ComboboxRoot'un modelValue'su ile çağırır ve
// dönen değeri doğrudan input'un search-term'ine yazar. Seçim yokken argüman
// undefined gelir; undefined döndürürsek searchTerm string olmaktan çıkar ve
// aşağıdaki searchTerm.trim() çağrıları sayfayı düşürür (Sentry TIMON-WEB-N/P/Q).
function displayValue(val: string | undefined): string {
  if (props.displayLabel != null && val) return props.displayLabel
  return flatOptions.value.find(o => o.value === val)?.label ?? val ?? ''
}

const debouncedSearch = props.debounce > 0
  ? useDebounceFn((q: string) => emit('search', q), props.debounce)
  : (q: string) => emit('search', q)

const lastEmittedSearch = ref<string | null>(null)

// searchOnEnter modunda da yazma duraklamasında otomatik arama yapılır (deduped):
// yalnızca-Enter davranışı masaüstü kullanıcılarını "veri gelmiyor" sanmasına yol
// açtı (destek bileti: temsilci araması). Enter, beklemeden anında aramak için kalır.
const debouncedDeferredSearch = useDebounceFn((q: string) => {
  if (q === lastEmittedSearch.value) return
  lastEmittedSearch.value = q
  emit('search', q)
}, 350)

// Reka-ui'nin ComboboxRoot iç search-term state'i modelValue null/empty'e
// dönüşse bile son yazılan/seçilen metni bırakır. Burada search-term'i kontrollü
// hale getiriyoruz; dışarıdan modelValue boşaltıldığında input da temizlensin.
const searchTerm = ref('')
watch(
  () => props.modelValue,
  (val) => {
    if (val == null || val === '') {
      searchTerm.value = ''
      lastEmittedSearch.value = null
    }
  },
)

// Input odakta değilken (kullanıcı arama yazmıyorken) görünen metni seçili
// değerin etiketine senkronla. Düzenle modalı açıldığında modelValue dışarıdan
// set edildiğinde ve options async aramayla sonradan geldiğinde, ham kod yerine
// gerçek etiket (temsilci adı / mikro kullanıcı) gösterilsin diye gerekli.
const isFocused = ref(false)
watch(
  [flatOptions, () => props.modelValue, () => props.displayLabel, isFocused],
  () => {
    if (isFocused.value) return
    const val = props.modelValue
    if (val == null || val === '') return
    const label =
      props.displayLabel ?? flatOptions.value.find(o => o.value === val)?.label ?? String(val)
    if (label !== searchTerm.value) searchTerm.value = label
  },
  { immediate: true },
)

// minSearchLength > 0 iken alan tıklanınca TÜM liste açılmaz: kullanıcı yeterince
// karakter yazana kadar hiçbir seçenek render edilmez (fuar cari seçimi — 500'e
// varan katılımcı listesinin tamamının açılması destek bileti konusu oldu).
const visibleOptions = computed((): LooseOption[] | LooseGroup[] => {
  if (props.minSearchLength <= 0) return props.options
  return searchTerm.value.trim().length >= props.minSearchLength ? props.options : []
})

const emptyMessage = computed(() => {
  if (props.loading) return 'Yükleniyor...'
  if (props.minSearchLength > 0 && searchTerm.value.trim().length < props.minSearchLength) {
    return 'Aramak için yazmaya başlayın.'
  }
  return props.emptyText
})

function handleInput(e: Event) {
  const query = (e.target as HTMLInputElement).value
  if (props.searchOnEnter) {
    debouncedDeferredSearch(query)
    return
  }
  debouncedSearch(query)
}

function handleEnter(e: KeyboardEvent) {
  if (!props.searchOnEnter) return
  const query = (e.target as HTMLInputElement).value
  if (query === lastEmittedSearch.value) return
  lastEmittedSearch.value = query
  emit('search', query)
}

// Alan içindeki büyüteç butonu — Enter'ın tıklanabilir karşılığı. Enter'ı
// bilmeyen/klavyesiz kullanıcı için görünür bir arama yolu ("müşteri arama
// butonu çalışmıyor" destek bileti: buton yoktu, ↵ rozeti tıklanabilir
// sanılıyordu). Dedup'a takılmaz: butona basan kullanıcı SONUÇ istiyordur.
function searchNow() {
  lastEmittedSearch.value = searchTerm.value
  emit('search', searchTerm.value)
}

function clearValue() {
  lastEmittedSearch.value = null
  searchTerm.value = ''
  emit('update:modelValue', '')
  emit('search', '')
}

function onSelect(val: string | undefined) {
  emit('update:modelValue', val ?? '')
}
</script>

<template>
  <!-- open-on-click: reka-ui'de varsayılan KAPALI — alan tıklanınca liste açılmıyor,
       yalnızca yazmaya başlayınca açılıyordu. Yerel listelerde (temsilci, plasiyer)
       bu "tıkladım, veri gelmiyor" olarak görünüyordu; artık tıklamada tam liste
       açılır (açılışta arama terimi sıfırlanır, seçili değer listeyi süzmez). -->
  <ComboboxRoot
    :model-value="modelValue ?? undefined"
    :ignore-filter="async"
    :reset-search-term-on-select="true"
    open-on-click
    :disabled="disabled"
    @update:model-value="onSelect"
  >
    <ComboboxAnchor as-child>
      <div :class="cn('relative flex items-center', props.class)">
        <ComboboxInput
          :model-value="searchTerm"
          :display-value="displayValue"
          :placeholder="placeholder"
          @update:model-value="(value: string | undefined) => (searchTerm = value ?? '')"
          :class="cn(
            'flex w-full rounded-lg border border-input bg-background ring-offset-background',
            'transition-colors duration-150 placeholder:text-muted-foreground',
            'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'hover:border-ring/40 disabled:cursor-not-allowed disabled:opacity-50',
            size === 'sm' ? 'h-8 px-2 text-xs' : 'h-10 px-3 py-2 text-sm',
            (loading || modelValue || (searchOnEnter && searchTerm.trim())) ? (size === 'sm' ? 'pr-7' : 'pr-9') : '',
          )"
          @input="handleInput"
          @keydown.enter="handleEnter"
          @focus="isFocused = true"
          @blur="isFocused = false"
        />
        <div :class="cn('pointer-events-none absolute flex items-center', size === 'sm' ? 'right-2' : 'right-3')">
          <Loader2 v-if="loading" class="size-4 animate-spin text-muted-foreground" />
          <button
            v-else-if="modelValue"
            type="button"
            class="pointer-events-auto text-muted-foreground transition-colors hover:text-foreground"
            @mousedown.prevent="clearValue"
          >
            <X class="size-4" />
          </button>
          <!-- mousedown.prevent: input odağı düşmesin (blur, reka popup'ını kapatıp
               tıklamayı yutuyordu) — üstteki temizle butonuyla aynı desen. -->
          <button
            v-else-if="searchOnEnter && searchTerm.trim()"
            type="button"
            title="Ara"
            aria-label="Ara"
            class="pointer-events-auto text-muted-foreground transition-colors hover:text-foreground"
            @mousedown.prevent="searchNow"
          >
            <Search class="size-4" />
          </button>
        </div>
      </div>
    </ComboboxAnchor>

    <ComboboxPortal>
      <ComboboxContent
        :class="cn(
          'relative z-50 max-h-72 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-xl',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
          props.contentClass,
        )"
        position="popper"
        :side-offset="4"
        :style="{ width: 'var(--reka-combobox-trigger-width)', minWidth: '200px' }"
      >
        <ComboboxViewport class="p-1">
          <ComboboxEmpty class="py-6 text-center text-sm text-muted-foreground">
            {{ emptyMessage }}
          </ComboboxEmpty>

          <!-- Grouped options -->
          <template v-if="isGrouped">
            <template v-for="(group, gi) in (visibleOptions as ComboboxOptionGroup[])" :key="group.label">
              <ComboboxSeparator v-if="gi > 0" class="mx-1 my-1 h-px bg-border/60" />
              <ComboboxGroup>
                <ComboboxLabel class="px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                  {{ group.label }}
                </ComboboxLabel>
                <ComboboxItem
                  v-for="opt in group.options"
                  :key="opt.value"
                  :value="opt.value"
                  :disabled="opt.disabled"
                  class="relative flex w-full cursor-default select-none items-center rounded-md py-2 pl-8 pr-3 text-sm outline-hidden transition-colors data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50"
                >
                  <span class="absolute left-2 flex size-4 items-center justify-center">
                    <ComboboxItemIndicator>
                      <Check class="size-3.5" />
                    </ComboboxItemIndicator>
                  </span>
                  <div class="min-w-0 flex-1">
                    <div class="truncate">{{ opt.label }}</div>
                    <div v-if="getSublabel(opt)" class="mt-0.5 truncate text-xs text-muted-foreground">{{ getSublabel(opt) }}</div>
                  </div>
                </ComboboxItem>
              </ComboboxGroup>
            </template>
          </template>

          <!-- Flat options -->
          <template v-else>
            <ComboboxItem
              v-for="opt in (visibleOptions as LooseOption[])"
              :key="opt.value"
              :value="opt.value"
              :disabled="opt.disabled"
              class="relative flex w-full cursor-default select-none items-center rounded-md py-2 pl-8 pr-3 text-sm outline-hidden transition-colors data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50"
            >
              <span class="absolute left-2 flex size-4 items-center justify-center">
                <ComboboxItemIndicator>
                  <Check class="size-3.5" />
                </ComboboxItemIndicator>
              </span>
              <div class="min-w-0 flex-1">
                <div class="truncate">{{ opt.label }}</div>
                <div v-if="getSublabel(opt)" class="mt-0.5 truncate text-xs text-muted-foreground">{{ getSublabel(opt) }}</div>
              </div>
            </ComboboxItem>
          </template>
        </ComboboxViewport>
      </ComboboxContent>
    </ComboboxPortal>
  </ComboboxRoot>
</template>
