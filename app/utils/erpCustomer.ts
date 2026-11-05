// Tam Cari Kart form çekirdeği — saf fonksiyonlar (vitest ile test edilir).
// Form durumu doğrudan yazma sözleşmesinin şeklidir: ara eşleme yok, yalnız
// kırpma/doğrulama. Sayısal kodlar Mikro'nun kendi değerleridir (backend
// CustomerWriteService.MapDoviz/MapHareketTipi/... ile birebir).

import type {
  ErpCustomerAddressPayload,
  ErpCustomerContactPayload,
  ErpCustomerCard,
  ErpCustomerWritePayload,
  ErpCustomerWriteRequest,
  ErpQuickCustomerPayload,
} from "~/composables/useErpCustomers";

export interface ErpCustomerFormState {
  customer: ErpCustomerWritePayload;
  addresses: ErpCustomerAddressPayload[];
  contacts: ErpCustomerContactPayload[];
}

export interface EnumOption {
  value: number;
  label: string;
}

/** Döviz cinsi — 0/1/2 (Mikro cari_doviz_cinsi). */
export const CURRENCY_OPTIONS: EnumOption[] = [
  { value: 0, label: "TL" },
  { value: 1, label: "USD" },
  { value: 2, label: "EUR" },
];

/** Hareket tipi — etiketler vw_ErpCustomer'daki CASE ile aynı. */
export const TRANSACTION_TYPE_OPTIONS: EnumOption[] = [
  { value: 0, label: "Normal" },
  { value: 1, label: "Sadece Alış" },
  { value: 2, label: "Sadece Satış" },
  { value: 3, label: "Sadece Nakit" },
  { value: 4, label: "Hareket Yok" },
];

export const CONNECTION_TYPE_OPTIONS: EnumOption[] = [
  { value: 0, label: "Yurt İçi" },
  { value: 1, label: "Yurt Dışı" },
];

export const PAYMENT_TYPE_OPTIONS: EnumOption[] = [
  { value: 0, label: "Nakit" },
  { value: 1, label: "Havale" },
  { value: 2, label: "Kredi Kartı" },
  { value: 3, label: "Çek" },
  { value: 4, label: "Senet" },
];

export const PAYMENT_METHOD_OPTIONS: EnumOption[] = [
  { value: 0, label: "Peşin" },
  { value: 1, label: "Vadeli" },
  { value: 2, label: "Taksitli" },
];

/** e-Fatura senaryosu — Mikro cari_def_efatura_cinsi. */
export const EINVOICE_TYPE_OPTIONS: EnumOption[] = [
  { value: 0, label: "Temel Fatura" },
  { value: 1, label: "Ticari Fatura" },
];

// Hızlı kartın sunucu tarafındaki sabitleri; detaylı modda kullanıcıya AÇILIŞ
// değeri olarak verilir (kullanıcı değiştirebilir).
export const DEFAULT_REPRESENTATIVE_CODE = "MAGAZA";
export const DEFAULT_DISCOUNT_CODE = "T1";
export const DEFAULT_ACCOUNTING_CODE = "120.01.01.001";
export const DEFAULT_TITLE_PREFIX = "Sn.";
export const DEFAULT_COUNTRY = "TÜRKİYE";

export const createEmptyAddress = (addressNo: number): ErpCustomerAddressPayload => ({
  addressNo,
  addressGuid: null,
  title: addressNo === 1 ? "MERKEZ" : "",
  province: "",
  district: "",
  quarter: "",
  neighborhood: "",
  street: "",
  road: "",
  postalCode: "",
  country: DEFAULT_COUNTRY,
  phone1: "",
  phone2: "",
  representativeCode: "",
  eInvoiceAlias: "",
  eDispatchAlias: "",
});

export const createEmptyContact = (): ErpCustomerContactPayload => ({
  contactGuid: null,
  firstName: "",
  lastName: "",
  email: "",
  mobilePhone: "",
  workPhone: "",
  addressNo: 1,
  isReconciliationOfficer: false,
  kepAddress: "",
  website: "",
});

