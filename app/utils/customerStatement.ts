import type { ErpCustomerTransaction, ErpTransactionKind } from "~/composables/useErpCustomers";
import { localIsoDate } from "./dates";

// Cari ekstresi hesapları — B2B pages/customers/[code].vue ekstre sekmesinin mantığı.
// Yürüyen bakiye filtreden bağımsız, TÜM hareketler üzerinden kronolojik hesaplanır; filtre
// yalnız hangi satırların görüneceğini seçer. Başlangıç tarihi verildiyse ondan önceki
// kümülatif bakiye en üste "Devir" satırı olarak eklenir.

export const TRANSACTION_KIND_OPTIONS: { value: ErpTransactionKind; label: string }[] = [
  { value: "invoice", label: "Fatura" },
  { value: "collection", label: "Tahsilat" },
  { value: "return", label: "İade" },
  { value: "voucher", label: "Dekont" },
  { value: "cheque", label: "Çek" },
  { value: "bond", label: "Senet" },
];

export const OPENING_ROW_ID = "opening";

export interface StatementFilter {
  startDate?: string | null;
  endDate?: string | null;
  kind?: ErpTransactionKind | null;
  /** Yalnız borç hareketleri (alacak satırlarını gizler). */
  debitOnly?: boolean;
}

export interface StatementRow extends ErpCustomerTransaction {
  runningBalance: number;
  isOpening: boolean;
}

export interface Statement {
  rows: StatementRow[];
  /** Görünen hareketlerin toplamı (devir satırı hariç). */
  totalDebit: number;
  totalCredit: number;
  /** Son görünen satırın yürüyen bakiyesi; satır yoksa null. */
  closingBalance: number | null;
  transactionCount: number;
}

const dayOf = (value: string | null | undefined) => (value ?? "").slice(0, 10);

const round2 = (value: number) => Math.round(value * 100) / 100;

const hasFilter = (filter: StatementFilter) =>
  Boolean(filter.startDate || filter.endDate || filter.kind || filter.debitOnly);

export const isStatementFiltered = hasFilter;

export const withRunningBalance = (transactions: readonly ErpCustomerTransaction[]): StatementRow[] => {
  // sort kararlı: aynı günün hareketleri API sırasını korur.
  const sorted = [...transactions].sort((a, b) => dayOf(a.transactionDate).localeCompare(dayOf(b.transactionDate)));
  let balance = 0;
  return sorted.map((transaction) => {
    balance = round2(balance + (transaction.debit ?? 0) - (transaction.credit ?? 0));
    return { ...transaction, runningBalance: balance, isOpening: false };
  });
};

const openingRow = (allRows: StatementRow[], startDate: string): StatementRow | null => {
  const prior = allRows.filter((row) => dayOf(row.transactionDate) < startDate);
  const last = prior[prior.length - 1];
  if (!last) return null;
  const opening = last.runningBalance;
  return {
    id: OPENING_ROW_ID,
    documentSeries: null,
    documentSequence: null,
    transactionDate: startDate,
    referenceNo: null,
    kind: "voucher",
    documentTypeName: "Devir",
    typeName: null,
    description: "Önceki dönemden devreden bakiye",
    dueDate: null,
    debit: opening > 0 ? opening : 0,
    credit: opening < 0 ? -opening : 0,
    currency: last.currency,
    stockLines: [],
    runningBalance: opening,
    isOpening: true,
  };
};

export const buildStatement = (
  transactions: readonly ErpCustomerTransaction[],
  filter: StatementFilter = {},
): Statement => {
  const all = withRunningBalance(transactions);
  const visible = all.filter((row) => {
    const day = dayOf(row.transactionDate);
    if (filter.startDate && day < filter.startDate) return false;
    if (filter.endDate && day > filter.endDate) return false;
    if (filter.kind && row.kind !== filter.kind) return false;
    if (filter.debitOnly && row.credit > 0) return false;
    return true;
  });
  const opening = filter.startDate ? openingRow(all, filter.startDate) : null;
  const rows = opening ? [opening, ...visible] : visible;
  const last = rows[rows.length - 1];
  return {
    rows,
    totalDebit: round2(visible.reduce((sum, row) => sum + row.debit, 0)),
    totalCredit: round2(visible.reduce((sum, row) => sum + row.credit, 0)),
    closingBalance: last ? last.runningBalance : null,
    transactionCount: visible.length,
  };
};

