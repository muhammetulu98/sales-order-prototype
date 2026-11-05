import type { ErpStockMovement } from "~/composables/useErpProducts";

// Stok kartı → Stok hareketleri: kalan miktar, süzme ve toplamlar.
// Kalan, depo süzgecine uyan TÜM hareketler üzerinden kronolojik yürür; tarih / evrak tipi /
// yön süzgeçleri yalnız satır gizler, kalanı değiştirmez (cari ekstresiyle aynı kural).

export type MovementDirectionFilter = "all" | "in" | "out";

export interface MovementFilter {
  startDate?: string | null;
  endDate?: string | null;
  depotNo?: number | null;
  documentTypeName?: string | null;
  direction?: MovementDirectionFilter;
}

export interface MovementRow extends ErpStockMovement {
  inQuantity: number | null;
  outQuantity: number | null;
  balance: number;
}

export interface MovementView {
  rows: MovementRow[];
  totalIn: number;
  totalOut: number;
  /** Görünen hareketlerin net değişimi (giriş − çıkış). */
  netChange: number;
  totalCount: number;
}

const round3 = (value: number) => Math.round(value * 1000) / 1000;

export const buildMovementView = (movements: readonly ErpStockMovement[], filter: MovementFilter = {}): MovementView => {
  const inDepot = movements.filter((movement) => filter.depotNo == null || movement.depotNo === filter.depotNo);
  const sorted = [...inDepot].sort((a, b) => a.date.slice(0, 10).localeCompare(b.date.slice(0, 10)));
  let balance = 0;
  const withBalance: MovementRow[] = sorted.map((movement) => {
    balance = round3(balance + (movement.direction === "in" ? movement.quantity : -movement.quantity));
    return {
      ...movement,
      inQuantity: movement.direction === "in" ? movement.quantity : null,
      outQuantity: movement.direction === "out" ? movement.quantity : null,
      balance,
    };
  });
  const rows = withBalance.filter((row) => {
    const day = row.date.slice(0, 10);
    if (filter.startDate && day < filter.startDate) return false;
    if (filter.endDate && day > filter.endDate) return false;
    if (filter.documentTypeName && row.documentTypeName !== filter.documentTypeName) return false;
    if (filter.direction && filter.direction !== "all" && row.direction !== filter.direction) return false;
    return true;
  });
  const totalIn = round3(rows.reduce((sum, row) => sum + (row.inQuantity ?? 0), 0));
  const totalOut = round3(rows.reduce((sum, row) => sum + (row.outQuantity ?? 0), 0));
  return { rows, totalIn, totalOut, netChange: round3(totalIn - totalOut), totalCount: movements.length };
};

export const movementDepotOptions = (movements: readonly ErpStockMovement[]) => {
  const map = new Map<number, string>();
  for (const movement of movements) map.set(movement.depotNo, movement.depotName ?? `Depo ${movement.depotNo}`);
  return [...map].map(([no, name]) => ({ no, name })).sort((a, b) => a.name.localeCompare(b.name, "tr"));
};

export const movementDocumentTypes = (movements: readonly ErpStockMovement[]) =>
  [...new Set(movements.map((movement) => movement.documentTypeName))].sort((a, b) => a.localeCompare(b, "tr"));

/** "Cari / Karşı Depo" sütunu: transferde "KAYNAK → HEDEF", diğerlerinde cari unvanı. */
export const counterpartyLabel = (row: ErpStockMovement) => {
  if (row.isTransfer) {
    const here = row.depotName ?? `Depo ${row.depotNo}`;
    const other = row.counterDepotName ?? "?";
    return row.direction === "in" ? `${other} → ${here}` : `${here} → ${other}`;
  }
  return row.customerName ?? row.customerCode ?? null;
};

export const movementDocumentNo = (row: Pick<ErpStockMovement, "documentSeries" | "documentSequence">) =>
  [row.documentSeries, row.documentSequence === null ? null : String(row.documentSequence).padStart(6, "0")]
    .filter(Boolean)
    .join(" ") || null;

/** Panoya kopyalama için sekmeyle ayrılmış metin (Excel'e yapıştırılabilir). */
export const movementsToTsv = (rows: readonly MovementRow[]) => {
  const header = ["Tarih", "Evrak No", "Evrak Tipi", "Cari / Karşı Depo", "Depo", "Giriş", "Çıkış", "Kalan", "Birim", "Net Fiyat", "Tutar"];
  const number = (value: number | null) => (value === null ? "" : String(value).replace(".", ","));
  const lines = rows.map((row) =>
    [
      row.date.slice(0, 10).split("-").reverse().join("."),
      movementDocumentNo(row) ?? "",
      row.documentTypeName,
      counterpartyLabel(row) ?? "",
      row.depotName ?? "",
      number(row.inQuantity),
      number(row.outQuantity),
      number(row.balance),
      row.unitName ?? "",
      number(row.netUnitPrice),
      number(row.amount),
    ].join("\t"),
  );
  return [header.join("\t"), ...lines].join("\n");
};
