// Sipariş Planlama — plan önerisi, satır uyarıları ve sipariş önceliği (prototip:
// siparis-planlama/planOneri.ts + PLAN-ONERISI.md). KARAR VERMEZ, öneri üretir: öneri yalnız
// depoyu doldurur ve satırı seçer, planlamayı kullanıcı yapar. Saf fonksiyonlar — backend'e aynen
// taşınabilir. Eşikler iş birimiyle netleştirilecek (BEKLEYEN_API madde 17).

export const PLANNING_RULES = {
  /** Onaylanalı bu kadar günden fazla bekleyen sipariş "eski bekleyen" sayılır. */
  staleApprovalDays: 7,
  /** Termine bu kadar gün (veya daha az) kalan satır "termin yakın" sayılır. */
  terminSoonDays: 3,
  /** Fiziksel depolar tercih sırasıyla (depo no). Prototip: İkitelli 3, Plaza 83 — teyit edilecek. */
  depotPreference: [3, 83] as number[],
  score: { cash: 3, staleApproval: 3, terminPassed: 3, terminSoon: 2, green: 1 },
  highThreshold: 4,
  mediumThreshold: 2,
} as const;

export interface PlanningStockDepot {
  depotNo: number;
  depotName: string;
  quantity: number;
  /** Planlanmış (henüz sevk edilmemiş) miktar; bilinmiyorsa 0 kabul edilir. */
  planned: number;
}

export interface PlanningStock {
  productCode: string;
  units: { name: string; factor: number }[];
  depots: PlanningStockDepot[];
  /** Gelecek satınalma (tedarik) siparişi toplamı, ana birimde. */
  incomingQuantity: number;
  /** En yakın satınalma teslim tarihi ("YYYY-MM-DD"); bilinmiyorsa null. */
  incomingDate: string | null;
  /** Bu stok için planlanmamış bekleyen sipariş toplamı (stok yarışı). */
  unplannedDemand: number;
}

export interface PlanningLine {
  id: string;
  quantity: number;
  unitName: string | null;
  depotNo: number | null;
  terminDate: string | null;
  isCash: boolean;
  isGreen: boolean;
}

export type AdviceKind = "depot" | "split" | "wait" | "supplier";
export type AdviceLevel = "ok" | "warning" | "critical";
export type WarningCode =
  | "terminPassed"
  | "terminRisk"
  | "purchaseLate"
  | "cashShortage"
  | "terminSoon"
  | "stockRace"
  | "cash"
  | "green";

export interface LineWarning {
  code: WarningCode;
  /** Tablodaki kısa çip metni. */
  label: string;
  /** Ayrıntı (üzerine gelince). */
  text: string;
  level: "critical" | "warning" | "info";
}

export interface LineAdvice {
  lineId: string;
  kind: AdviceKind;
  depotNo: number | null;
  label: string;
  reason: string;
  level: AdviceLevel;
  /** Ana birimde eksik miktar (yetersiz durumlarda). */
  shortage: number;
  /** split ise ilk depoda kalacak miktar (satırın biriminde). */
  splitKeep: number | null;
  warnings: LineWarning[];
}

export interface OrderPriority {
  score: number;
  level: "Yüksek" | "Orta" | "Normal";
  reasons: string[];
}

const count = (value: number) => new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(value);
const trDate = (iso: string) => iso.slice(0, 10).split("-").reverse().join(".");
const dayDiff = (a: string, b: string) =>
  Math.round((new Date(a.slice(0, 10)).getTime() - new Date(b.slice(0, 10)).getTime()) / 86_400_000);

export const unitFactor = (stock: PlanningStock, unitName: string | null) =>
  stock.units.find((unit) => unit.name.toLocaleUpperCase("tr") === (unitName ?? "").toLocaleUpperCase("tr"))?.factor ?? 1;

export const depotFree = (stock: PlanningStock, depotNo: number) => {
  const depot = stock.depots.find((item) => item.depotNo === depotNo);
  return depot ? Math.max(0, depot.quantity - depot.planned) : 0;
};

/** Tercih edilen depolar (ayar) + stokta görünen diğer depolar. */
const candidateDepots = (stock: PlanningStock) => {
  const preferred = PLANNING_RULES.depotPreference.filter((no) => stock.depots.some((depot) => depot.depotNo === no));
  const others = stock.depots.map((depot) => depot.depotNo).filter((no) => !preferred.includes(no));
  return [...preferred, ...others];
};

