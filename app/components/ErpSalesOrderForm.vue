<script setup lang="ts">
// Kesit 7 · ekran 04 (Teklif) + 05 (Sipariş) — TEK belge formu. Legacy'de de iki form
// aynı SIPARISLER satırını farklı sip_tip ile yazar; ayrı model kurulmaz, tip prop'tur.
//
// Stok/fiyat kontrolleri frontend'de hazır; API sözleşmesi bekleyen API dokümanında.
import { useDebounceFn } from "@vueuse/core";
import { Plus, Search, Trash2, X } from "lucide-vue-next";
import type {
  ErpSalesOrderDetail,
  ErpSalesOrderLookups,
  ErpSalesOrderSavePayload,
} from "~/composables/useErpSalesOrders";
import { discountPercentsOf, SALES_OFFER_TYPE } from "~/composables/useErpSalesOrders";
import type { ErpCustomerAddress } from "~/composables/useErpCustomers";
import type { ErpProduct } from "~/composables/useErpProducts";
import { addDays } from "~/utils/dates";
import { BREAKDOWN_LABELS, BUDGET_THRESHOLD_PERCENT, calculateBasketBudget, type BasketTerm, type MarginBreakdown } from "~/utils/basketProfitability";
import { applyDiscountChain, summarize } from "~/utils/money";
import { priceForUnit } from "~/utils/orderUnits";

const props = defineProps<{
  orderType: number;
  detail?: ErpSalesOrderDetail | null;
  lookups: ErpSalesOrderLookups | null;
  saving?: boolean;
}>();

const emit = defineEmits<{ submit: [payload: ErpSalesOrderSavePayload] }>();

const NONE = "__none__";

interface EditorLine {
  id: string | null;
  productCode: string;
  productName: string;
  unitPntr: number;
  unitName: string;
  units: { pntr: number; name: string; factor: number }[];
  quantity: number;
  unitPrice: number;
  discount1: number;
  discount2: number;
  discount3: number;
  discount4: number;
  otherDiscounts: number[];
  taxPercent: number;
  depotNo: number;
  priceListNo: number | null;
  note1: string;
  barcode: string;
  stockType: "H" | "D" | null;
  sellableQuantity: number | null;
  /** Evrak tarihinde stoğa tanımlı geçerli insert adı; varsa satır renkli ve "İnsert" etiketli görünür. */
  insertName: string | null;
  insertValidTo: string | null;
  /** Bütçe hesabı için tedarikçi sözleşme oranları (sözleşmesiz stokta null). */
  budgetTerm: BasketTerm | null;
  /** Satır vadesi (gün); ödeme planından gelir, satırda elle değiştirilebilir. */
  /** Satır vadesi: gün YA DA nokta tarih. Ödeme planından gelir; İsk 2 varsa plana ek gün eklenerek tarih olur; plasiyer değiştirebilir. */
  dueKind: "days" | "date";
  dueDaysInput: number | null;
  dueDate: string;
  dueTouched: boolean;
}

const notifier = useNotifier();
const customersApi = useErpCustomers();
const productsApi = useErpProducts();
const salesApi = useErpSalesOrders();

const isEdit = computed(() => Boolean(props.detail?.header));

// ── Başlık ────────────────────────────────────────────────────────────────────────────
const series = ref("");
// Seri ve sıra ekranda gösterilmez: yeni evrakta ilk seri otomatik atanır, numara kayıtta verilir.
watch(() => props.lookups, (lookups) => {
  if (!series.value && lookups?.orderSeries.length) series.value = lookups.orderSeries[0]!;
}, { immediate: true });
const customerCode = ref("");
const customerTitle = ref("");
const addresses = ref<ErpCustomerAddress[]>([]);
const addressNo = ref<number | null>(null);
// Plasiyer elle seçilmez: siparişi oluşturan kullanıcının plasiyer kodu otomatik gelir.
const auth = useAuth();
const representativeCode = ref(auth.user.value.plasiyerKod || NONE);
const projectCode = ref(NONE);
// Ödeme planı ikisinden biridir: vade GÜNÜ ya da NOKTA TARİH (liste planı seçilmez).
const dueKind = ref<"days" | "date">("days");
const dueDaysInput = ref<number | null>(null);
const DUE_DAY_OPTIONS = [0, 30, 60, 90, 120, 150, 180, 210];
const dueDaysLabel = (days: number) => (days === 0 ? "Peşin" : `${days} gün`);
const dueDateInput = ref("");
const deliveryTypeCode = ref(NONE);
// "Kendisi Alacak" seçilince müşterinin mal alacağı depo da seçilir.
const SELF_PICKUP = "SELF_PICKUP";
const pickupDepotNo = ref<number | null>(null);
watch(deliveryTypeCode, (code) => { if (code !== SELF_PICKUP) pickupDepotNo.value = null; });

const deliveryDate = ref(addDays(3));
const collectionDate = ref(addDays(30));
const COLLECTION_TYPES = ["Çek", "Senet", "Havale", "Kredi Kartı"];
const collectionType = ref("");
const customerLocked = computed(() => props.detail?.lines.some((line) => line.approved) ?? false);
const note1 = ref("");

const lines = ref<EditorLine[]>([]);
const errorText = ref("");

// ── Cari arama ────────────────────────────────────────────────────────────────────────
const customerSearch = ref("");
interface CustomerResult {
  code: string;
  title: string;
  locked: boolean;
  cancelled: boolean;
  transactionType: number | null;
  transactionTypeName: string | null;
  balance: number | null;
  creditLimit: number | null;
  /** Ticari statü: A, B, AB gibi. */
  commercialStatus: string | null;
  forwarderCode?: string | null;
}
const customerResults = ref<CustomerResult[]>([]);

// Satışa uygun cari hareket tipleri (0 Müşteri, 2 Müşteri/Tedarikçi). Tipi bilinmeyen cari engellenmez.
// PROTOTİP VARSAYIMI: gerçek uygun tip listesi teyit bekliyor.
const SALES_TRANSACTION_TYPES = [0, 2];
const customerInfo = ref<Omit<CustomerResult, "code" | "title"> | null>(null);
const customerBlock = computed(() => {
  const info = customerInfo.value;
  if (!info) return null;
  if (info.locked) return "Cari kilitli — sipariş evrağına stok eklenemez.";
  if (info.transactionType !== null && !SALES_TRANSACTION_TYPES.includes(info.transactionType))
    return `Cari hareket tipi "${info.transactionTypeName ?? info.transactionType}" satış siparişi için uygun değil — stok eklenemez.`;
  return null;
});
// "Ambar" teslimde cari kartında kayıtlı ambar varsa otomatik gelir; yoksa elle seçilir. Cari değişince yeniden getirilir.
const WAREHOUSE = "WAREHOUSE";
const forwarderCode = ref("");
const forwarderFromCard = ref(false);
watch([deliveryTypeCode, () => customerInfo.value?.forwarderCode], ([type, registered]) => {
  if (type !== WAREHOUSE) { forwarderCode.value = ""; forwarderFromCard.value = false; return; }
  forwarderCode.value = registered ?? "";
  forwarderFromCard.value = !!registered;
});