export const createEmptyCustomerForm = (): ErpCustomerFormState => ({
  customer: {
    title: "",
    titlePrefix: DEFAULT_TITLE_PREFIX,
    isIndividual: false,
    taxNumber: "",
    taxOfficeCode: "",
    taxOfficeName: "",
    parentCustomerCode: "",
    representativeCode: DEFAULT_REPRESENTATIVE_CODE,
    regionCode: "",
    groupCode: "",
    sectorCode: "",
    currencyType: 0,
    transactionType: 0,
    connectionType: 0,
    accountingCode: DEFAULT_ACCOUNTING_CODE,
    salesDiscountCode: DEFAULT_DISCOUNT_CODE,
    salesPriceListNo: 1,
    paymentPlanNo: null,
    paymentType: null,
    paymentMethod: null,
    dueDifferencePercent: null,
    creditLimit: 0,
    creditRiskTracking: false,
    purchaseStockType: null,
    salesStockType: null,
    locked: false,
    email: "",
    reconciliationEmail: "",
    mobilePhone: "",
    phone: "",
    kepAddress: "",
    website: "",
    emailConsent: false,
    eInvoiceRegistered: false,
    eInvoiceStartDate: null,
    eInvoiceDefaultType: 1,
    eDispatchRegistered: false,
    eDispatchStartDate: null,
    eDispatchDefaultType: 0,
    invoiceAddressNo: 1,
    shipmentAddressNo: 1,
  },
  addresses: [createEmptyAddress(1)],
  contacts: [createEmptyContact()],
});

const text = (value: string | null | undefined) => (value ?? "").trim();

/** Düzenleme formunun açılış durumu — okunan view satırlarından. */
export const customerFormFromDetail = (detail: ErpCustomerCard): ErpCustomerFormState => {
  const c = detail.customer;
  const empty = createEmptyCustomerForm();
  return {
    customer: {
      ...empty.customer,
      title: c.title ?? "",
      titlePrefix: c.titlePrefix ?? DEFAULT_TITLE_PREFIX,
      // Şahıs firması ayrımı vergi no uzunluğundan okunur (aynada ayrı bayrak yok).
      isIndividual: (c.taxNumber ?? "").trim().length === 11,
      taxNumber: c.taxNumber ?? "",
      taxOfficeCode: c.taxOfficeCode ?? "",
      taxOfficeName: c.taxOfficeName ?? "",
      parentCustomerCode: c.parentCustomerCode ?? "",
      representativeCode: c.representativeCode ?? "",
      regionCode: c.regionCode ?? "",
      groupCode: c.groupCode ?? "",
      sectorCode: c.sectorCode ?? "",
      currencyType: c.currencyType ?? 0,
      transactionType: c.transactionType ?? 0,
      connectionType: c.connectionType ?? 0,
      accountingCode: c.accountingCode ?? "",
      salesDiscountCode: c.salesDiscountCode ?? "",
      salesPriceListNo: c.salesPriceListNo ?? 1,
      paymentPlanNo: c.paymentPlanNo ?? null,
      paymentType: c.paymentType ?? null,
      paymentMethod: c.paymentMethod ?? null,
      dueDifferencePercent: c.dueDifferencePercent ?? null,
      creditLimit: c.creditLimit ?? 0,
      creditRiskTracking: c.creditRiskTracking,
      locked: c.locked,
      email: c.email ?? "",
      reconciliationEmail: c.reconciliationEmail ?? "",
      mobilePhone: c.mobilePhone ?? "",
      phone: detail.addresses[0]?.phone1 ?? "",
      kepAddress: c.kepAddress ?? "",
      website: c.website ?? "",
      emailConsent: c.emailConsent,
      eInvoiceRegistered: c.eInvoiceRegistered,
      eInvoiceStartDate: c.eInvoiceStartDate ? c.eInvoiceStartDate.slice(0, 10) : null,
      eInvoiceDefaultType: c.eInvoiceDefaultType ?? 1,
      eDispatchRegistered: c.eDispatchRegistered,
      eDispatchStartDate: c.eDispatchStartDate ? c.eDispatchStartDate.slice(0, 10) : null,
      eDispatchDefaultType: c.eDispatchDefaultType ?? 0,
      invoiceAddressNo: c.invoiceAddressNo ?? 1,
      shipmentAddressNo: c.shipmentAddressNo ?? 1,
    },
    addresses: detail.addresses.length
      ? detail.addresses.map((a, index) => ({
          addressNo: a.addressNo ?? index + 1,
          addressGuid: a.addressGuid,
          title: a.title ?? "",
          province: a.province ?? "",
          district: a.district ?? "",
          quarter: a.quarter ?? "",
          neighborhood: a.neighborhood ?? "",
          street: a.street ?? "",
          road: a.road ?? "",
          postalCode: a.postalCode ?? "",
          country: a.country ?? DEFAULT_COUNTRY,
          phone1: a.phone1 ?? "",
          phone2: a.phone2 ?? "",
          representativeCode: a.representativeCode ?? "",
          eInvoiceAlias: a.eInvoiceAlias ?? "",
          eDispatchAlias: a.eDispatchAlias ?? "",
        }))
      : [createEmptyAddress(1)],
    contacts: detail.contacts.length
      ? detail.contacts.map((m) => ({
          contactGuid: m.contactGuid,
          firstName: m.firstName ?? "",
          lastName: m.lastName ?? "",
          email: m.email ?? "",
          mobilePhone: m.mobilePhone ?? "",
          workPhone: m.workPhone ?? "",
          addressNo: m.addressNo ?? 1,
          isReconciliationOfficer: m.isReconciliationOfficer,
          kepAddress: m.kepAddress ?? "",
          website: m.website ?? "",
        }))
      : [createEmptyContact()],
  };
};

