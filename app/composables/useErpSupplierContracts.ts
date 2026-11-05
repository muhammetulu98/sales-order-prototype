// Kesit 4 · Blok 1 — Tedarikçi Sözleşme Girişi (ekran 11) → /api/erp/supplier-contracts.
// Okuma vw_ErpSupplierContract'tan, yazma ayna tablolarına (D2/D3). Her çağrı
// useApi().request<T>() üzerinden — ham $fetch yok.
//
// Eski useErpPurchasing.ts'teki sözleşme istemcisi D6 gereği geçersizdi (var olmayan
// sözleşmeye göre yazılmıştı); bu dosya onun yerine geçer.

import type { SupplierContractTerms } from "~/utils/supplierContractTerms";
import { errorMessage, errorStatus } from "../utils/apiEnvelope";

// ── Tipler ────────────────────────────────────────────────────────────────────────────

export interface ErpSupplierBonusTier {
  legacyId: number | null;
  turnoverFrom: number | null;
  turnoverTo: number | null;
  rate: number | null;
  notes: string | null;
}

export interface ErpSupplierMarketingSupport {
  legacyId: number | null;
  turnoverFrom: number | null;
  turnoverTo: number | null;
  tierAmount: number | null;
  /** Kapalı liste: "Stok" | "Marka" (legacy DisableTextEditor'lı combo). */
  type: string | null;
  /** `;` ile ayrılmış kod listesi — legacy biçimi, bölünmeden taşınıyor. */
  codes: string | null;
  projectCode: string | null;
  startDate: string | null;
  endDate: string | null;
  /** "Pazarlama Destek Primi Türleri" enum'unun METNİ (ör. "Çeyrek Altın"). */
  kind: string | null;
  rateMultiplier: number | null;
  notes: string | null;
}

export interface ErpSupplierContractListItem {
  id: string;
  legacyId: number;
  supplierCode: string | null;
  supplierTitle: string | null;
  supplierName: string | null;
  representativeCode: string | null;
  representativeName: string | null;
  contractDate: string | null;
  paymentPlanNo: number | null;
  paymentPlanName: string | null;
  leadTimeDays: number | null;
  paymentBonusRate: number | null;
  freightIncluded: boolean;
  bonusTierCount: number;
  marketingSupportCount: number;
  createdAt: string | null;
  version: string | null;
  /**
   * Ticari şartlar (kapsam/iskonto, vade, nakliye, prim) — BEKLEYEN_API madde 18. Uç henüz
   * döndürmüyor: `undefined`/`null` iken listede "Şart girilmedi" gösterilir.
   */
  terms?: SupplierContractTerms | null;
}

/** Sözleşmesi olmayan tedarikçi (320'li cari, son 12 ayda alış cirosu > 0). */
export interface ErpUncontractedSupplier {
  code: string;
  title: string | null;
  representativeName: string | null;
  /** Son 12 ay alış cirosu, ₺. */
  turnover: number;
  invoiceCount: number;
  lastPurchaseDate: string | null;
}

export interface ErpSupplierContract extends Omit<ErpSupplierContractListItem, "bonusTierCount" | "marketingSupportCount"> {
  paymentBonusNotes: string | null;
  purchaseTerms: string | null;
  salesTerms: string | null;
  freightSupport: string | null;
  priceGuarantee: string | null;
  stockReturnTerms: string | null;
  storeActions: string | null;
  insertPractices: string | null;
  fairSupportPractices: string | null;
  specialAgreements: string | null;
  bonusTiers: ErpSupplierBonusTier[];
  marketingSupports: ErpSupplierMarketingSupport[];
}

/**
 * Kaydetme yükü. Zorunluluk seti legacy btnKaydet'in birebir taşınması: 9 koşul metni +
 * ödeme primi notu en az 3 karakter, ödeme planı ve termin 0 olamaz, tarih yılı ≥ 2000.
 * `temsilci`/`firmaAdi` gönderilmez — sunucu her kaydette cariden tazeler.
 */