// Açık limit = risk limiti − bakiye (eksiye düşerse limit aşılmıştır).
const openLimit = computed(() => {
  const info = customerInfo.value;
  return info && info.creditLimit !== null ? info.creditLimit - (info.balance ?? 0) : null;
});
const setCustomerInfo = (customer: Omit<CustomerResult, "code" | "title">, announce: boolean) => {
  customerInfo.value = {
    locked: customer.locked, cancelled: customer.cancelled,
    transactionType: customer.transactionType, transactionTypeName: customer.transactionTypeName,
    balance: customer.balance, creditLimit: customer.creditLimit, commercialStatus: customer.commercialStatus,
    forwarderCode: customer.forwarderCode ?? null,
  };
  if (announce && customerBlock.value) notifier.warning({ title: "Cari uygun değil", message: customerBlock.value });
};
const customerSearching = ref(false);

const searchCustomers = useDebounceFn(async () => {
  const term = customerSearch.value.trim();
  if (term.length < 2) { customerResults.value = []; return; }
  customerSearching.value = true;
  try {
    const result = await customersApi.list({ search: term, page: 1, pageSize: 10 });
    customerResults.value = result.items.map((c) => ({
      code: c.code, title: c.title ?? c.code, locked: c.locked, cancelled: c.cancelled,
      transactionType: c.transactionType, transactionTypeName: c.transactionTypeName,
      balance: c.balance, creditLimit: c.creditLimit, commercialStatus: c.commercialStatus,
      forwarderCode: c.forwarderCode ?? null,
    }));
  } catch {
    customerResults.value = [];
  } finally {
    customerSearching.value = false;
  }
}, 350);

const pickCustomer = async (item: CustomerResult) => {
  if (customerLocked.value) return;
  const { code, title } = item;
  addressNo.value = null;
  customerCode.value = code;
  customerTitle.value = title;
  setCustomerInfo(item, true); // uyarı cari seçildiği an verilir
  customerResults.value = [];
  customerSearch.value = "";
  await loadAddresses(code);
};

const loadAddresses = async (code: string) => {
  try {
    const detail = await customersApi.get(code);
    addresses.value = detail.addresses;
    // Legacy adres seçilmeden kaydettirmez; ilk adres öneri olarak gelir.
    if (addressNo.value === null && detail.addresses.length > 0)
      addressNo.value = detail.addresses[0]!.addressNo ?? 1;
    if (!customerTitle.value) customerTitle.value = detail.customer.title ?? code;
    setCustomerInfo(detail.customer, false);
  } catch {
    addresses.value = [];
  }
};

const addressLabel = (address: ErpCustomerAddress) =>
  [address.addressNo, [address.district, address.province].filter(Boolean).join(" / ")]
    .filter(Boolean).join(" — ");

// ── Stok arama ────────────────────────────────────────────────────────────────────────
const productSearch = ref("");
const productResults = ref<ErpProduct[]>([]);
const productSearching = ref(false);

const searchProducts = useDebounceFn(async () => {
  const term = productSearch.value.trim();
  if (term.length < 2) { productResults.value = []; return; }
  productSearching.value = true;
  try {
    const result = await productsApi.list({ search: term, page: 1, pageSize: 10 });
    productResults.value = result.items;
  } catch {
    productResults.value = [];
  } finally {
    productSearching.value = false;
  }
}, 350);

// ── Stok seçim penceresi: arama kutusunda Enter → eşleşen stoklar onay kutularıyla listelenir ───
const pickerOpen = ref(false);
const pickerLoading = ref(false);
const pickerItems = ref<ErpProduct[]>([]);
const pickerSelected = ref<string[]>([]);
const pickerAdding = ref(false);
// Arama kutusunda Enter: stok kodu / barkod / multi kod tam eşleşip tek stok bulunursa doğrudan satıra eklenir; aksi halde seçim penceresi açılır.
const openPicker = async () => {
  if (customerBlock.value) return;
  productResults.value = [];
  const term = productSearch.value.trim();
  pickerLoading.value = true;
  try {
    const result = await productsApi.list({ search: term, page: 1, pageSize: 50 });
    pickerItems.value = result.items;
  } catch {
    pickerItems.value = [];
  } finally {
    pickerLoading.value = false;
  }
  if (term && pickerItems.value.length === 0) {
    notifier.warning({ title: "Stok bulunamadı", message: `"${term}" ile eşleşen stok yok.` });
    return;
  }
  // Doğrudan ekleme yalnız yazılan değer bir stok kodu, barkod ya da multi kodla TAM eşleşip tek stok bulunursa olur;
  // ad aramasında tek sonuç bile olsa pencere açılır.
  const needle = term.toLocaleLowerCase("tr");
  const exact = pickerItems.value.filter((item) => [item.code, item.masterBarcode, item.multiCode].some((value) => value && value.toLocaleLowerCase("tr") === needle));
  if (term && exact.length === 1) {
    await addLine(exact[0]!);
    productSearch.value = "";
    return;
  }
  pickerSelected.value = [];
  pickerOpen.value = true;
};
const pickerAllSelected = computed(() => pickerItems.value.length > 0 && pickerSelected.value.length === pickerItems.value.length);
const togglePickerAll = (checked: boolean | "indeterminate") => {
  pickerSelected.value = checked === true ? pickerItems.value.map((item) => item.code) : [];
};
const togglePicker = (code: string, checked: boolean | "indeterminate") => {
  pickerSelected.value = checked === true ? [...new Set([...pickerSelected.value, code])] : pickerSelected.value.filter((item) => item !== code);
};
const addPicked = async () => {
  pickerAdding.value = true;
  try {
    for (const product of pickerItems.value.filter((item) => pickerSelected.value.includes(item.code))) await addLine(product);
    pickerOpen.value = false;
    productSearch.value = "";
  } finally {
    pickerAdding.value = false;
  }
};