const nullIfEmpty = (value: string | null | undefined) => {
  const trimmed = text(value);
  return trimmed.length ? trimmed : null;
};

/** Detaylı yazma isteği — boş metinler null'a çevrilir (ayna "" bekler, servis dönüştürür). */
export const toWriteRequest = (
  state: ErpCustomerFormState,
  acknowledgeDuplicateTaxNumber = false,
): ErpCustomerWriteRequest => ({
  customer: {
    ...state.customer,
    title: text(state.customer.title),
    titlePrefix: nullIfEmpty(state.customer.titlePrefix),
    taxNumber: text(state.customer.taxNumber),
    taxOfficeCode: nullIfEmpty(state.customer.taxOfficeCode),
    taxOfficeName: nullIfEmpty(state.customer.taxOfficeName),
    parentCustomerCode: nullIfEmpty(state.customer.parentCustomerCode),
    accountingCode: nullIfEmpty(state.customer.accountingCode),
    salesDiscountCode: nullIfEmpty(state.customer.salesDiscountCode),
    email: text(state.customer.email),
    reconciliationEmail: nullIfEmpty(state.customer.reconciliationEmail),
    mobilePhone: text(state.customer.mobilePhone),
    phone: nullIfEmpty(state.customer.phone),
    kepAddress: nullIfEmpty(state.customer.kepAddress),
    website: nullIfEmpty(state.customer.website),
    // Kayıtlı değilse tarih gönderme (ayna sıfır tarihe çeker).
    eInvoiceStartDate: state.customer.eInvoiceRegistered
      ? nullIfEmpty(state.customer.eInvoiceStartDate)
      : null,
    eDispatchStartDate: state.customer.eDispatchRegistered
      ? nullIfEmpty(state.customer.eDispatchStartDate)
      : null,
  },
  addresses: state.addresses.map((a) => ({
    ...a,
    title: nullIfEmpty(a.title),
    province: text(a.province),
    district: text(a.district),
    quarter: nullIfEmpty(a.quarter),
    neighborhood: nullIfEmpty(a.neighborhood),
    street: nullIfEmpty(a.street),
    road: nullIfEmpty(a.road),
    postalCode: nullIfEmpty(a.postalCode),
    country: nullIfEmpty(a.country) ?? DEFAULT_COUNTRY,
    phone1: nullIfEmpty(a.phone1),
    phone2: nullIfEmpty(a.phone2),
    representativeCode: nullIfEmpty(a.representativeCode),
    eInvoiceAlias: nullIfEmpty(a.eInvoiceAlias),
    eDispatchAlias: nullIfEmpty(a.eDispatchAlias),
  })),
  contacts: state.contacts.map((m) => ({
    ...m,
    firstName: text(m.firstName),
    lastName: text(m.lastName),
    email: nullIfEmpty(m.email),
    mobilePhone: nullIfEmpty(m.mobilePhone),
    workPhone: nullIfEmpty(m.workPhone),
    kepAddress: nullIfEmpty(m.kepAddress),
    website: nullIfEmpty(m.website),
  })),
  acknowledgeDuplicateTaxNumber,
});

/** Hızlı mod aynı form durumundan legacy uca gider (tek adres, sabitler sunucuda). */
export const toQuickPayload = (
  state: ErpCustomerFormState,
  acknowledgeDuplicateTaxNumber = false,
): ErpQuickCustomerPayload => {
  const address = state.addresses[0] ?? createEmptyAddress(1);
  return {
    title: text(state.customer.title),
    isIndividual: state.customer.isIndividual,
    taxNumber: text(state.customer.taxNumber),
    taxOfficeCode: nullIfEmpty(state.customer.taxOfficeCode),
    taxOfficeName: nullIfEmpty(state.customer.taxOfficeName),
    mobilePhone: text(state.customer.mobilePhone),
    email: text(state.customer.email),
    province: text(address.province),
    district: text(address.district),
    quarter: text(address.quarter),
    neighborhood: text(address.neighborhood),
    postalCode: text(address.postalCode),
    street: nullIfEmpty(address.street),
    road: nullIfEmpty(address.road),
    regionCode: text(state.customer.regionCode),
    groupCode: text(state.customer.groupCode),
    sectorCode: text(state.customer.sectorCode),
    acknowledgeDuplicateTaxNumber,
  };
};