export interface ErpSupplierContractPayload {
  supplierCode: string;
  contractDate: string;
  paymentPlanNo: number | null;
  leadTimeDays: number | null;
  paymentBonusRate: number | null;
  paymentBonusNotes: string | null;
  freightIncluded: boolean;
  purchaseTerms: string | null;
  salesTerms: string | null;
  freightSupport: string | null;
  priceGuarantee: string | null;
  stockReturnTerms: string | null;
  storeActions: string | null;
  insertPractices: string | null;
  fairSupportPractices: string | null;
  specialAgreements: string | null;
  bonusTiers: Omit<ErpSupplierBonusTier, "legacyId">[];
  marketingSupports: Omit<ErpSupplierMarketingSupport, "legacyId">[];
  version: string | null;
}

export interface ErpSupplierLookupItem {
  code: string;
  title: string | null;
  representativeCode: string | null;
}

export interface ErpPaymentPlan {
  no: number;
  name: string | null;
}

export interface ErpMarketingBonusType {
  code: number;
  name: string | null;
}

export interface ErpSupplierContractPage<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

/** Legacy _bxpazarlamastokmarka'nın kapalı listesi. */
export const MARKETING_SUPPORT_TYPES = ["Stok", "Marka"] as const;

// ── İş imzaları (şablon §5) ───────────────────────────────────────────────────────────
// 409 ayrımı hata metninden değil imzadan yapılır: imza kullanıcının ekranda gördüğü ve
// düzenleyebildiği alanlardan çıkar. version/id/temsilci imzaya GİRMEZ — temsilci her
// kaydette cariden tazelendiği için sahte fark üretirdi.

const dateOnly = (value: string | null) => (value ? value.slice(0, 10) : "");

const bonusTierKey = (tier: Omit<ErpSupplierBonusTier, "legacyId">) => [
  tier.turnoverFrom ?? 0,
  tier.turnoverTo ?? 0,
  tier.rate ?? 0,
  tier.notes ?? "",
];

const marketingSupportKey = (item: Omit<ErpSupplierMarketingSupport, "legacyId">) => [
  item.turnoverFrom ?? 0,
  item.turnoverTo ?? 0,
  item.tierAmount ?? 0,
  item.type ?? "",
  item.codes ?? "",
  item.projectCode ?? "",
  dateOnly(item.startDate),
  dateOnly(item.endDate),
  item.kind ?? "",
  item.rateMultiplier ?? 0,
  item.notes ?? "",
];

export const supplierContractFingerprint = (
  row: Pick<
    ErpSupplierContract,
    | "supplierCode" | "contractDate" | "paymentPlanNo" | "leadTimeDays"
    | "paymentBonusRate" | "paymentBonusNotes" | "freightIncluded"
    | "purchaseTerms" | "salesTerms" | "freightSupport" | "priceGuarantee"
    | "stockReturnTerms" | "storeActions" | "insertPractices"
    | "fairSupportPractices" | "specialAgreements" | "bonusTiers" | "marketingSupports"
  >,
) =>
  JSON.stringify([
    row.supplierCode ?? "",
    dateOnly(row.contractDate),
    row.paymentPlanNo ?? 0,
    row.leadTimeDays ?? 0,
    row.paymentBonusRate ?? 0,
    row.paymentBonusNotes ?? "",
    row.freightIncluded,
    row.purchaseTerms ?? "",
    row.salesTerms ?? "",
    row.freightSupport ?? "",
    row.priceGuarantee ?? "",
    row.stockReturnTerms ?? "",
    row.storeActions ?? "",
    row.insertPractices ?? "",
    row.fairSupportPractices ?? "",
    row.specialAgreements ?? "",
    // Sıra bilgisi taşımaz: sunucu ciroya göre sıralı döndürür, kullanıcı satırları
    // herhangi bir sırada girmiş olabilir — imza sıradan bağımsız.
    [...row.bonusTiers.map(bonusTierKey)].sort((a, b) =>
      JSON.stringify(a).localeCompare(JSON.stringify(b)),
    ),
    [...row.marketingSupports.map(marketingSupportKey)].sort((a, b) =>
      JSON.stringify(a).localeCompare(JSON.stringify(b)),
    ),
  ]);

// ── Çakışma modeli ────────────────────────────────────────────────────────────────────

/**
 * İki farklı 409 (şablon §5):
 * - `"version"` — kayıt siz açtıktan sonra değişmiş; sunucu hâli `server`'da, kullanıcının
 *   girdileri formda korunur.
 * - `"businessKey"` — (cari, sözleşme tarihi) ikilisi başka bir sözleşmede zaten var;
 *   kullanıcıdan anahtarı değiştirmesi istenir.
 */