const addLine = async (product: ErpProduct) => {
  if (customerBlock.value) { errorText.value = customerBlock.value; return; }
  productResults.value = [];
  productSearch.value = "";
  const info = await salesApi.productInfo(product.code, addDays(0)).catch(() => null);
  if (!info) { errorText.value = "Ürün satış bilgileri doğrulanamadı. Tekrar deneyin."; return; }
  if (info.passive || info.salesStopped) { errorText.value = "Pasif veya satışı durdurulmuş ürün siparişe eklenemez."; return; }
  lines.value.push({
    id: null,
    productCode: product.code,
    productName: product.name ?? product.code,
    unitPntr: info?.defaultUnitPntr ?? 1,
    unitName: info?.units[0]?.name ?? "",
    units: (info?.units ?? []).map((u) => ({ pntr: u.pntr, name: u.name, factor: u.factor })),
    quantity: 1,
    unitPrice: info?.listPrice ?? 0,
    discount1: info?.discount1 ?? 0,
    discount2: 0,
    discount3: 0,
    discount4: 0,
    otherDiscounts: [0, 0],
    taxPercent: info?.taxPercent ?? 0,
    depotNo: defaultDepot(),
    priceListNo: info?.priceListNo ?? 1,
    note1: "",
    barcode: product.masterBarcode ?? "",
    stockType: product.stockType ?? null,
    sellableQuantity: product.sellableQuantity ?? null,
    insertName: info.insertName ?? null,
    insertValidTo: info.insertValidTo ?? null,
    budgetTerm: info.budgetTerm ?? null,
    ...headerDue(),
    dueTouched: false,
  });
  refreshLineDue();
};

// Hazır stokta satırın temel birim karşılığı satılabilir miktarı aşıyor mu (Koli → adet katsayısıyla).
const sellableShort = (line: EditorLine) => {
  if (line.stockType !== "H" || line.sellableQuantity === null) return false;
  const factor = line.units.find((unit) => unit.pntr === line.unitPntr)?.factor ?? 1;
  return line.quantity * factor > line.sellableQuantity;
};
const removeLine = (index: number) => lines.value.splice(index, 1);

// Satır vadesi: üstte seçilen ödeme planı (gün ya da nokta tarih) her satıra otomatik gelir.
// İsk 2 yazılmışsa satır vadesi plana EK GÜN eklenerek nokta tarih olur: ek gün = İsk 2 ÷ 0,15 (günlük vade farkı %0,15).
// Plasiyer satırdaki vadeyi (gün/nokta tarih) elle değiştirebilir; değiştirilen satır otomatik güncellenmez.
const DISCOUNT2_DAILY_RATE = 0.15;
const dateAfter = (base: string, days: number) => addDays(days, new Date(`${base}T00:00:00`));
const daysUntil = (date: string) =>
  date ? Math.max(0, Math.round((new Date(`${date}T00:00:00`).getTime() - new Date(`${addDays(0)}T00:00:00`).getTime()) / 86_400_000)) : 0;
/** Üst ödeme planının vade tarihi (gün seçiliyse bugün + gün). */
const headerBaseDate = () => (dueKind.value === "date" && dueDateInput.value ? dueDateInput.value : addDays(dueDaysInput.value ?? 0));
const headerDue = () => ({
  dueKind: dueKind.value,
  dueDaysInput: dueDaysInput.value,
  dueDate: headerBaseDate(),
});
const discount2ExtraDays = (line: EditorLine) => (Number.isFinite(line.discount2) && line.discount2 > 0 ? Math.round(line.discount2 / DISCOUNT2_DAILY_RATE) : 0);
const refreshLineDue = () => {
  for (const line of lines.value) {
    if (line.dueTouched) continue;
    const extra = discount2ExtraDays(line);
    if (extra > 0) {
      line.dueKind = "date";
      line.dueDate = dateAfter(headerBaseDate(), extra);
    } else {
      Object.assign(line, headerDue());
    }
  }
};
const lineDueDays = (line: EditorLine) => (line.dueKind === "days" ? (line.dueDaysInput ?? 0) : daysUntil(line.dueDate));
const setLineDueKind = (line: EditorLine, kind: "days" | "date") => {
  line.dueKind = kind;
  line.dueTouched = true;
  if (kind === "date" && !line.dueDate) line.dueDate = headerBaseDate();
};
const planDays = computed(() => (dueKind.value === "days" ? (dueDaysInput.value ?? 0) : daysUntil(dueDateInput.value)));
watch([planDays, dueKind, dueDateInput], () => {
  collectionDate.value = dueKind.value === "date" && dueDateInput.value ? dueDateInput.value : addDays(planDays.value);
  refreshLineDue();
});
watch(() => lines.value.map((line) => line.discount2), refreshLineDue);

// ── Bütçe kutusu (sağ üst): sepet kârlılığı — Timon-B2B-Web `basketProfitability` mantığı ─────────
// %10 ve üstü yeşil "Bütçe", altı kırmızı "Zarar". Tıklayınca kalem kalem döküm açılır.
// [VARSAYIM] Nakliye yalnız "Timon Servis" teslimde Timon'a ait (dahil) sayılır.
const budgetFreightIncluded = computed(() => deliveryTypeCode.value === "TIMON_SERVICE");
const budget = computed(() =>
  calculateBasketBudget(
    lines.value.map((line) => ({
      stockCode: line.productCode,
      gross: line.quantity * line.unitPrice,
      net: lineNet(line),
      lineTermDays: lineDueDays(line),
      term: line.budgetTerm,
    })),
    budgetFreightIncluded.value,
  ),
);
const formatBudget = (value: number) => value.toFixed(1).replace(".", ",");
const formatBudgetPercent = (value: number) => `${value < 0 ? "−" : ""}%${formatBudget(Math.abs(value))}`;
const formatSigned = (value: number) => `${value >= 0 ? "+" : "−"}${formatBudget(Math.abs(value))}`;
const breakdownRows = computed(() =>
  budget.value.breakdown
    ? (Object.keys(BREAKDOWN_LABELS) as (keyof MarginBreakdown)[]).map((key) => ({ key, label: BREAKDOWN_LABELS[key], value: budget.value.breakdown![key] }))
    : [],
);

// Fiyat seçili birim başınadır: Adet → Koli geçişinde adet fiyatı kalırsa evrak 1/katsayı tutarla yazılırdı.
const changeUnit = (line: EditorLine, pntr: number) => {
  const factorOf = (p: number) => line.units.find((u) => u.pntr === p)?.factor ?? 1;
  line.unitPrice = priceForUnit(line.unitPrice, factorOf(line.unitPntr), factorOf(pntr));
  line.unitPntr = pntr;
};