const depotName = (stock: PlanningStock, depotNo: number) =>
  stock.depots.find((depot) => depot.depotNo === depotNo)?.depotName ?? `Depo ${depotNo}`;

const totalFree = (stock: PlanningStock) => candidateDepots(stock).reduce((sum, no) => sum + depotFree(stock, no), 0);

/** Satır uyarıları: tek başına anlamsız bilgi uyarı olmaz; sorun başka durumla birleşince uyarıdır. */
export const lineWarnings = (line: PlanningLine, stock: PlanningStock, today: string): LineWarning[] => {
  const warnings: LineWarning[] = [];
  const required = line.quantity * unitFactor(stock, line.unitName);
  const free = totalFree(stock);
  const shortage = Math.max(0, required - free);

  if (line.terminDate) {
    const days = dayDiff(line.terminDate, today);
    const soon = days <= PLANNING_RULES.terminSoonDays;
    const when = days === 0 ? "bugün" : `${days} gün sonra`;
    if (days < 0) warnings.push({ code: "terminPassed", label: `Termin ${Math.abs(days)} gün geçti`, text: `Termin ${Math.abs(days)} gün önce geçti.`, level: "critical" });
    else if (soon && shortage > 0)
      warnings.push({ code: "terminRisk", label: `Termin riski · ${count(shortage)} eksik`, text: `Termin ${when}, ama depolardaki serbest stok yetmiyor (${count(shortage)} adet eksik).`, level: "critical" });
    else if (soon) warnings.push({ code: "terminSoon", label: "Termin yakın", text: `Termin ${when}; stok yeterli, planlanabilir.`, level: "info" });

    if (shortage > 0 && stock.incomingQuantity > 0 && stock.incomingDate && stock.incomingDate > line.terminDate.slice(0, 10)) {
      warnings.push({
        code: "purchaseLate",
        label: "Satınalma geç kalıyor",
        text: `Satınalma teslimi ${trDate(stock.incomingDate)}, satır termini ${trDate(line.terminDate)}. Beklemek termini kaçırtır.`,
        level: "critical",
      });
    }
  }
  if (line.isCash && shortage > 0)
    warnings.push({ code: "cashShortage", label: "Nakit satır stoksuz", text: `Nakit müşteri ve ${count(shortage)} adet eksik: tahsilat bekliyor, önce bu satırın stoğu çözülmeli.`, level: "critical" });
  if (stock.unplannedDemand > free)
    warnings.push({ code: "stockRace", label: "Stok yarışı", text: `Bu stok için bekleyen siparişler (${count(stock.unplannedDemand)}) serbest stoktan (${count(free)}) fazla: hepsi karşılanamaz.`, level: "warning" });
  if (line.isCash) warnings.push({ code: "cash", label: "Nakit", text: "Nakit satır: öncelikli", level: "info" });
  if (line.isGreen) warnings.push({ code: "green", label: "Yeşil", text: "Yeşil satır", level: "info" });
  return warnings;
};

/** Tabloda gösterilecek uyarılar: yalnız gerçek sorunlar (bilgi seviyesi hariç). */
export const visibleWarnings = (warnings: readonly LineWarning[]) => warnings.filter((warning) => warning.level !== "info");