/**
 * Eksik/hatalı alanların Türkçe listesi — sunucudaki kurallarla aynı, kullanıcıya
 * kaydetmeden önce gösterilir. Sunucu yine de doğrular (istemci güvenlik sınırı değil).
 */
/** Formun parçaları — detay sayfasındaki kalemler yalnız ilgili parçayı modalda açar. */
export type CustomerFormPart =
  | "identity" | "contact" | "classification" | "representative" | "transaction"
  | "trade" | "credit" | "edocument" | "addresses" | "contacts";

/** Cari detay kartlarının bölümleri (kalem → modal). */
export type CustomerSection = "card" | "contact" | "contacts" | "trade";

export const CUSTOMER_SECTION_PARTS: Record<CustomerSection, readonly CustomerFormPart[]> = {
  card: ["identity", "classification", "transaction"],
  contact: ["contact", "representative"],
  contacts: ["contacts"],
  trade: ["trade"],
};

export const CUSTOMER_SECTION_TITLES: Record<CustomerSection, string> = {
  card: "Kart Bilgileri",
  contact: "İletişim & Temsilci",
  contacts: "Yetkililer",
  trade: "Ticari Koşullar",
};

export const validateCustomerForm = (
  state: ErpCustomerFormState,
  variant: "quick" | "detailed",
): string[] => {
  const errors: string[] = [];
  const c = state.customer;

  if (!text(c.title)) errors.push("Unvan");

  const taxNumber = text(c.taxNumber);
  const expectedLength = c.isIndividual ? 11 : 10;
  if (taxNumber.length !== expectedLength || !/^\d+$/.test(taxNumber)) {
    errors.push(c.isIndividual ? "TC Kimlik No (11 hane)" : "Vergi No (10 hane)");
  }

  if (text(c.mobilePhone).length !== 10) errors.push("Cep telefonu (10 hane)");
  if (!text(c.email).includes("@")) errors.push("E-posta");
  if (!text(c.regionCode)) errors.push("Bölge");
  if (!text(c.groupCode)) errors.push("Grup");
  if (!text(c.sectorCode)) errors.push("Sektör");

  const first = state.addresses[0];
  if (!first || !text(first.province)) errors.push("İl");
  if (!first || !text(first.district)) errors.push("İlçe");

  if (variant === "quick") {
    // Legacy hızlı kart semt/mahalle/posta kodunu da zorunlu tutar.
    if (!text(first?.quarter)) errors.push("Semt");
    if (!text(first?.neighborhood)) errors.push("Mahalle");
    if (!text(first?.postalCode)) errors.push("Posta kodu");
    return errors;
  }

  if (!text(c.representativeCode)) errors.push("Temsilci");
  if (c.creditLimit < 0) errors.push("Kredi limiti");

  const numbers = new Set<number>();
  state.addresses.forEach((address, index) => {
    if (!text(address.province) || !text(address.district)) {
      errors.push(`${index + 1}. adres: il/ilçe`);
    }
    if (numbers.has(address.addressNo)) errors.push(`Tekrarlanan adres no: ${address.addressNo}`);
    numbers.add(address.addressNo);
  });
  if (c.invoiceAddressNo !== null && !numbers.has(c.invoiceAddressNo)) errors.push("Fatura adresi");
  if (c.shipmentAddressNo !== null && !numbers.has(c.shipmentAddressNo)) errors.push("Sevk adresi");

  if (!state.contacts.length) errors.push("Yetkili");
  state.contacts.forEach((contact, index) => {
    if (!text(contact.firstName) || !text(contact.lastName)) {
      errors.push(`${index + 1}. yetkili: ad/soyad`);
    }
  });

  return errors;
};

/** Yeni adres numarası: mevcut en büyüğün bir fazlası (1'den başlar). */
export const nextAddressNo = (addresses: ErpCustomerAddressPayload[]): number =>
  addresses.reduce((max, address) => Math.max(max, address.addressNo), 0) + 1;
