<script setup lang="ts">
import {
  useVueTable,
  FlexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type FilterFn,
} from '@tanstack/vue-table'

export interface DataTableColumn {
  key: string
  header: string
  sortable?: boolean
  filterable?: boolean
  filterType?: 'text' | 'number' | 'select'
  align?: 'left' | 'right' | 'center'
  class?: string
  headerClass?: string
}

const props = withDefaults(defineProps<{
  columns: DataTableColumn[]
  data: any[]
  loading?: boolean
  error?: string | null
  rowKey?: string | ((row: any, index: number) => string | number)
  total?: number
  page?: number
  pageSize?: number
  minWidth?: string
  striped?: boolean
  rowClass?: (row: any) => string | undefined
  clickable?: boolean
  expandable?: boolean
  expandedKeys?: string[]
  serverSort?: { key: string | null; dir: 'asc' | 'desc' }
}>(), {
  loading: false,
  error: null,
  total: 0,
  page: 1,
  pageSize: 15,
  minWidth: '',
  striped: true,
  clickable: false,
  expandable: false,
  expandedKeys: undefined,
  serverSort: undefined,
})

const emit = defineEmits<{
  'update:page': [page: number]
  'row-click': [row: any]
  'update:expandedKeys': [keys: string[]]
  'update:sort': [sort: { key: string; dir: 'asc' | 'desc' }]
}>()

const numberRangeFilter: FilterFn<any> = (row, columnId, filterValue: [string, string]) => {
  const val = Number(row.getValue(columnId))
  const [min, max] = filterValue
  if (min !== '' && val < Number(min)) return false
  if (max !== '' && val > Number(max)) return false
  return true
}
numberRangeFilter.autoRemove = (val: [string, string]) => !val?.[0] && !val?.[1]

const exactMatchFilter: FilterFn<any> = (row, columnId, filterValue: string) => {
  if (!filterValue) return true
  return String(row.getValue(columnId)) === filterValue
}
exactMatchFilter.autoRemove = (val: string) => !val

const tanstackColumns = computed<ColumnDef<any>[]>(() =>
  props.columns.map((col) => ({
    id: col.key,
    accessorKey: col.key,
    header: col.header,
    enableSorting: col.sortable ?? false,
    enableColumnFilter: col.filterable ?? false,
    filterFn: col.filterType === 'number'
      ? numberRangeFilter
      : col.filterType === 'select'
        ? exactMatchFilter
        : 'includesString',
  }))
)

const sorting = ref<SortingState>([])
const columnFilters = ref<ColumnFiltersState>([])
const filtersOpen = ref(false)
const filterDraft = ref<Record<string, string | [string, string]>>({})

const hasFilterableColumns = computed(() =>
  props.columns.some(c => c.filterable)
)

const activeFilterCount = computed(() => columnFilters.value.length)

const selectOptions = computed(() => {
  const result: Record<string, string[]> = {}
  for (const col of props.columns) {
    if (col.filterable && col.filterType === 'select') {
      result[col.key] = [...new Set(
        props.data.map(row => String(row[col.key] ?? '')).filter(Boolean)
      )].sort()
    }
  }
  return result
})

const activeFilters = computed(() =>
  columnFilters.value.map(f => {
    const col = props.columns.find(c => c.key === f.id)
    if (!col) return null
    let label: string
    if (col.filterType === 'number') {
      const [min, max] = f.value as [string, string]
      if (min && max) label = `${col.header}: ${min}–${max}`
      else if (min) label = `${col.header}: ≥${min}`
      else label = `${col.header}: ≤${max}`
    } else {
      label = `${col.header}: ${f.value}`
    }
    return { id: f.id, label }
  }).filter((x): x is { id: string; label: string } => x !== null)
)

watch(filterDraft, (draft) => {
  const filters: ColumnFiltersState = []
  for (const col of props.columns) {
    if (!col.filterable) continue
    const val = draft[col.key]
    if (col.filterType === 'number') {
      const [min, max] = (val as [string, string]) ?? ['', '']
      if (min !== '' || max !== '') filters.push({ id: col.key, value: [min, max] })
    } else {
      const s = (val as string) ?? ''
      if (s) filters.push({ id: col.key, value: s })
    }
  }
  columnFilters.value = filters
}, { deep: true })

