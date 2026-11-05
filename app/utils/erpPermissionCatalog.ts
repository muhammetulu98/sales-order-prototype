// ERP izin kataloğu etiketleri — izin adları backend ErpPermissions'tan gelir
// (GET /api/erp/permissions/catalog); burada yalnız "ERP.<Resource>.<Action>" parçaları
// Türkçe etikete çevrilir ve kaynak bazında gruplanır. Bilinmeyen parça ham hâliyle gösterilir.

const RESOURCE_LABELS: Record<string, string> = {
  FairApproval: "Fuar Sipariş Risk Onayı",
  FairShipment: "Fuar Sevkiyat",
  SupplierContract: "Tedarikçi Sözleşmeleri",
  ShipmentPlan: "Sevkiyat Planlama",
  PurchaseOrder: "Satın Alma Siparişleri",
  InterDepotOrder: "Depo Talep Fişleri",
  OrderManagement: "Sipariş Yönetimi",
  PriceListDefinition: "İnsert Tanımları",
  SalesOrder: "Satış Evrakları",
  SalesOrderApproval: "Satış Sipariş Onaylama",
  SalesQuote: "Satış Teklifi Onaylama",
  CashSale: "Kasa Satış",
  ReturnRequest: "İade Talepleri",
  ProductCategory: "Kategori Düzenleme",
  Customer: "Cari Kartlar",
  Product: "Stok Kartları",
  PurchaseCondition: "Fiyat Yönetimi (Satın Alma Şartları)",
  DropshipOrder: "Yerinden / Transit İzleme",
  Ticket: "Destek Talepleri",
  RolePermission: "Rol Yetkileri",
  OrderFulfillment: "Tedarik Yönlendirme (Yerinden / Transit / Alış)",
  GoodsReceipt: "Mal Kabul",
  SalesDocument: "İrsaliye ve Fatura",
  PriceDifference: "Fiyat Farkı Talepleri",
  OrderReport: "Sipariş Raporları",
  User: "Kullanıcılar",
};

const ACTION_LABELS: Record<string, string> = {
  Read: "Görüntüleme",
  Create: "Oluşturma",
  Update: "Düzenleme",
  Write: "Yazma",
  Delete: "Silme",
  Approve: "Onaylama",
  RevokeApproval: "Onay Geri Alma",
  Assign: "Atama",
  Close: "Kapatma",
  Cancel: "İptal",
  Plan: "Planlama",
  Split: "Bölme",
  Depot: "Depo Değiştirme",
  CancelPicking: "Toplama İptali",
  Group: "Gruplama",
  Box: "Kutulama",
  Edit: "Düzenleme (başlık, kapatma, çoğaltma)",
  Discount1: "İskonto 1 Değiştirme",
  Discount2: "İskonto 2 Değiştirme",
  Discount3: "İskonto 3 Değiştirme",
  Discount4: "İskonto 4 Değiştirme",
  DueDate: "Vade Değiştirme",
  CancelPlan: "Planlama İptali",
  CancelBoxing: "Kutulama İptali",
  AssignRoles: "Rol Atama",
  UpdatePermissions: "Özel Yetki Düzenleme",
  Lock: "Kilitleme / Kilit Kaldırma",
  CreditLimit: "Kredi Limiti",
  Merge: "Birleştirme",
  Link: "Siparişe Bağlama",
  Request: "Talep Açma",
  Invoice: "Faturalama",
  ViewCost: "Maliyet Görme",
  Dropship: "Yerinden",
  Transit: "Transit",
  Purchase: "Satın Alma Siparişi",
};

export interface ErpPermissionItem {
  name: string;
  action: string;
  label: string;
}

export interface ErpPermissionGroup {
  resource: string;
  label: string;
  permissions: ErpPermissionItem[];
}

/** Katalog sırası korunur (backend kesit sırası); "ERP." öneki olmayan adlar atlanır. */
export const groupErpPermissions = (names: string[]): ErpPermissionGroup[] => {
  const groups = new Map<string, ErpPermissionGroup>();
  for (const name of names) {
    const [prefix, resource, action] = name.split(".");
    if (prefix !== "ERP" || !resource || !action) continue;
    let group = groups.get(resource);
    if (!group) {
      group = { resource, label: RESOURCE_LABELS[resource] ?? resource, permissions: [] };
      groups.set(resource, group);
    }
    group.permissions.push({ name, action, label: ACTION_LABELS[action] ?? action });
  }
  return [...groups.values()];
};

/**
 * Kullanıcıya özel istisna listesi, efektif kümeden türetilir: rolde olmayan ama seçili →
 * eklenen; rolde olan ama seçili değil → çıkarılan.
 */
export const diffUserPermissions = (roleDerived: string[], effective: string[]) => {
  const role = new Set(roleDerived);
  const chosen = new Set(effective);
  return {
    granted: [...chosen].filter((name) => !role.has(name)),
    revoked: [...role].filter((name) => !chosen.has(name)),
  };
};