export class ErpSupplierContractConflict extends Error {
  constructor(
    public readonly kind: "version" | "businessKey",
    message: string,
    public readonly server: ErpSupplierContract | null = null,
  ) {
    super(message);
    this.name = "ErpSupplierContractConflict";
  }
}



// ── İstemci ───────────────────────────────────────────────────────────────────────────

export const useErpSupplierContracts = () => {
  const api = useApi();
  const base = "/api/erp/supplier-contracts";
  const at = (id: string) => `${base}/${encodeURIComponent(id)}`;

  const list = (query: { search?: string; page?: number; pageSize?: number } = {}) =>
    api.request<ErpSupplierContractPage<ErpSupplierContractListItem>>(base, {
      query: Object.fromEntries(
        Object.entries(query).filter(([, value]) => value !== undefined && value !== ""),
      ),
    });

  const get = (id: string) => api.request<ErpSupplierContract>(at(id));

  const create = async (payload: ErpSupplierContractPayload) => {
    try {
      return await api.request<ErpSupplierContract>(base, {
        method: "POST",
        body: payload,
        silentError: true,
      });
    } catch (err) {
      // Yeni kayıtta sürüm yok — 409'un tek anlamı iş anahtarı çakışması.
      if (errorStatus(err) === 409)
        throw new ErpSupplierContractConflict(
          "businessKey",
          errorMessage(err, "Bu tedarikçi için aynı tarihli bir sözleşme zaten kayıtlı."),
        );
      throw err;
    }
  };

  /**
   * 409 aldığında kaydı taze okur ve üç durumu ayırır (şablon §5):
   * sürüm ilerlemiş ama iş alanları aynı → bir kez sessiz tekrar; iş alanları değişmiş →
   * `"version"` çakışması (girdiler korunur); sürüm hiç ilerlememiş → anahtar çakışması.
   */
  const update = async (
    id: string,
    payload: ErpSupplierContractPayload,
    baseline: ErpSupplierContract,
  ) => {
    const send = (version: string | null) =>
      api.request<ErpSupplierContract>(at(id), {
        method: "PUT",
        body: { ...payload, version },
        silentError: true,
      });

    try {
      return await send(payload.version);
    } catch (err) {
      if (errorStatus(err) !== 409) throw err;

      const server = await get(id).catch(() => null);
      const serverVersion = server?.version ?? null;

      if (server && serverVersion !== payload.version) {
        if (supplierContractFingerprint(server) === supplierContractFingerprint(baseline))
          return await send(serverVersion);

        throw new ErpSupplierContractConflict(
          "version",
          errorMessage(err, "Kayıt siz açtıktan sonra değiştirildi."),
          server,
        );
      }

      throw new ErpSupplierContractConflict(
        "businessKey",
        errorMessage(err, "Bu tedarikçi için aynı tarihli başka bir sözleşme zaten kayıtlı."),
        server,
      );
    }
  };

  /** Ticari şartlar ayrı kaydedilir (madde 18); legacy alanların kaydından sonra çağrılır. */
  const saveTerms = (id: string, terms: SupplierContractTerms, version: string | null) =>
    api.request<{ version: string | null }>(`${at(id)}/terms`, {
      method: "PUT",
      body: { terms, version },
      silentError: true,
    });

  const uncontractedSuppliers = () =>
    api.request<ErpUncontractedSupplier[]>(`${base}/uncontracted-suppliers`, { silentError: true });

  const remove = (id: string) =>
    api.request<void>(at(id), { method: "DELETE" });

  // ── Seçiciler ───────────────────────────────────────────────────────────────────────

  const searchSuppliers = (search: string) =>
    api.request<ErpSupplierLookupItem[]>(`${base}/supplier-lookup`, {
      query: { search },
    });

  const listPaymentPlans = () => api.request<ErpPaymentPlan[]>(`${base}/payment-plans`);

  const listMarketingBonusTypes = () =>
    api.request<ErpMarketingBonusType[]>(`${base}/marketing-bonus-types`);

  return {
    list,
    get,
    create,
    update,
    saveTerms,
    uncontractedSuppliers,
    remove,
    searchSuppliers,
    listPaymentPlans,
    listMarketingBonusTypes,
  };
};