export const transactionKindLabel = (kind: ErpTransactionKind) =>
  TRANSACTION_KIND_OPTIONS.find((option) => option.value === kind)?.label ?? kind;

// Tip rozeti için kısa etiket; tam Mikro adı title'da ve dışa aktarımda korunur.
const SHORT_DOCUMENT_TYPE: Record<string, string> = {
  "Alış faturası": "Alış Fat.",
  "Satış faturası": "Satış Fat.",
  "Tahsilat makbuzu": "Tahsilat",
  "Tediye makbuzu": "Tediye",
  "Kasa tediye fişi": "Tediye",
  "Açılış fişi": "Açılış",
  Devir: "Devir",
  "Borç Dekontu": "Borç Dek.",
  "Genel amaçlı virman dekontu": "Virman",
  "Cariler arası virman dekontu": "Virman",
  "Bankalar arası virman dekontu": "Virman",
  "Kur farkları virman dekontu": "Kur Farkı",
  "Bankaya gelen havale fişi": "Havale",
  "Bankadan gönderilen havale fişi": "Havale",
  "Firma havale emri kapatma": "Havale",
  "Kasa masraf fişi": "Masraf",
  "Müşteri kredi kartı ödeme fişi": "Kredi Kartı",
  "Firma kredi kartı ödeme fişi": "Kredi Kartı",
  "Bankadan firma çeki ödeme fişi": "Çek Ödeme",
  "Alınan serbest meslek makbuzu": "SMM",
  "Gider pusulası": "Gider Pus.",
  "Tahsile çek çıkış bordrosu": "Çek",
  "Tahsilden çek ödendi bordrosu": "Çek",
  "Tahsilden çek iade bordrosu": "Çek İade",
  "Çek iade giriş bordrosu": "Çek İade",
  "Çek iade çıkış bordrosu": "Çek İade",
  "Karşılıksız çek iade giriş bordrosu": "Çek İade",
  "Karşılıksız çek iade çıkış bordrosu": "Çek İade",
  "Tahsildeki çeki cariye iade bordrosu": "Çek İade",
  "Tahsildeki karşılıksız çeki cariye iade bordrosu": "Çek İade",
  "Tahsile senet çıkış bordrosu": "Senet",
  "Tahsilden senet ödendi bordrosu": "Senet",
  "Tahsilden senet iade bordrosu": "Senet İade",
  "Senet iade çıkış bordrosu": "Senet İade",
  "Tahsildeki senedi cariye iade bordrosu": "Senet İade",
  "Tahsildeki protestolu senedi cariye iade bordrosu": "Senet İade",
};

export const documentTypeLabel = (row: Pick<StatementRow, "documentTypeName" | "kind">) =>
  row.documentTypeName ? (SHORT_DOCUMENT_TYPE[row.documentTypeName] ?? row.documentTypeName) : transactionKindLabel(row.kind);

export const fullDocumentTypeLabel = (row: Pick<StatementRow, "documentTypeName" | "kind">) =>
  row.documentTypeName ?? transactionKindLabel(row.kind);

/** "A-1234"; seri/sıra yoksa null. */
export const documentNumber = (row: Pick<StatementRow, "documentSeries" | "documentSequence">) => {
  if (!row.documentSeries && !row.documentSequence) return null;
  return [row.documentSeries, row.documentSequence].filter((part) => part !== null && part !== "").join("-");
};

/** Bakiye işareti: pozitif → cari borçlu (Mikro borç − alacak). */
export const balanceSideLabel = (balance: number | null) => {
  if (!balance) return null;
  return balance > 0 ? "B" : "A";
};

const sanitizeFilePart = (value: string) =>
  value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80) || "cari";

export const statementFileBaseName = (
  customer: { code: string; title: string | null },
  detailed: boolean,
  today: string = localIsoDate(),
) =>
  `${detailed ? "detayli-cari-ekstre" : "cari-ekstre"}-${sanitizeFilePart(customer.code)}-${sanitizeFilePart(
    customer.title ?? customer.code,
  )}-${today}`;