function defaultDepot() {
  return props.lookups?.depots.find((d) => d.no === 1)?.no ?? props.lookups?.depots[0]?.no ?? 1;
}

// ── Toplamlar — legacy kaskadı (~/utils/money) ───────────────────────────────────────
const discountsOf = (line: EditorLine) =>
  [line.discount1, line.discount2, line.discount3, line.discount4, ...line.otherDiscounts];
const lineNet = (line: EditorLine) => applyDiscountChain(line.quantity * line.unitPrice, discountsOf(line));
const lineTax = (line: EditorLine) => (lineNet(line) * line.taxPercent) / 100;
// İskontolu birim fiyat: liste fiyatına iskonto kaskadı uygulanmış hâli (KDV hariç) ve KDV dahili.
const netUnitPrice = (line: EditorLine) => applyDiscountChain(line.unitPrice, discountsOf(line));
const netUnitPriceWithTax = (line: EditorLine) => (netUnitPrice(line) * (100 + line.taxPercent)) / 100;
const formatUnitPrice = (value: number) =>
  new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(value);

const totals = computed(() => {
  const summary = summarize(lines.value.map((l) => ({
    quantity: l.quantity, unitPrice: l.unitPrice, discounts: discountsOf(l), taxRatePercent: l.taxPercent,
  })));
  return { gross: summary.gross, discount: summary.discount, tax: summary.taxTotal, net: summary.total };
});

// ── Yükleme (düzenleme) ───────────────────────────────────────────────────────────────
watch(() => props.detail, async (detail) => {
  if (!detail?.header) return;
  const header = detail.header;
  series.value = header.orderSeries;
  customerCode.value = header.customerCode ?? "";
  customerTitle.value = header.customerTitle ?? "";
  addressNo.value = header.addressNo ?? null;
  representativeCode.value = header.representativeCode ?? NONE;
  projectCode.value = header.projectCode ?? NONE;
  deliveryTypeCode.value = header.deliveryTypeCode ?? NONE;
  deliveryDate.value = header.deliveryDate?.slice(0, 10) ?? addDays(3);
  collectionDate.value = header.collectionDate?.slice(0, 10) ?? addDays(30);
  collectionType.value = header.collectionType ?? "";
  note1.value = header.note1 ?? "";

  lines.value = detail.lines.map((line) => {
    const percents = discountPercentsOf(line);
    return {
      id: line.id,
      productCode: line.productCode ?? "",
      productName: line.productName ?? line.productCode ?? "",
      unitPntr: line.unitPntr ?? 1,
      unitName: line.unitName ?? "",
      units: [],
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discount1: percents[0] ?? 0,
      discount2: percents[1] ?? 0,
      discount3: percents[2] ?? 0,
      discount4: percents[3] ?? 0,
      otherDiscounts: percents.slice(4),
      taxPercent: line.taxPercent,
      depotNo: line.depotNo ?? defaultDepot(),
      priceListNo: line.priceListNo,
      note1: line.note1 ?? "",
      barcode: "",
      stockType: null,
      sellableQuantity: null,
      insertName: null,
      insertValidTo: null,
      budgetTerm: null,
      ...headerDue(),
      dueTouched: false,
    };
  });
  if (customerCode.value) await loadAddresses(customerCode.value);
}, { immediate: true });

// ── Kaydet ────────────────────────────────────────────────────────────────────────────
const submit = (asType?: number) => {
  errorText.value = "";
  if (!customerCode.value) { errorText.value = "Cari seçilmedi."; return; }
  if (deliveryTypeCode.value === SELF_PICKUP && pickupDepotNo.value === null) { errorText.value = "Kendisi alacak teslimde depo seçilmeli."; return; }
  if (customerBlock.value) { errorText.value = customerBlock.value; return; }
  if (!addressNo.value) { errorText.value = "Adres seçilmedi."; return; }
  if (!series.value.trim()) { errorText.value = "Evrak serisi seçilmedi."; return; }
  if (dueKind.value === "days" && (dueDaysInput.value === null || !Number.isFinite(dueDaysInput.value) || dueDaysInput.value < 0)) { errorText.value = "Vade günü seçilmeli."; return; }
  if (dueKind.value === "date" && !dueDateInput.value) { errorText.value = "Vade tarihi seçilmeli."; return; }
  if (lines.value.some((line) => (line.dueKind === "date" ? !line.dueDate : line.dueDaysInput === null))) { errorText.value = "Her satırın vadesi seçilmeli."; return; }
  if (lines.value.length === 0) { errorText.value = "En az bir satır ekleyin."; return; }
  if (lines.value.some((l) => !Number.isFinite(l.quantity) || l.quantity <= 0)) { errorText.value = "Miktarlar sıfırdan büyük olmalı."; return; }
  if (lines.value.some((line) => !Number.isFinite(line.unitPrice) || line.unitPrice < 0)) { errorText.value = "Birim fiyat negatif olamaz."; return; }
  if (lines.value.some((line) => [line.discount1, line.discount2, line.discount3, line.discount4, ...line.otherDiscounts].some((value) => !Number.isFinite(value) || value < 0 || value > 100))) { errorText.value = "İskontolar %0–100 arasında olmalı."; return; }

  emit("submit", {
    orderSeries: series.value.trim(),
    orderNumber: props.detail?.header?.orderNumber ?? null,
    orderType: asType ?? props.orderType,
    customerCode: customerCode.value,
    addressNo: addressNo.value,
    representativeCode: representativeCode.value === NONE ? null : representativeCode.value,
    projectCode: projectCode.value === NONE ? null : projectCode.value,
    paymentPlanNo: null,
    paymentDueKind: dueKind.value,
    paymentDueDays: dueKind.value === "days" ? dueDaysInput.value : null,
    paymentDueDate: dueKind.value === "date" ? dueDateInput.value : null,
    deliveryTypeCode: deliveryTypeCode.value === NONE ? null : deliveryTypeCode.value,
    pickupDepotNo: pickupDepotNo.value,
    forwarderCode: forwarderCode.value || null,
    deliveryDate: deliveryDate.value || null,
    collectionDate: collectionDate.value || null,
    collectionType: collectionType.value || null,
    notes: [note1.value],
    lines: lines.value.map((line) => ({
      id: line.id,
      productCode: line.productCode,
      unitPntr: line.unitPntr,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discountPercents: discountsOf(line),
      depotNo: line.depotNo,
      deliveryDate: deliveryDate.value || null,
      note1: line.note1 || null,
      priceListNo: line.priceListNo,
      dueDays: lineDueDays(line),
      dueKind: line.dueKind,
      dueDate: line.dueKind === "date" ? line.dueDate : null,
    })),
    version: props.detail?.lines[0]?.version ?? null,
  });
};
</script>

