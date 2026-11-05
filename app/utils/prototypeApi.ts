// Prototip API katmanı: backend yok. useApi.send bu fonksiyona sorar; bilinen uçlara kurgu veri döner,
// bilinmeyenlere boş yanıt. Böylece gerçek ekranlar (ErpSalesOrderForm dahil) DEĞİŞTİRİLMEDEN çalışır.

const CUSTOMERS = [
  { code: "120.01.0045", balance: 412500, creditLimit: 750000, commercialStatus: "A", forwarderCode: "320.99.0001", title: "YILDIZ TOPTAN GIDA KIRTASİYE LTD. ŞTİ.", representativeCode: "SELİM AKIN", salesPriceListNo: 1, paymentPlanNo: 30 },
  { code: "120.01.0112", balance: 1048000, creditLimit: 1200000, commercialStatus: "AB", title: "ÖZKAN OYUNCAK PAZARLAMA A.Ş.", representativeCode: "AYŞE KARAMAN", salesPriceListNo: 1, paymentPlanNo: 60 },
  { code: "120.02.0007", balance: 12300, creditLimit: 300000, commercialStatus: "B", forwarderCode: "320.99.0002", title: "MERT MARKET ZİNCİRİ TİC. A.Ş.", representativeCode: "SELİM AKIN", salesPriceListNo: 1, paymentPlanNo: 0 },
  { code: "120.03.0019", balance: 96000, creditLimit: 100000, commercialStatus: "A", title: "KARAKAYA TİCARET LTD. ŞTİ. (KİLİTLİ)", representativeCode: "AYŞE KARAMAN", salesPriceListNo: 1, paymentPlanNo: 30, locked: true },
  { code: "320.34.0011", balance: 0, creditLimit: 0, commercialStatus: "B", title: "DİLMAN KIRTASİYE MATBAACILIK LTD. ŞTİ. (TEDARİKÇİ)", representativeCode: "SELİM AKIN", salesPriceListNo: 1, paymentPlanNo: 90, transactionType: 1, transactionTypeName: "Tedarikçi" },
].map((item, index) => ({ id: `c${index}`, locked: false, cancelled: false, transactionType: 0, transactionTypeName: "Müşteri", ...item }));

const ADDRESSES: Record<string, { district: string; province: string }[]> = {
  "120.01.0045": [{ district: "Fatih", province: "İstanbul" }, { district: "Gebze", province: "Kocaeli" }],
  "120.01.0112": [{ district: "Ostim", province: "Ankara" }],
  "120.03.0019": [{ district: "Kadıköy", province: "İstanbul" }],
  "320.34.0011": [{ district: "Bağcılar", province: "İstanbul" }],
  "120.02.0007": [{ district: "Bornova", province: "İzmir" }, { district: "Yunusemre", province: "Manisa" }, { district: "Efeler", province: "Aydın" }],
};

