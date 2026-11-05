import { formatMoney as money } from "./money";
import { dayDiff, lineDiscountRate, lineTotalInclVat, sumBy, type ApprovalLineMath } from "./orderApprovalCalc";

// Satış Sipariş Onaylama — onay önerisi kural motoru (prototip: siparis-onaylama/onayOneri.ts).
// KARAR VERMEZ, öneri üretir: her bulgu gerekçesiyle gelir, onayı kullanıcı verir ve sunucu
// onay anında kilit / limit / stand kontrollerini yeniden yapar. Saf fonksiyon — backend'e
// aynen taşınabilir. Dil modeli değildir. Stok miktarı bu ekranın konusu değil (planlamanın).

export const APPROVAL_RULES = {
  /** Toplam iskontosu bu oranı (%) aşan satır için üst onay önerilir. */
  highDiscountPercent: 30,
  /** Teslimine bu kadar gün (veya daha az) kalan sipariş öncelikli sayılır. */
  deliverySoonDays: 4,
  /** Limit doluluğu bu orandan (%) sonra uyarılır. */
  limitWarningPercent: 90,
} as const;

export type FindingLevel = "critical" | "warning" | "ok" | "info";
export interface Finding {
  level: FindingLevel;
  text: string;
}

export interface AdviceLine extends ApprovalLineMath {
  id: string;
  isStand: boolean;
}

export interface AdviceOrder {
  isB2B: boolean;
  deliveryDate: string | null;
  collectionType: string | null;
  creditLimit: number | null;
  creditRisk: number | null;
  customerLock: { reason: string; lockedAt: string | null } | null;
  /** Carinin kayıtlı sevk adresi sayısı (çoklu adres uyarısı). */
  shippingAddressCount: number;
}

export type AdviceDecision = "approve" | "partial" | "hold";

export interface OrderAdvice {
  decision: AdviceDecision;
  title: string;
  findings: Finding[];
  /** Şimdi onaylanabilecek satırlar (stand olmayan ve limite sırayla sığan). */
  eligibleLineIds: string[];
  /** Önerilmeyen satırlar ve kısa nedeni. */
  excludedLines: { id: string; reason: string }[];
}