/** Satır için depo / aksiyon önerisi — sırayla ilk uyan kural. */
export const lineAdvice = (line: PlanningLine, stock: PlanningStock, today: string): LineAdvice => {
  const factor = unitFactor(stock, line.unitName);
  const required = line.quantity * factor;
  const warnings = lineWarnings(line, stock, today);
  const base = { lineId: line.id, warnings, shortage: 0, splitKeep: null };
  const candidates = candidateDepots(stock);
  const currentFree = line.depotNo === null ? 0 : depotFree(stock, line.depotNo);

  // 1) Mevcut depo yetiyorsa korunur (plancının seçimi bozulmaz).
  if (line.depotNo !== null && candidates.includes(line.depotNo) && currentFree >= required) {
    const name = depotName(stock, line.depotNo);
    return { ...base, kind: "depot", depotNo: line.depotNo, label: `${name} ✓`, level: "ok", reason: `${name}: ${count(currentFree)} serbest, ${count(required)} gerekli.` };
  }

  // 2) Başka bir depo tek başına yetiyorsa o (tercih sırasıyla).
  for (const no of candidates) {
    if (no === line.depotNo) continue;
    const free = depotFree(stock, no);
    if (free >= required) {
      const name = depotName(stock, no);
      const note =
        line.depotNo !== null && candidates.includes(line.depotNo)
          ? `${depotName(stock, line.depotNo)} deposunda ${count(currentFree)} serbest, ${count(required - currentFree)} eksik; `
          : "";
      return { ...base, kind: "depot", depotNo: no, label: name, level: "ok", reason: `${note}${name} deposunda ${count(free)} serbest, ${count(required)} gerekli.` };
    }
  }

  // 3) Tek depo yetmiyor ama toplam yetiyorsa bölme.
  const ranked = candidates.map((no) => ({ no, free: depotFree(stock, no) })).sort((a, b) => b.free - a.free);
  const total = ranked.reduce((sum, item) => sum + item.free, 0);
  if (total >= required && ranked.length >= 2) {
    const [first, second] = ranked;
    const keep = Math.floor(first!.free / factor);
    return {
      ...base,
      kind: "split",
      depotNo: first!.no,
      label: "Böl",
      level: "warning",
      splitKeep: keep,
      reason: `Tek depoda yetmiyor: ${depotName(stock, first!.no)} ${count(first!.free)}, ${depotName(stock, second!.no)} ${count(second!.free)} serbest. Miktar Böl ile ${count(keep)}${line.unitName ? ` ${line.unitName}` : ""} ${depotName(stock, first!.no)} deposuna, kalanı ${depotName(stock, second!.no)} deposuna planlayın.`,
    };
  }

  // 4) Stok yetersiz: satınalma geliyorsa bekle, yoksa Yerinden/Transit.
  const shortage = required - total;
  if (stock.incomingQuantity > 0) {
    return {
      ...base,
      kind: "wait",
      depotNo: null,
      label: "Bekle",
      level: "warning",
      shortage,
      reason: `Serbest stok yetersiz (${count(total)} / ${count(required)}, ${count(shortage)} eksik). ${count(stock.incomingQuantity)} adet satınalma siparişi bekleniyor; gelene kadar bekletin veya Yerinden/Transit sevk edin.`,
    };
  }
  return {
    ...base,
    kind: "supplier",
    depotNo: null,
    label: "Yerinden/Transit",
    level: "critical",
    shortage,
    reason: `Serbest stok yetersiz (${count(total)} / ${count(required)}, ${count(shortage)} eksik) ve bekleyen satınalma siparişi yok. Yerinden veya Transit sevk önerilir.`,
  };
};

export interface PriorityInput {
  approvedAt: string | null;
  lines: readonly Pick<PlanningLine, "terminDate" | "isCash" | "isGreen">[];
  /** Satırlar yüklenmemişse siparişin teslim tarihi termin yerine kullanılır. */
  deliveryDate?: string | null;
}

/** Siparişin planlama önceliği. Yüksek puan = önce planlanmalı. */
export const orderPriority = (input: PriorityInput, today: string): OrderPriority => {
  const reasons: string[] = [];
  let score = 0;
  const add = (points: number, reason: string) => {
    score += points;
    reasons.push(reason);
  };
  if (input.lines.some((line) => line.isCash)) add(PLANNING_RULES.score.cash, "Nakit satır var");
  if (input.approvedAt) {
    const waiting = dayDiff(today, input.approvedAt);
    if (waiting > PLANNING_RULES.staleApprovalDays) add(PLANNING_RULES.score.staleApproval, `${waiting} gündür bekliyor`);
  }
  const termins = input.lines.map((line) => line.terminDate).filter((date): date is string => Boolean(date));
  if (!termins.length && input.deliveryDate) termins.push(input.deliveryDate);
  const diffs = termins.map((date) => dayDiff(date, today));
  if (diffs.some((diff) => diff < 0)) add(PLANNING_RULES.score.terminPassed, "Termini geçmiş satır var");
  else if (diffs.some((diff) => diff <= PLANNING_RULES.terminSoonDays)) add(PLANNING_RULES.score.terminSoon, "Termini yaklaşan satır var");
  if (input.lines.some((line) => line.isGreen)) add(PLANNING_RULES.score.green, "Yeşil satır var");
  const level = score >= PLANNING_RULES.highThreshold ? "Yüksek" : score >= PLANNING_RULES.mediumThreshold ? "Orta" : "Normal";
  return { score, level, reasons };
};

/** "1.800 adet = 150 koli = 7,5 palet" — birim karşılıkları. */
export const unitEquivalents = (stock: PlanningStock, quantity: number, unitName: string | null) => {
  const base = quantity * unitFactor(stock, unitName);
  return stock.units.map((unit) => ({ name: unit.name, quantity: unit.factor ? base / unit.factor : 0 }));
};