// type: H = hazır stok (depoda), D = drop (tedarikçiden yerinden); sellable yalnız H'de anlamlıdır.
// İsk 1 (%) fiyat kuralından gelir (satırda değiştirilemez); kurgu değerler.
const DISCOUNT1 = [0, 5, 0, 10, 0, 7.5, 0, 12, 5, 0, 8, 3];
// Insert (kampanya) tanımları: stok kodu + geçerlilik aralığı. Evrak tarihi aralıktaysa satır insert'lidir.
const dayOffset = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const INSERTS = [
  { productCode: "111592", name: "Okula Dönüş İnserti", from: dayOffset(-10), to: dayOffset(20) },
  { productCode: "599526", name: "Fuar İnserti", from: dayOffset(-3), to: dayOffset(30) },
  { productCode: "443673", name: "Yaz İnserti", from: dayOffset(-60), to: dayOffset(-1) }, // süresi dolmuş
  { productCode: "241494", name: "Sezon İnserti", from: dayOffset(7), to: dayOffset(40) }, // henüz başlamamış
];
const activeInsert = (code: string, date: string) => INSERTS.find((item) => item.productCode === code && item.from <= date && date <= item.to);
// Bütçe hesabı: tedarikçi sözleşme oranları (kurgu). 272052 bilerek sözleşmesiz (hesaba girmez).
const SUPPLIERS = {
  DILMAN: { supplierCode: "320.34.0011", supplierName: "Dilman Kırtasiye" },
  ABKA: { supplierCode: "320.34.0014", supplierName: "Abka Kırtasiye" },
  CALKAN: { supplierCode: "320.34.0021", supplierName: "Çalkan Oyuncak" },
  MEHTAP: { supplierCode: "320.34.0033", supplierName: "Mehtap Mutfak" },
  SINBO: { supplierCode: "320.34.0040", supplierName: "Sinbo Elektronik" },
  PRESTIJ: { supplierCode: "320.34.0052", supplierName: "Prestij Oyuncak" },
  LETS: { supplierCode: "320.34.0061", supplierName: "Lets Boya" },
  PANTHER: { supplierCode: "320.34.0070", supplierName: "Panther Elektronik" },
  BD: { supplierCode: "320.34.0083", supplierName: "B&d Kırtasiye" },
  AURIS: { supplierCode: "320.34.0090", supplierName: "Auris Aksesuar" },
} as const;
const BUDGET_TERMS: Record<string, { s: keyof typeof SUPPLIERS; purchase: number; bonus: number; pTerm: number; sTerm: number; freight: number; contractSales: number } | undefined> = {
  "111592": { s: "DILMAN", purchase: 14, bonus: 2, pTerm: 90, sTerm: 60, freight: 2, contractSales: 3 },
  "136194": { s: "DILMAN", purchase: 12, bonus: 2, pTerm: 90, sTerm: 60, freight: 2, contractSales: 3 },
  "241494": { s: "ABKA", purchase: 13, bonus: 1, pTerm: 60, sTerm: 45, freight: 2, contractSales: 4 },
  "599526": { s: "CALKAN", purchase: 15, bonus: 2, pTerm: 75, sTerm: 60, freight: 3, contractSales: 4 },
  "354235": { s: "MEHTAP", purchase: 12, bonus: 1, pTerm: 60, sTerm: 60, freight: 3, contractSales: 3 },
  "709341": { s: "SINBO", purchase: 11, bonus: 1, pTerm: 90, sTerm: 45, freight: 4, contractSales: 3 },
  "471058": { s: "PRESTIJ", purchase: 16, bonus: 2, pTerm: 75, sTerm: 60, freight: 2, contractSales: 4 },
  "136291": { s: "LETS", purchase: 13, bonus: 1, pTerm: 60, sTerm: 45, freight: 2, contractSales: 3 },
  "443673": { s: "PANTHER", purchase: 14, bonus: 2, pTerm: 90, sTerm: 60, freight: 2, contractSales: 4 },
  "573251": { s: "BD", purchase: 13, bonus: 1, pTerm: 75, sTerm: 60, freight: 2, contractSales: 3 },
  "737212": { s: "AURIS", purchase: 12, bonus: 1, pTerm: 60, sTerm: 45, freight: 3, contractSales: 3 },
};
const budgetTermOf = (code: string) => {
  const term = BUDGET_TERMS[code];
  if (!term) return null;
  return {
    ...SUPPLIERS[term.s], purchaseDiscountPercent: term.purchase, bonusPercent: term.bonus, purchaseTermDays: term.pTerm,
    salesTermDays: term.sTerm, freightRatePercent: term.freight, contractSalesDiscountPercent: term.contractSales,
  };
};
const PRODUCTS = [
  { code: "111592", name: "Dilman Nöbet Defteri 96 Yaprak Ciltli", casePack: 24, price: 38.5, tax: 10, type: "H", sellable: 1850 },
  { code: "136194", name: "Dilman Fon Kartonu 9115 50*70 Karışık", casePack: 100, price: 12.9, tax: 10, type: "H", sellable: 9400 },
  { code: "241494", name: "Abka Kitap Kabı Sarı 5'Li Blisterli", casePack: 48, price: 21.75, tax: 20, type: "D", sellable: null },
  { code: "599526", name: "Çalkan Clk-187 Minik Stand", casePack: 12, price: 164, tax: 20, type: "H", sellable: 96 },
  { code: "354235", name: "Mehtap Tencere 18Cm Çift Taraf Teflon Onyx", casePack: 6, price: 289.9, tax: 20, type: "H", sellable: 0 },
  { code: "709341", name: "Sinbo Vantilatör 16\" Sf-6789 Ayaklı 60w Beyaz", casePack: 4, price: 1149, tax: 20, type: "D", sellable: null },
  { code: "471058", name: "Prestij Piyano Pr18 Pilli Sevimli Kutuda Tavşanlı", casePack: 12, price: 215, tax: 20, type: "H", sellable: 324 },
  { code: "136291", name: "Lets Parmak Boyası L-5500 6 Renk 25Mg", casePack: 36, price: 47.9, tax: 20, type: "D", sellable: null },
  { code: "443673", name: "Panther Pt-z614 Usb Şarjlı Sinek Öldürücü Işık", casePack: 20, price: 96.5, tax: 20, type: "H", sellable: 58 },
  { code: "573251", name: "B&d Kalem Çantası Bd-kcs090 Disco Simli Büyük Boy", casePack: 24, price: 62.75, tax: 20, type: "H", sellable: 1260 },
  { code: "272052", name: "Abka Proje Çantası Art College 28*38 Renkli", casePack: 10, price: 184, tax: 20, type: "D", sellable: null },
  { code: "737212", name: "Auris Mkb01 M.Media Klavye", casePack: 20, price: 139, tax: 20, type: "H", sellable: 410 },
].map((item, index) => ({
  id: `p${index}`,
  masterBarcode: `8690${item.code}${String(index + 1).padStart(3, "0")}`,
  stockType: item.type,
  sellableQuantity: item.sellable,
  listPrice: item.price,
  multiCode: `M${item.code}`,
  discount1: DISCOUNT1[index] ?? 0,
  ...item,
}));