const percent = (value: number, digits = 0) =>
  new Intl.NumberFormat("tr-TR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
const trDate = (iso: string) => iso.slice(0, 10).split("-").reverse().join(".");

export const STAND_REASON = "Stand satırı: önce parçalanmalı";
export const LIMIT_REASON = "Cari limitini aşıyor";

export const orderApprovalAdvice = (order: AdviceOrder, lines: readonly AdviceLine[], today: string): OrderAdvice => {
  const findings: Finding[] = [];
  const excluded = new Map<string, string>();
  const net = sumBy(lines, lineTotalInclVat);

  // 1) Cari kilidi her şeyi durdurur.
  if (order.customerLock) {
    const since = order.customerLock.lockedAt ? `, ${trDate(order.customerLock.lockedAt)} itibarıyla` : "";
    const lockReason = `Cari kilitli: ${order.customerLock.reason}`;
    findings.push({
      level: "critical",
      text: `Cari kilitli (${order.customerLock.reason}${since}). Kilit kalkmadan onay verilemez; finans/kredi ekibine yönlendirin.`,
    });
    for (const line of lines) if (!excluded.has(line.id)) excluded.set(line.id, lockReason);
  }

  // 2) Stand satırları parçalanmadan onaylanamaz.
  for (const line of lines) if (line.isStand) excluded.set(line.id, STAND_REASON);
  const standCount = lines.filter((line) => line.isStand).length;
  if (standCount) findings.push({ level: "warning", text: `${standCount} stand satırı var; parçalama yapılmadan onaylanamaz.` });

  // 3) Limit: sığan satırlar sırayla seçilir.
  const eligible: string[] = [];
  if (order.creditLimit !== null && order.creditLimit > 0) {
    const limit = order.creditLimit;
    const risk = order.creditRisk ?? 0;
    let running = risk;
    for (const line of lines) {
      if (excluded.has(line.id)) continue;
      const lineTotal = Math.max(0, lineTotalInclVat(line));
      if (running + lineTotal <= limit) {
        eligible.push(line.id);
        running += lineTotal;
      } else excluded.set(line.id, LIMIT_REASON);
    }
    const remaining = limit - risk - net;
    const usage = ((risk + net) / limit) * 100;
    if (remaining < 0) {
      const misfit = lines.filter((line) => excluded.get(line.id) === LIMIT_REASON).length;
      findings.push({
        level: "critical",
        text: `Limit ${money(-remaining)} aşılıyor (kullanım %${percent(usage)}). ${
          eligible.length
            ? `Kısmi onayla: ${eligible.length} satır limite sığıyor, ${misfit} satır sığmıyor.`
            : "Hiçbir satır limite sığmıyor."
        } Alternatif: limit artışı talep edin.`,
      });
    } else if (usage >= APPROVAL_RULES.limitWarningPercent) {
      findings.push({ level: "warning", text: `Limit %${percent(usage)} dolu; onaydan sonra yalnızca ${money(remaining)} kalır.` });
    } else if (!order.customerLock) {
      findings.push({ level: "ok", text: `Limit uygun (%${percent(usage)}, kalan ${money(remaining)}).` });
    }
  } else {
    // Limit tanımsız: limit engeli yok ama "uygun" da denmez — sunucu kontrolü belirleyici.
    for (const line of lines) if (!excluded.has(line.id)) eligible.push(line.id);
    findings.push({ level: "info", text: "Carinin kredi limiti tanımlı değil; limit kontrolü onayda sunucuda yapılır." });
  }

  // 4) İskonto ve teslim.
  const highDiscount = lines.filter((line) => lineDiscountRate(line) > APPROVAL_RULES.highDiscountPercent + 0.001);
  if (highDiscount.length) {
    findings.push({
      level: "warning",
      text: `${highDiscount.length} satırda toplam iskonto %${APPROVAL_RULES.highDiscountPercent} üzerinde (en yüksek %${percent(
        Math.max(...highDiscount.map(lineDiscountRate)),
        1,
      )}). Satış yöneticisi onayı önerilir.`,
    });
  }
  if (order.deliveryDate) {
    const days = dayDiff(order.deliveryDate, today);
    if (days <= APPROVAL_RULES.deliverySoonDays) {
      findings.push({ level: "warning", text: `Teslim ${days <= 0 ? "bugün veya geçti" : `${days} gün sonra`}: öncelikli onaylayın.` });
    }
  }

  // 5) B2B bağlamı ve sevk adresi.
  if (order.isB2B) {
    const card = (order.collectionType ?? "").toLocaleLowerCase("tr").includes("kart");
    findings.push({
      level: "info",
      text: card
        ? "B2B siparişi, tahsilat kredi kartı: ödeme portalda alınmış, onay hızlı verilebilir."
        : `B2B siparişi${order.collectionType ? ` (${order.collectionType})` : ""}: müşteri portaldan girdi, fiyat ve iskontolar portal listesinden geldi.`,
    });
  } else if (order.shippingAddressCount > 2) {
    findings.push({ level: "info", text: "Carinin birden fazla sevk adresi var; teslim adresini onaydan önce doğrulayın." });
  }

  const locked = Boolean(order.customerLock);
  const all = lines.length > 0 && eligible.length === lines.length;
  const decision: AdviceDecision = locked || !eligible.length ? "hold" : all ? "approve" : "partial";
  const title =
    decision === "approve"
      ? "Onaylanabilir"
      : decision === "partial"
        ? `Kısmi onay önerilir (${eligible.length}/${lines.length} satır)`
        : locked
          ? "Onay önerilmez: cari kilitli"
          : "Onay önerilmez";
  const rank: Record<FindingLevel, number> = { critical: 0, warning: 1, ok: 2, info: 3 };
  findings.sort((a, b) => rank[a.level] - rank[b.level]);
  return {
    decision,
    title,
    findings,
    eligibleLineIds: locked ? [] : eligible,
    excludedLines: [...excluded].map(([id, reason]) => ({ id, reason })),
  };
};
