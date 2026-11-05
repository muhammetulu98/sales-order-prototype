// Fuar Sipariş Risk Onayı (eski adı Fuar Cari Onaylama; prototip fuar-siparis-risk-onayi).
// Onay tek kutu değil üç durumdur: Bekliyor / Onaylı / Reddedildi (red nedeni zorunlu).
// Sunucu `status` döndürene kadar (BEKLEYEN_API madde 24) legacy'nin kuralı okunur: red,
// açıklamaya "red ..." yazılarak tutuluyordu (FormFuarCariOnaylama satırı kırmızı boyardı).

export type FairApprovalStatus = "pending" | "approved" | "rejected";

export const FAIR_STATUS_LABELS: Record<FairApprovalStatus, string> = {
  pending: "Bekliyor",
  approved: "Onaylı",
  rejected: "Reddedildi",
};

export const FAIR_REJECT_REASONS = [
  "Limit yetersiz",
  "Eski borç kapanmamış",
  "Evrak eksik",
  "Çek / senet iade",
  "Temsilci teyit etmedi",
] as const;

/** Legacy red işareti: açıklama "red" kelimesiyle başlar ("Red: limit", "RED - borç"…). */
const LEGACY_REJECT = /^\s*red(?![a-zçğıöşü])[\s:.\-–]*/i;

export interface FairApprovalLike {
  approved: boolean;
  notes: string | null;
  status?: FairApprovalStatus | null;
  rejectReason?: string | null;
  creditLimit?: number | null;
  creditRisk?: number | null;
  turnover?: number | null;
}

export const isLegacyReject = (notes: string | null | undefined) => Boolean(notes && LEGACY_REJECT.test(notes));

export const approvalStatus = (row: FairApprovalLike): FairApprovalStatus =>
  row.status ?? (row.approved ? "approved" : isLegacyReject(row.notes) ? "rejected" : "pending");

export const rejectReasonOf = (row: FairApprovalLike): string | null => {
  if (approvalStatus(row) !== "rejected") return null;
  if (row.rejectReason) return row.rejectReason;
  const legacy = (row.notes ?? "").replace(LEGACY_REJECT, "").trim();
  return legacy || null;
};

/**
 * Karar ucu yokken (404) eski PUT ile yazılacak açıklama: red → "Red: neden" (legacy kuralı);
 * onay/bekleme → açıklama legacy red işaretiyse temizlenir, değilse aynen kalır.
 */
export const legacyDecisionNotes = (current: string | null, status: FairApprovalStatus, reason: string | null) => {
  if (status === "rejected") return `Red: ${(reason ?? "").trim()}`;
  return isLegacyReject(current) ? null : current;
};

/** Açık limit = kredi limiti − risk; ikisinden biri yoksa bilinmiyor. */
export const openLimitOf = (row: FairApprovalLike) =>
  row.creditLimit === null || row.creditLimit === undefined || row.creditRisk === null || row.creditRisk === undefined
    ? null
    : row.creditLimit - row.creditRisk;

export interface FairStatusSummary {
  count: number;
  turnover: number;
}

export const summarizeByStatus = (rows: readonly FairApprovalLike[]) => {
  const empty = (): FairStatusSummary => ({ count: 0, turnover: 0 });
  const result = { all: empty(), pending: empty(), approved: empty(), rejected: empty() };
  for (const row of rows) {
    const status = approvalStatus(row);
    for (const bucket of [result.all, result[status]]) {
      bucket.count += 1;
      bucket.turnover += row.turnover ?? 0;
    }
  }
  return result;
};