const matches = (term: string, ...values: (string | null)[]) => {
  const needle = term.toLocaleLowerCase("tr");
  return values.some((value) => value?.toLocaleLowerCase("tr").includes(needle));
};

const page = <T,>(items: T[], query: Record<string, unknown>) => ({
  items,
  totalCount: items.length,
  page: Number(query.page ?? 1),
  pageSize: Number(query.pageSize ?? 10),
});

/** Tanımsız dönerse gerçek istek atılır; prototipte hiçbir uç gerçek istek atmaz. */
export const prototypeApi = (path: string, opts: { query?: Record<string, unknown> } = {}): unknown => {
  const query = opts.query ?? {};
  const [route] = path.split("?");

  if (route === "/api/erp/permissions/mine") return ["ERP.CashSale.Create", "ERP.CashSale.Read", "ERP.Customer.Create", "ERP.Customer.CreditLimit", "ERP.Customer.Lock", "ERP.Customer.Read", "ERP.Customer.Update", "ERP.Dashboard.View", "ERP.DropshipOrder.Cancel", "ERP.DropshipOrder.Read", "ERP.DropshipOrder.Update", "ERP.FairApproval.Read", "ERP.FairApproval.Update", "ERP.FairShipment.Read", "ERP.FairShipment.Update", "ERP.GoodsReceipt.Read", "ERP.InterDepotOrder.Close", "ERP.InterDepotOrder.Create", "ERP.InterDepotOrder.Read", "ERP.InterDepotOrder.Update", "ERP.OrderManagement.Close", "ERP.OrderManagement.Depot", "ERP.OrderManagement.Plan", "ERP.OrderManagement.Read", "ERP.OrderManagement.RevokeApproval", "ERP.OrderManagement.Split", "ERP.OrderReport.Read", "ERP.PriceDifference.Read", "ERP.PriceListDefinition.Read", "ERP.PriceListDefinition.Write", "ERP.Product.Create", "ERP.Product.Read", "ERP.Product.Update", "ERP.ProductCategory.Assign", "ERP.ProductCategory.Read", "ERP.PurchaseCondition.Create", "ERP.PurchaseCondition.Delete", "ERP.PurchaseCondition.Read", "ERP.PurchaseCondition.Update", "ERP.PurchaseOrder.Close", "ERP.PurchaseOrder.Create", "ERP.PurchaseOrder.Read", "ERP.PurchaseOrder.Update", "ERP.ReturnRequest.Approve", "ERP.ReturnRequest.Create", "ERP.ReturnRequest.Delete", "ERP.ReturnRequest.Read", "ERP.RolePermission.Read", "ERP.RolePermission.Update", "ERP.SalesDocument.Create", "ERP.SalesDocument.Read", "ERP.SalesOrder.Create", "ERP.SalesOrder.Read", "ERP.SalesOrder.Update", "ERP.SalesOrder.View", "ERP.SalesOrderApproval.Edit", "ERP.SalesOrderApproval.Read", "ERP.SalesQuote.Approve", "ERP.SalesQuote.Read", "ERP.SalesQuote.Update", "ERP.ShipmentPlan.Assign", "ERP.ShipmentPlan.Group", "ERP.ShipmentPlan.Read", "ERP.SupplierContract.Create", "ERP.SupplierContract.Delete", "ERP.SupplierContract.Read", "ERP.SupplierContract.Update", "ERP.Ticket.Read", "ERP.User.AssignRoles", "ERP.User.Read", "ERP.User.UpdatePermissions", "ERP.X.View"];

  if (route === "/api/erp/customers/") {
    const term = String(query.search ?? "");
    return page(CUSTOMERS.filter((item) => matches(term, item.code, item.title)), query);
  }
  const customerMatch = route!.match(/^\/api\/erp\/customers\/([^/]+)$/);
  if (customerMatch) {
    const code = decodeURIComponent(customerMatch[1]!);
    const customer = CUSTOMERS.find((item) => item.code === code);
    if (!customer) return null;
    return {
      customer,
      addresses: (ADDRESSES[code] ?? []).map((address, index) => ({
        id: `${code}-a${index + 1}`, customerCode: code, addressNo: index + 1, title: null, cancelled: false, ...address,
      })),
      contacts: [],
    };
  }

  if (route === "/api/erp/products/") {
    const term = String(query.search ?? "");
    return page(PRODUCTS.filter((item) => matches(term, item.code, item.name, item.masterBarcode, item.multiCode)), query);
  }

  if (route === "/api/erp/sales-orders/lookups") {
    return {
      depots: [{ no: 1, name: "İkitelli Depo" }, { no: 3, name: "Plaza Depo" }],
      paymentPlans: [{ no: 0, name: "PEŞİN" }, { no: 30, name: "30 GÜN" }, { no: 60, name: "60 GÜN" }, { no: 90, name: "90 GÜN" }],
      deliveryTypes: [
        { code: "WAREHOUSE", name: "Ambar" }, { code: "TIMON_SERVICE", name: "Timon Servis" },
        { code: "CUSTOMER_TRUCK", name: "Müşteri Kamyonu" }, { code: "SELF_PICKUP", name: "Kendisi Alacak" },
      ],
      representatives: [{ code: "SELİM AKIN", name: "Selim Akın" }, { code: "AYŞE KARAMAN", name: "Ayşe Karaman" }],
      projects: [{ code: "FUAR-2026", name: "Fuar 2026" }],
      closeReasons: [],
      orderSeries: ["A", "B"],
      forwarders: [{ code: "320.99.0001", name: "Çelik Ambar" }, { code: "320.99.0002", name: "Yılmaz Nakliyat Ambarı" }, { code: "320.99.0003", name: "Ege Ambar" }],
      nextOrderNumber: 900001,
    };
  }
  const productInfo = route!.match(/^\/api\/erp\/sales-orders\/products\/([^/]+)$/);
  if (productInfo) {
    const product = PRODUCTS.find((item) => item.code === decodeURIComponent(productInfo[1]!));
    if (!product) return null;
    const insert = activeInsert(product.code, String(query.date ?? dayOffset(0)));
    return {
      code: product.code, name: product.name, defaultUnitPntr: 1,
      insertName: insert?.name ?? null, insertValidTo: insert?.to ?? null, budgetTerm: budgetTermOf(product.code),
      units: [{ pntr: 1, name: "Adet", factor: 1 }, { pntr: 2, name: "Koli", factor: product.casePack }],
      taxPntr: 1, taxPercent: product.tax, listPrice: product.price, discount1: product.discount1, priceListNo: 1,
      passive: false, salesStopped: false, physicalStateCode: null,
    };
  }
  if (route === "/api/erp/sales-orders/" && (opts as { method?: string }).method === "POST") {
    const body = (opts as { body?: { orderType?: number; orderSeries?: string } }).body ?? {};
    return { orderType: body.orderType ?? 0, orderSeries: body.orderSeries || "A", orderNumber: 900001 };
  }
  return null;
};