const clearFilter = (colKey: string) => {
  const col = props.columns.find(c => c.key === colKey)
  filterDraft.value = {
    ...filterDraft.value,
    [colKey]: col?.filterType === 'number' ? ['', ''] : '',
  }
}

const setNumberDraft = (key: string, pos: 'min' | 'max', val: string) => {
  const current = filterDraft.value[key] as [string, string] | undefined
  const [curMin, curMax] = current ?? ['', '']
  filterDraft.value = {
    ...filterDraft.value,
    [key]: pos === 'min' ? [val, curMax] : [curMin, val],
  }
}

const table = useVueTable({
  get data() { return props.data },
  get columns() { return tanstackColumns.value },
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  state: {
    get sorting() { return sorting.value },
    get columnFilters() { return columnFilters.value },
  },
  onSortingChange: (updater) => {
    sorting.value = typeof updater === 'function' ? updater(sorting.value) : updater
  },
  onColumnFiltersChange: (updater) => {
    columnFilters.value = typeof updater === 'function' ? updater(columnFilters.value) : updater
  },
  enableSortingRemoval: false,
})

const showPagination = computed(() => (props.total ?? 0) > (props.pageSize ?? 15))
const totalPages = computed(() =>
  props.total && props.pageSize ? Math.max(1, Math.ceil(props.total / props.pageSize)) : 1
)
const visiblePageNumbers = computed(() => {
  const pages: number[] = []
  const cur = props.page ?? 1
  const start = Math.max(1, cur - 2)
  const end = Math.min(totalPages.value, cur + 2)
  for (let p = start; p <= end; p++) pages.push(p)
  return pages
})

const getRowKey = (row: any, index: number): string | number => {
  if (!props.rowKey) return index
  if (typeof props.rowKey === 'function') return props.rowKey(row, index)
  return row[props.rowKey as string] ?? index
}

const sortIconFor = (headerId: string) => {
  const col = table.getColumn(headerId)
  if (!col?.getCanSort()) return null
  const sorted = col.getIsSorted()
  return sorted === 'asc' ? '▲' : sorted === 'desc' ? '▼' : '↕'
}

const alignClass = (col: DataTableColumn) => {
  if (col.align === 'right') return 'text-right'
  if (col.align === 'center') return 'text-center'
  return ''
}

// Expand helpers
const isExpanded = (key: string | number) =>
  props.expandedKeys?.includes(String(key)) ?? false

const toggleExpanded = (key: string | number) => {
  const k = String(key)
  const current = props.expandedKeys ?? []
  const next = current.includes(k)
    ? current.filter(x => x !== k)
    : [...current, k]
  emit('update:expandedKeys', next)
}

const totalColumns = computed(() => props.columns.length + (props.expandable ? 1 : 0))

// Server-side sort helpers
const handleHeaderClick = (colKey: string, canSort: boolean) => {
  if (!canSort) return
  if (props.serverSort !== undefined) {
    const nextDir =
      props.serverSort.key === colKey && props.serverSort.dir === 'asc' ? 'desc' : 'asc'
    emit('update:sort', { key: colKey, dir: nextDir })
  } else {
    table.getColumn(colKey)?.toggleSorting()
  }
}

const getEffectiveSortIcon = (colKey: string): string | null => {
  const col = props.columns.find(c => c.key === colKey)
  if (!col?.sortable) return null
  if (props.serverSort !== undefined) {
    return props.serverSort.key === colKey
      ? (props.serverSort.dir === 'asc' ? '▲' : '▼')
      : '↕'
  }
  return sortIconFor(colKey)
}
</script>