<template>
  <div class="space-y-4">
    <!-- Bütçe kutusu: sayfa başlığındaki sağ üst alana taşınır (new.vue → #header-budget). -->
    <Teleport v-if="budget.percent !== null" defer to="#header-budget">
      <Popover>
        <PopoverTrigger as-child>
          <button
            type="button" data-testid="budget-box" :data-status="budget.status"
            class="inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm font-semibold tabular-nums"
            :class="budget.status === 'budget' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-rose-300 bg-rose-50 text-rose-700'"
            title="Bütçe detayı için tıklayın"
          >
            <span class="text-[10px] uppercase tracking-wider">{{ budget.status === "budget" ? "Bütçe" : "Zarar" }}</span>
            <span>{{ formatBudgetPercent(budget.percent) }}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" class="w-[340px] p-0">
          <div class="flex items-center justify-between border-b border-tier-highest px-4 py-3">
            <span class="text-[13px] font-medium text-ink">Bütçe Detayı</span>
            <span class="font-mono text-[13px] font-semibold tabular-nums" :class="budget.status === 'budget' ? 'text-emerald-700' : 'text-rose-700'">{{ formatBudgetPercent(budget.percent) }}</span>
          </div>
          <ul class="space-y-1 px-4 py-3 text-[13px]" data-testid="budget-breakdown">
            <li v-for="row in breakdownRows" :key="row.key" class="flex justify-between" :class="row.value === 0 ? 'text-ink-muted' : ''">
              <span>{{ row.label }}</span>
              <span class="font-mono tabular-nums" :class="row.value < 0 ? 'text-rose-700' : row.value > 0 ? 'text-emerald-700' : ''">{{ row.value === 0 ? "0,0" : formatSigned(row.value) }}</span>
            </li>
            <li class="flex justify-between border-t border-tier-highest pt-1.5 font-medium">
              <span>Toplam</span><span class="font-mono tabular-nums">{{ formatBudgetPercent(budget.percent) }}</span>
            </li>
          </ul>
          <div v-if="budget.suppliers.length > 1" class="border-t border-tier-highest px-4 py-3 text-[12px]">
            <div class="mb-1 text-[11px] uppercase tracking-wide text-ink-muted">Tedarikçi bazında</div>
            <div v-for="supplier in budget.suppliers" :key="supplier.supplierCode" class="flex justify-between">
              <span class="truncate">{{ supplier.supplierName }}</span>
              <span class="font-mono tabular-nums" :class="supplier.percent >= BUDGET_THRESHOLD_PERCENT ? 'text-emerald-700' : 'text-rose-700'">{{ formatBudgetPercent(supplier.percent) }}</span>
            </div>
          </div>
          <div class="space-y-1 border-t border-tier-highest px-4 py-3 text-[12px] text-ink-muted">
            <p>Eşik %{{ BUDGET_THRESHOLD_PERCENT }}: altı kırmızı (Zarar), eşit ve üstü yeşil (Bütçe).</p>
            <p>Nakliye {{ budgetFreightIncluded ? "dahil (Timon Servis)" : "hariç (düşülmedi)" }}.</p>
            <p v-if="budget.unmatchedStockCodes.length">{{ budget.unmatchedStockCodes.length }} stok sözleşmesiz, hesaba girmedi: {{ budget.unmatchedStockCodes.join(", ") }}</p>
          </div>
        </PopoverContent>
      </Popover>
    </Teleport>

    <Alert v-if="errorText" variant="destructive">{{ errorText }}</Alert>

    <Card>
      <CardContent class="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="space-y-1.5 lg:col-span-3">
          <Label for="customer">Cari</Label>
          <div v-if="customerCode" class="flex items-center gap-2 rounded border border-tier-highest bg-tier px-2 py-1.5">
            <span class="font-mono text-[13px] tabular-nums">{{ customerCode }}</span>
            <span class="truncate text-[13px]">{{ customerTitle }}</span>
            <Button v-if="!isEdit" variant="ghost" size="sm" class="ml-auto" @click="customerCode = ''; customerInfo = null">
              <X class="size-4" />
            </Button>
          </div>
          <div v-else class="relative">
            <Input id="customer" v-model="customerSearch" placeholder="Kod veya unvan ile ara…" @input="searchCustomers" />
            <div v-if="customerResults.length" class="absolute z-20 mt-1 w-full rounded border border-tier-highest bg-paper shadow-sm">
              <button
                v-for="item in customerResults" :key="item.code" type="button"
                class="flex w-full items-center gap-2 px-2 py-1.5 text-left text-[13px] hover:bg-tier"
                @click="pickCustomer(item)"
              >
                <span class="font-mono tabular-nums">{{ item.code }}</span>
                <span class="truncate">{{ item.title }}</span>
              </button>
            </div>
            <p v-if="customerSearching" class="mt-1 text-[12px] text-ink-muted">Aranıyor…</p>
          </div>
          <div v-if="customerInfo" class="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="customer-risk">
            <div class="rounded border border-tier-highest px-2 py-1.5">
              <div class="text-[11px] uppercase tracking-wide text-ink-muted">Bakiye</div>
              <div class="font-mono text-[13px] tabular-nums">{{ customerInfo.balance === null ? "—" : formatMoney(customerInfo.balance) }}</div>
            </div>
            <div class="rounded border border-tier-highest px-2 py-1.5">
              <div class="text-[11px] uppercase tracking-wide text-ink-muted">Risk Limiti</div>
              <div class="font-mono text-[13px] tabular-nums">{{ customerInfo.creditLimit === null ? "—" : formatMoney(customerInfo.creditLimit) }}</div>
            </div>
            <div class="rounded border px-2 py-1.5" :class="openLimit !== null && openLimit < 0 ? 'border-rose-200 bg-rose-50' : 'border-tier-highest'">
              <div class="text-[11px] uppercase tracking-wide text-ink-muted">Açık Limit</div>
              <div class="font-mono text-[13px] tabular-nums" :class="openLimit !== null && openLimit < 0 ? 'text-rose-700' : ''">{{ openLimit === null ? "—" : formatMoney(openLimit) }}</div>
            </div>
            <div class="rounded border border-tier-highest px-2 py-1.5">
              <div class="text-[11px] uppercase tracking-wide text-ink-muted">Statü</div>
              <div class="font-mono text-[13px] font-medium">{{ customerInfo.commercialStatus || "—" }}</div>
            </div>
          </div>
          <Alert v-if="customerBlock" variant="destructive" class="mt-2">{{ customerBlock }}</Alert>
        </div>
        <div class="space-y-1.5">
          <Label for="project">Proje</Label>
          <Select v-model="projectCode">
            <SelectTrigger id="project"><SelectValue placeholder="Seçilmedi" /></SelectTrigger>
            <SelectContent>
              <SelectItem :value="NONE">Seçilmedi</SelectItem>
              <SelectItem v-for="item in lookups?.projects ?? []" :key="item.code" :value="item.code">
                {{ item.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="space-y-1.5 lg:col-span-2">
          <Label for="address">Adres</Label>
          <Select v-model="addressNo" :disabled="!addresses.length || customerLocked">
            <SelectTrigger id="address"><SelectValue placeholder="Adres seçin" /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="item in addresses" :key="item.id" :value="item.addressNo ?? 1">
                {{ addressLabel(item) }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="space-y-1.5 lg:col-span-2">
          <Label for="delivery-type">Teslim Türü</Label>
          <div class="flex gap-2">
            <Select v-model="deliveryTypeCode">
              <SelectTrigger id="delivery-type"><SelectValue placeholder="Seçilmedi" /></SelectTrigger>
              <SelectContent>
                <SelectItem :value="NONE">Seçilmedi</SelectItem>
                <SelectItem v-for="item in lookups?.deliveryTypes ?? []" :key="item.code" :value="item.code">
                  {{ item.name }}
                </SelectItem>
              </SelectContent>
            </Select>
            <CodeLookupField
              v-if="deliveryTypeCode === WAREHOUSE"
              id="forwarder"
              v-model="forwarderCode"
              :options="lookups?.forwarders ?? []"
              placeholder="Ambar seçin"
              search-placeholder="Ambar kodu veya adı ara..."
              @update:model-value="forwarderFromCard = false"
            />
            <Select
              v-if="deliveryTypeCode === SELF_PICKUP"
              :model-value="pickupDepotNo === null ? undefined : String(pickupDepotNo)"
              @update:model-value="pickupDepotNo = Number($event)"
            >
              <SelectTrigger id="pickup-depot" aria-label="Teslim alınacak depo"><SelectValue placeholder="Depo seçin" /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="depot in lookups?.depots ?? []" :key="depot.no" :value="String(depot.no)">{{ depot.name }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p v-if="deliveryTypeCode === WAREHOUSE && customerCode" class="text-[12px] text-ink-muted" data-testid="forwarder-hint">
            {{ forwarderFromCard ? "Cari kartındaki ambar getirildi." : forwarderCode ? "Ambar elle değiştirildi." : "Cari kartında kayıtlı ambar yok — seçin." }}
          </p>
        </div>
        <div class="grid gap-4 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-4">
            <div class="space-y-1.5">
              <Label for="collection-type">Tahsilat Tipi</Label>
              <Select v-model="collectionType">
                <SelectTrigger id="collection-type"><SelectValue placeholder="Tahsilat tipi seçin" /></SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="type in COLLECTION_TYPES" :key="type" :value="type">{{ type }}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-1.5">
              <Label for="payment-kind">Ödeme Planı</Label>
              <div class="flex gap-2">
                <Select v-model="dueKind">
                  <SelectTrigger id="payment-kind" class="w-28 shrink-0"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="days">Gün</SelectItem>
                    <SelectItem value="date">Nokta tarih</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  v-if="dueKind === 'days'"
                  :model-value="dueDaysInput === null ? undefined : String(dueDaysInput)"
                  @update:model-value="dueDaysInput = Number($event)"
                >
                  <SelectTrigger id="payment-days" aria-label="Vade günü"><SelectValue placeholder="Vade seçin" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="days in DUE_DAY_OPTIONS" :key="days" :value="String(days)">{{ dueDaysLabel(days) }}</SelectItem>
                  </SelectContent>
                </Select>
                <Input v-else id="payment-date" v-model="dueDateInput" aria-label="Vade tarihi" type="date" :min="addDays(0)" />
              </div>
            </div>
            <div class="space-y-1.5">
              <Label for="collection-date">Tahsilat Tarihi</Label>
              <Input id="collection-date" v-model="collectionDate" type="date" />
            </div>
            <div class="space-y-1.5">
              <Label for="delivery-date">Teslim Tarihi</Label>
              <Input id="delivery-date" v-model="deliveryDate" type="date" />
            </div>
        </div>
        <div class="space-y-1.5">
          <Label for="representative">Plasiyer</Label>
          <CodeLookupField
            id="representative"
            :model-value="representativeCode === NONE ? '' : representativeCode"
            :options="lookups?.representatives ?? []"
            placeholder="Seçilmedi"
            disabled
            search-placeholder="Plasiyer kodu veya adı ara..."
            @update:model-value="(v) => (representativeCode = v || NONE)"
          />
        </div>
        <p v-if="customerLocked" class="text-xs text-ink-muted">Onaylı satırı bulunan siparişte cari ve adres değiştirilemez.</p>
      </CardContent>
    </Card>

    <Card>
      <CardContent class="space-y-3 p-4">
        <div class="relative max-w-md">
          <Label for="product-search">Satır Ekle</Label>
          <div class="relative mt-1.5">
            <Search class="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
            <Input id="product-search" v-model="productSearch" class="pl-8" :disabled="!!customerBlock" @keydown.enter.prevent="openPicker" :placeholder="customerBlock ? 'Cari uygun değil — stok eklenemez' : 'Stok kodu, ad veya barkod…'" @input="searchProducts" />
          </div>
          <div v-if="productResults.length" class="absolute z-20 mt-1 w-full rounded border border-tier-highest bg-paper shadow-sm">
            <button
              v-for="item in productResults" :key="item.code" type="button"
              class="flex w-full items-center gap-2 px-2 py-1.5 text-left text-[13px] hover:bg-tier"
              @click="addLine(item)"
            >
              <Plus class="size-3.5 shrink-0" />
              <span class="font-mono tabular-nums">{{ item.code }}</span>
              <span class="truncate">{{ item.name }}</span>
              <span v-if="item.stockType" class="ml-auto shrink-0 text-[12px] text-ink-muted" data-testid="stock-type">
                <strong class="font-mono font-semibold" :class="item.stockType === 'H' ? 'text-emerald-700' : 'text-amber-700'">{{ item.stockType }}</strong>
                <template v-if="item.stockType === 'H'"> · Satılabilir: {{ formatQuantity(item.sellableQuantity ?? 0) }}</template>
              </span>
            </button>
          </div>
          <p v-if="productSearching" class="mt-1 text-[12px] text-ink-muted">Aranıyor…</p>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full min-w-[1900px] text-[13px]">
            <thead>
              <tr class="border-b border-tier-highest text-left text-[11px] uppercase tracking-wide text-ink-muted">
                <th class="py-2 pr-2 w-28">Stok Kodu</th>
                <th class="py-2 pr-2 w-36">Barkod</th>
                <th class="py-2 pr-2">Stok Adı</th>
                <th class="py-2 pr-2 w-24">Birim</th>
                <th class="py-2 pr-2 w-24 text-right">Miktar</th>
                <th class="py-2 pr-2 w-28 text-right">Liste Fiyatı</th>
                <th class="py-2 pr-2 w-20 text-right">İsk 1 %</th>
                <th class="py-2 pr-2 w-20 text-right">İsk 2 %</th>
                <th class="py-2 pr-2 w-20 text-right">İsk 3 %</th>
                <th class="py-2 pr-2 w-20 text-right">İsk 4 %</th>
                <th class="py-2 pr-2 w-16 text-right">KDV Oranı</th>
                <th class="py-2 pr-2 w-36 text-right">Birim Fiyat<div class="text-[10px] font-normal normal-case">KDV hariç / dahil</div></th>
                <th class="py-2 pr-2 w-[250px]">Vade</th>
                <th class="py-2 pr-2 w-36 text-right">Net Tutar<div class="text-[10px] font-normal normal-case">KDV hariç / dahil</div></th>
                <th class="py-2 w-10" />
              </tr>
            </thead>
            <tbody>
              <tr v-for="(line, index) in lines" :key="index" class="border-b border-tier" :class="line.insertName ? 'bg-amber-100/70' : ''" :data-insert="line.insertName ? 'true' : 'false'">
                <td class="py-1.5 pr-2 font-mono text-[12px] tabular-nums">{{ line.productCode }}</td>
                <td class="py-1.5 pr-2 font-mono text-[12px] tabular-nums text-ink-muted">{{ line.barcode || "—" }}</td>
                <td class="py-1.5 pr-2">
                  <div class="flex items-center gap-2">
                    <span
                      v-if="line.stockType" data-testid="line-stock-type" :title="line.stockType === 'H' ? 'Hazır stok' : 'Drop (yerinden)'"
                      class="inline-flex size-5 shrink-0 items-center justify-center rounded font-mono text-[11px] font-semibold"
                      :class="line.stockType === 'H' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'"
                    >{{ line.stockType }}</span>
                    <div class="max-w-[260px] truncate" :title="line.productName">{{ line.productName }}</div>
                    <span
                      v-if="line.insertName" data-testid="insert-badge"
                      :title="`${line.insertName}${line.insertValidTo ? ` · ${line.insertValidTo.split('-').reverse().join('.')} tarihine kadar` : ''}`"
                      class="shrink-0 rounded bg-amber-500 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white"
                    >İnsert</span>
                  </div>
                  <div v-if="line.stockType === 'H' && line.sellableQuantity !== null" class="text-[12px]" :class="sellableShort(line) ? 'text-rose-700' : 'text-ink-muted'">
                    Satılabilir: {{ formatQuantity(line.sellableQuantity) }}<span v-if="sellableShort(line)"> — miktar aşıyor</span>
                  </div>
                </td>
                <td class="py-1.5 pr-2">
                  <Select v-if="line.units.length > 1" :model-value="line.unitPntr" @update:model-value="changeUnit(line, Number($event))">
                    <SelectTrigger class="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem v-for="unit in line.units" :key="unit.pntr" :value="unit.pntr">{{ unit.name }} ({{ formatQuantity(unit.factor) }})</SelectItem>
                    </SelectContent>
                  </Select>
                  <span v-else class="text-ink-muted">{{ line.unitName || "—" }}</span>
                </td>
                <td class="py-1.5 pr-2"><Input v-model.number="line.quantity" type="number" min="1" step="1" inputmode="numeric" class="h-8 text-right" data-testid="line-quantity" /></td>
                <td class="py-1.5 pr-2"><Input :model-value="line.unitPrice" type="number" readonly tabindex="-1" aria-label="Liste fiyatı (değiştirilemez)" class="h-8 cursor-default bg-tier text-right" data-testid="list-price" /></td>
                <td class="py-1.5 pr-2"><Input :model-value="line.discount1" type="number" readonly tabindex="-1" aria-label="İskonto 1 (değiştirilemez)" class="h-8 cursor-default bg-tier text-right" data-testid="discount-1" /></td>
                <td class="py-1.5 pr-2"><Input v-model.number="line.discount2" type="number" step="0.01" class="h-8 text-right" /></td>
                <td class="py-1.5 pr-2"><Input v-model.number="line.discount3" type="number" step="0.01" class="h-8 text-right" /></td>
                <td class="py-1.5 pr-2"><Input :model-value="line.discount4" type="number" readonly tabindex="-1" aria-label="İskonto 4 (değiştirilemez)" class="h-8 cursor-default bg-tier text-right" data-testid="discount-4" /></td>
                <td class="py-1.5 pr-2 text-right font-mono tabular-nums">%{{ line.taxPercent }}</td>
                <td class="py-1.5 pr-2 text-right font-mono tabular-nums" data-col="unit-price">
                  <div>{{ formatUnitPrice(netUnitPrice(line)) }}</div>
                  <div class="text-ink-muted">{{ formatUnitPrice(netUnitPriceWithTax(line)) }}</div>
                </td>
                <td class="py-1.5 pr-2" data-col="line-due">
                  <div class="flex gap-1">
                    <Select :model-value="line.dueKind" @update:model-value="setLineDueKind(line, $event as 'days' | 'date')">
                      <SelectTrigger class="h-8 w-[84px] shrink-0" aria-label="Satır vade türü"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="days">Gün</SelectItem>
                        <SelectItem value="date">Tarih</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      v-if="line.dueKind === 'days'"
                      :model-value="line.dueDaysInput === null ? undefined : String(line.dueDaysInput)"
                      @update:model-value="line.dueDaysInput = Number($event); line.dueTouched = true"
                    >
                      <SelectTrigger class="h-8 w-[110px]" aria-label="Satır vade günü"><SelectValue placeholder="Vade" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem v-for="days in DUE_DAY_OPTIONS" :key="days" :value="String(days)">{{ dueDaysLabel(days) }}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input v-else v-model="line.dueDate" type="date" class="h-8 w-[140px]" aria-label="Satır vade tarihi" @input="line.dueTouched = true" />
                  </div>
                  <div v-if="discount2ExtraDays(line) > 0 && !line.dueTouched" class="mt-0.5 text-[11px] text-ink-muted">+{{ discount2ExtraDays(line) }} gün (İsk 2)</div>
                </td>
                <td class="py-1.5 pr-2 text-right font-mono tabular-nums" data-col="net-amount">
                  <div>{{ formatMoney(lineNet(line)) }}</div>
                  <div class="text-ink-muted">{{ formatMoney(lineNet(line) + lineTax(line)) }}</div>
                </td>
                <td class="py-1.5 text-right">
                  <Button variant="ghost" size="sm" @click="removeLine(index)"><Trash2 class="size-4" /></Button>
                </td>
              </tr>
              <tr v-if="!lines.length">
                <td colspan="15" class="py-6 text-center text-ink-400">Satır yok — yukarıdan stok arayıp ekleyin.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex flex-wrap justify-end gap-6 border-t border-tier-highest pt-3 text-[13px]">
          <div><span class="text-ink-muted">Ham Tutar:</span> <span class="font-mono tabular-nums">{{ formatMoney(totals.gross) }}</span></div>
          <div><span class="text-ink-muted">İskonto:</span> <span class="font-mono tabular-nums">{{ formatMoney(totals.discount) }}</span></div>
          <div><span class="text-ink-muted">KDV:</span> <span class="font-mono tabular-nums">{{ formatMoney(totals.tax) }}</span></div>
          <div class="font-medium"><span class="text-ink-muted">Genel Toplam:</span> <span class="font-mono tabular-nums">{{ formatMoney(totals.net) }}</span></div>
        </div>

        <div class="grid gap-4 border-t border-tier-highest pt-3">
          <div class="space-y-1.5">
            <Label for="note1">Evrak Açıklaması 1</Label>
            <Input id="note1" v-model="note1" />
          </div>
        </div>

        <div class="flex justify-end gap-2">
          <!-- Sipariş yerine teklif olarak kaydet (aynı gövde; legacy'de tek SIPARISLER satırı, farklı sip_tip). -->
          <Button v-if="orderType !== SALES_OFFER_TYPE" variant="secondary" :disabled="saving" data-testid="save-as-offer" @click="submit(SALES_OFFER_TYPE)">
            Teklif Kaydet
          </Button>
          <Button :disabled="saving" data-testid="save-order" @click="submit()">
            {{ saving ? "Kaydediliyor…" : "Kaydet" }}
          </Button>
        </div>
      </CardContent>
    </Card>

    <Dialog v-model:open="pickerOpen">
      <DialogContent class="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Stok Seç</DialogTitle>
          <DialogDescription>
            {{ productSearch.trim() ? `"${productSearch.trim()}" aramasına uyan stoklar` : "Tüm stoklar" }} — siparişe eklenecekleri işaretleyin.
          </DialogDescription>
        </DialogHeader>
        <div class="min-h-0 flex-1 overflow-auto rounded border border-tier-highest">
          <p v-if="pickerLoading" class="p-6 text-center text-[13px] text-ink-muted">Yükleniyor…</p>
          <p v-else-if="!pickerItems.length" class="p-6 text-center text-[13px] text-ink-muted">Eşleşen stok yok.</p>
          <table v-else class="w-full text-[13px]" data-testid="stock-picker">
            <thead class="sticky top-0 bg-tier">
              <tr class="border-b border-tier-highest text-left text-[11px] uppercase tracking-wide text-ink-muted">
                <th class="w-10 py-2 pl-3"><Checkbox :model-value="pickerAllSelected" aria-label="Tümünü seç" @update:model-value="togglePickerAll" /></th>
                <th class="py-2 pr-2">Stok Kodu</th>
                <th class="py-2 pr-2">Barkod</th>
                <th class="py-2 pr-2">Stok Adı</th>
                <th class="py-2 pr-2 text-center">Tip</th>
                <th class="py-2 pr-2 text-right">Satılabilir</th>
                <th class="py-2 pr-2 text-right">Liste Fiyatı</th>
                <th class="py-2 pr-2 text-right">İsk 1 %</th>
                <th class="py-2 pr-2 text-right">Birim Fiyat<div class="text-[10px] font-normal normal-case">KDV hariç</div></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in pickerItems" :key="item.code" class="cursor-pointer border-b border-tier hover:bg-tier" @click="togglePicker(item.code, !pickerSelected.includes(item.code))">
                <td class="py-1.5 pl-3" @click.stop>
                  <Checkbox :model-value="pickerSelected.includes(item.code)" :aria-label="`${item.code} seç`" @update:model-value="(checked) => togglePicker(item.code, checked)" />
                </td>
                <td class="py-1.5 pr-2 font-mono text-[12px] tabular-nums">{{ item.code }}</td>
                <td class="py-1.5 pr-2 font-mono text-[12px] tabular-nums text-ink-muted">{{ item.masterBarcode || "—" }}</td>
                <td class="py-1.5 pr-2">{{ item.name }}</td>
                <td class="py-1.5 pr-2 text-center">
                  <span
                    v-if="item.stockType"
                    class="inline-flex size-5 items-center justify-center rounded font-mono text-[11px] font-semibold"
                    :class="item.stockType === 'H' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'"
                  >{{ item.stockType }}</span>
                </td>
                <td class="py-1.5 pr-2 text-right font-mono tabular-nums" :class="item.stockType === 'H' && !item.sellableQuantity ? 'text-rose-700' : ''">
                  {{ item.stockType === "H" ? formatQuantity(item.sellableQuantity ?? 0) : "—" }}
                </td>
                <td class="py-1.5 pr-2 text-right font-mono tabular-nums">{{ item.listPrice != null ? formatMoney(item.listPrice) : "—" }}</td>
                <td class="py-1.5 pr-2 text-right font-mono tabular-nums">{{ item.listPrice != null ? formatMoney(item.discount1 ?? 0) : "—" }}</td>
                <td class="py-1.5 pr-2 text-right font-mono tabular-nums font-medium">{{ item.listPrice != null ? formatMoney(applyDiscountChain(item.listPrice, [item.discount1 ?? 0])) : "—" }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <DialogFooter class="items-center sm:justify-between">
          <span class="text-[13px] text-ink-muted">{{ pickerSelected.length }} stok seçildi</span>
          <div class="flex gap-2">
            <Button variant="secondary" @click="pickerOpen = false">Vazgeç</Button>
            <Button :disabled="!pickerSelected.length || pickerAdding" @click="addPicked">{{ pickerAdding ? "Ekleniyor…" : "Seçilenleri Ekle" }}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