<template>
  <div class="flex flex-col">
    <!-- Filter toolbar -->
    <div v-if="hasFilterableColumns" class="flex flex-wrap items-center gap-2 border-b border-ink-200 bg-ink-50/60 px-4 py-2.5">
      <Button
        :variant="activeFilterCount > 0 ? 'default' : 'outline'"
        size="sm"
        class="h-8 gap-1.5 text-xs"
        @click="filtersOpen = !filtersOpen"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="size-3.5" aria-hidden="true">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
        </svg>
        Filtrele
        <span
          v-if="activeFilterCount > 0"
          class="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-white/20 px-1 text-[10px] font-semibold tabular-nums"
        >{{ activeFilterCount }}</span>
      </Button>

      <template v-if="activeFilterCount > 0">
        <span
          v-for="f in activeFilters"
          :key="f.id"
          class="inline-flex items-center gap-1.5 rounded border border-primary/25 bg-primary/10 px-2 py-0.5 text-xs font-medium text-action-deep"
        >
          {{ f.label }}
          <button
            type="button"
            class="ml-0.5 rounded-full text-primary/60 transition-colors hover:text-primary"
            :aria-label="`${f.label} filtresini temizle`"
            @click="clearFilter(f.id)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="size-3" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </span>
        <button
          type="button"
          class="text-xs text-ink-400 transition-colors hover:text-ink-700"
          @click="filterDraft = {}"
        >Temizle</button>
      </template>
    </div>

    <!-- Filter panel -->
    <div
      v-if="filtersOpen && hasFilterableColumns"
      class="grid grid-cols-2 gap-3 border-b border-tier-highest bg-tier-low px-4 py-3 sm:grid-cols-3 lg:grid-cols-4"
    >
      <template v-for="col in columns.filter(c => c.filterable)" :key="col.key">
        <!-- text filter -->
        <div v-if="!col.filterType || col.filterType === 'text'" class="flex flex-col gap-1">
          <span
            class="text-[10px] font-semibold uppercase tracking-wider"
            :class="(filterDraft[col.key] as string) ? 'text-primary' : 'text-ink-500'"
          >
            {{ col.header }}<span v-if="(filterDraft[col.key] as string)" class="ml-1 text-primary">●</span>
          </span>
          <div
            class="flex items-center gap-1.5 rounded-md border bg-white px-2.5 py-1.5 text-xs focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20"
            :class="(filterDraft[col.key] as string) ? 'border-primary/40 bg-primary/5' : 'border-ink-200'"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="size-3 shrink-0 text-ink-400" aria-hidden="true">
              <circle cx="11" cy="11" r="7"/><path d="m21 21-3.5-3.5"/>
            </svg>
            <input
              type="text"
              :value="(filterDraft[col.key] as string) ?? ''"
              class="w-full bg-transparent outline-hidden placeholder:text-ink-300"
              :placeholder="`${col.header} filtrele…`"
              @input="filterDraft = { ...filterDraft, [col.key]: ($event.target as HTMLInputElement).value }"
            />
            <button
              v-if="(filterDraft[col.key] as string)"
              type="button"
              class="shrink-0 text-ink-300 hover:text-ink-600"
              @click="filterDraft = { ...filterDraft, [col.key]: '' }"
              aria-label="Temizle"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="size-3" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        <!-- number filter -->
        <div v-else-if="col.filterType === 'number'" class="flex flex-col gap-1">
          <span
            class="text-[10px] font-semibold uppercase tracking-wider"
            :class="((filterDraft[col.key] as [string,string])?.[0] || (filterDraft[col.key] as [string,string])?.[1]) ? 'text-primary' : 'text-ink-500'"
          >
            {{ col.header }}<span v-if="((filterDraft[col.key] as [string,string])?.[0] || (filterDraft[col.key] as [string,string])?.[1])" class="ml-1 text-primary">●</span>
          </span>
          <div class="flex gap-1">
            <input
              type="number"
              :value="(filterDraft[col.key] as [string,string])?.[0] ?? ''"
              class="w-1/2 rounded-md border border-ink-200 bg-white px-2 py-1.5 text-right text-xs tabular-nums outline-hidden placeholder:text-ink-300 focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
              placeholder="min"
              @input="setNumberDraft(col.key, 'min', ($event.target as HTMLInputElement).value)"
            />
            <input
              type="number"
              :value="(filterDraft[col.key] as [string,string])?.[1] ?? ''"
              class="w-1/2 rounded-md border border-ink-200 bg-white px-2 py-1.5 text-right text-xs tabular-nums outline-hidden placeholder:text-ink-300 focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
              placeholder="max"
              @input="setNumberDraft(col.key, 'max', ($event.target as HTMLInputElement).value)"
            />
          </div>
        </div>

        <!-- select filter -->
        <div v-else-if="col.filterType === 'select'" class="flex flex-col gap-1">
          <span
            class="text-[10px] font-semibold uppercase tracking-wider"
            :class="(filterDraft[col.key] as string) ? 'text-primary' : 'text-ink-500'"
          >
            {{ col.header }}<span v-if="(filterDraft[col.key] as string)" class="ml-1 text-primary">●</span>
          </span>
          <select
            :value="(filterDraft[col.key] as string) ?? ''"
            class="w-full rounded-md border bg-white px-2.5 py-1.5 text-xs outline-hidden focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
            :class="(filterDraft[col.key] as string) ? 'border-primary/40 bg-primary/5 font-medium text-primary' : 'border-ink-200 text-ink-700'"
            @change="filterDraft = { ...filterDraft, [col.key]: ($event.target as HTMLSelectElement).value }"
          >
            <option value="">Tümü</option>
            <option v-for="opt in selectOptions[col.key]" :key="opt" :value="opt">{{ opt }}</option>
          </select>
        </div>
      </template>
    </div>

    <!-- Initial loading -->
    <div v-if="loading && data.length === 0" class="flex items-center justify-center gap-2 py-16 text-sm text-ink-400" role="status" aria-live="polite">
      <svg class="size-4 shrink-0 animate-spin motion-reduce:hidden" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      Yükleniyor…
    </div>

    <!-- Table area -->
    <div v-else class="relative overflow-x-auto">
      <!-- Reload overlay -->
      <div v-if="loading" class="absolute inset-0 z-10 flex items-center justify-center bg-white/60" role="status" aria-live="polite">
        <svg class="size-5 animate-spin text-primary/70 motion-reduce:hidden" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>

      <Table
        :class="striped ? 'table-striped' : ''"
        :style="minWidth ? { minWidth } : {}"
      >
        <TableHeader>
          <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
            <TableHead v-if="expandable" class="w-10 shrink-0" />
            <TableHead
              v-for="header in headerGroup.headers"
              :key="header.id"
              :class="[
                columns.find(c => c.key === header.id)?.headerClass,
                alignClass(columns.find(c => c.key === header.id) ?? { key: header.id, header: '' }),
                header.column.getCanSort() ? 'th-sort' : '',
                (serverSort !== undefined
                  ? serverSort.key === header.id
                  : header.column.getIsSorted())
                  ? 'active' : '',
              ]"
              @click="handleHeaderClick(header.id, header.column.getCanSort())"
            >
              <slot :name="`header-${header.id}`">
                <span class="inline-flex items-center gap-1">
                  <FlexRender :render="header.column.columnDef.header" :props="header.getContext()" />
                  <span v-if="getEffectiveSortIcon(header.id)" class="sort-icon">{{ getEffectiveSortIcon(header.id) }}</span>
                </span>
              </slot>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <!-- Error row -->
          <TableRow v-if="error">
            <TableCell :colspan="totalColumns" class="py-10 text-center text-sm text-rose-600">
              {{ error }}
            </TableCell>
          </TableRow>

          <!-- Data rows -->
          <template v-else-if="table.getRowModel().rows.length > 0">
            <template v-for="row in table.getRowModel().rows" :key="getRowKey(row.original, row.index)">
              <TableRow
                :class="[
                  rowClass?.(row.original),
                  (expandable || clickable) ? 'cursor-pointer' : '',
                ]"
                @click="expandable
                  ? toggleExpanded(getRowKey(row.original, row.index))
                  : (clickable ? emit('row-click', row.original) : undefined)"
              >
                <TableCell v-if="expandable" class="w-10 pr-0">
                  <button
                    type="button"
                    :aria-label="isExpanded(getRowKey(row.original, row.index)) ? 'Satırı daralt' : 'Satırı genişlet'"
                    :aria-expanded="isExpanded(getRowKey(row.original, row.index))"
                    class="inline-flex size-7 items-center justify-center rounded text-ink-400 ease-out transition-colors hover:text-ink-700"
                    @click.stop="toggleExpanded(getRowKey(row.original, row.index))"
                  >
                    <svg
                      class="size-3.5 transition-transform duration-150 ease-out"
                      :class="isExpanded(getRowKey(row.original, row.index)) ? 'rotate-90' : ''"
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                      stroke-linecap="round" stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M9 6l6 6-6 6"/>
                    </svg>
                  </button>
                </TableCell>
                <TableCell
                  v-for="cell in row.getVisibleCells()"
                  :key="cell.id"
                  :class="[
                    columns.find(c => c.key === cell.column.id)?.class,
                    alignClass(columns.find(c => c.key === cell.column.id) ?? { key: cell.column.id, header: '' }),
                  ]"
                >
                  <slot :name="cell.column.id" :row="row.original" :value="cell.getValue()">
                    <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
                  </slot>
                </TableCell>
              </TableRow>
              <TableRow
                v-if="expandable && isExpanded(getRowKey(row.original, row.index))"
                class="bg-ink-50/40 hover:bg-ink-50/40"
              >
                <TableCell class="w-10 border-l-2 border-brand-200 bg-brand-50/30 p-0" />
                <TableCell :colspan="columns.length" class="px-0 py-0">
                  <slot name="expanded-row" :row="row.original" />
                </TableCell>
              </TableRow>
            </template>
          </template>

          <!-- Empty state -->
          <TableRow v-else>
            <TableCell :colspan="totalColumns" class="py-16 text-center">
              <slot name="empty">
                <div class="text-sm text-ink-400">Kayıt bulunamadı.</div>
              </slot>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- Pagination -->
    <nav
      v-if="showPagination"
      class="flex flex-col gap-3 border-t border-ink-200 bg-ink-50/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      aria-label="Sayfa numarası"
    >
      <p class="text-xs tabular-nums text-ink-500">
        <span class="font-semibold text-ink-700">{{ page }}</span>
        <span class="text-ink-400"> / {{ totalPages }} sayfa</span>
        <span class="mx-1.5 text-ink-300">•</span>
        <span class="font-semibold text-ink-700">{{ total }}</span>
        <span class="text-ink-400"> kayıt</span>
      </p>
      <div class="flex items-center gap-1">
        <button
          type="button"
          class="inline-flex size-8 items-center justify-center rounded-md border border-ink-200 bg-white text-ink-500 transition-colors duration-200 hover:bg-ink-50 hover:text-ink-800 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-ink-500"
          aria-label="Önceki sayfa"
          :disabled="(page ?? 1) <= 1"
          @click="emit('update:page', (page ?? 1) - 1)"
        >
          <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
        </button>
        <button
          v-for="p in visiblePageNumbers"
          :key="p"
          type="button"
          :aria-label="`${p}. sayfa`"
          :aria-current="p === page ? 'page' : undefined"
          class="inline-flex size-8 items-center justify-center rounded-md font-mono text-xs font-semibold tabular-nums transition-colors duration-200"
          :class="p === page
            ? 'bg-action text-primary-foreground'
            : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900'"
          @click="emit('update:page', p)"
        >{{ p }}</button>
        <button
          type="button"
          class="inline-flex size-8 items-center justify-center rounded-md border border-ink-200 bg-white text-ink-500 transition-colors duration-200 hover:bg-ink-50 hover:text-ink-800 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-ink-500"
          aria-label="Sonraki sayfa"
          :disabled="(page ?? 1) >= totalPages"
          @click="emit('update:page', (page ?? 1) + 1)"
        >
          <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
        </button>
      </div>
    </nav>
  </div>
</template>
