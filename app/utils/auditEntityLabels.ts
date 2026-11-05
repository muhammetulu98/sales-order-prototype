// Denetim kaydındaki teknik varlık adı → kullanıcıya gösterilecek Türkçe ad. Backend'in
// ürettiği `summary` çoğu tip için zaten Türkçe bir cümledir; bu tablo summary'nin boş ya da
// ham tip adı olduğu durumlarda okunur bir etiket verir (kullanıcı aktivite paneli).
const AUDIT_ENTITY_LABELS: Record<string, string> = {
  ApplicationUser: "Kullanıcı",
  Role: "Rol",
  RolePagePermission: "Rol yetkisi",
  UserPagePermission: "Kullanıcı yetkisi",
  PagePermission: "Sayfa yetkisi",

  Order: "Sipariş",
  OrderDraft: "Sipariş taslağı",
  ReturnRequest: "İade talebi",
  CartItem: "Sepet ürünü",
  Cart: "Sepet",

  Mikro_Product: "Ürün",
  ProductSettings: "Ürün ayarı",
  StockImage: "Ürün görseli",
  Mikro_Customer: "Müşteri",
  CustomerSettings: "Müşteri ayarı",
  CustomerAccessCode: "Müşteri erişim kodu",

  Ticket: "Bilet",
  TicketMessage: "Bilet mesajı",
  TicketAttachment: "Bilet eki",
  PendingTicket: "Onay bekleyen talep",
  Feedback: "Geri bildirim",

  StorefrontBanner: "Vitrin bannerı",
  StorefrontCampaign: "İndirim kampanyası",
  StorefrontProductCampaign: "Ürün kampanyası",
  StorefrontProductCampaignItem: "Kampanya ürünü",
  StorefrontCoupon: "Kupon",
  StorefrontCustomerDiscount: "Cari iskonto",
  StorefrontOrderLine: "Vitrin sipariş satırı",
  StorefrontSettings: "Vitrin ayarı",

  NotificationRule: "Bildirim kuralı",
  EmailTemplate: "E-posta şablonu",
  ConditionRule: "Şart kuralı",
  SupplierPurchaseCondition: "Satınalma şartı",
  FairInvitation: "Fuar daveti",
  FairInvitationCandidate: "Fuar davet adayı",
  AiReportQuery: "Akıllı rapor",
  AiReportKnowledge: "Rapor bilgi kaydı",
  MobileAppVersion: "Mobil sürüm ayarı",
  WebAppRelease: "Sürüm notu",
  SalesTarget: "Satış hedefi",
  PurchaseSalesInvoiceDraft: "Alış-satış fatura taslağı",
};

export const auditEntityLabel = (entityType?: string | null): string => {
  if (!entityType) return "Kayıt";
  return AUDIT_ENTITY_LABELS[entityType] ?? entityType;
};

/** "oluşturdu / güncelledi / sildi" — kullanıcı öznesi zaten belli olduğu için 3. tekil fiil. */
export const auditOperationVerb = (operation?: string | null): string => {
  switch (operation) {
    case "create":
      return "oluşturdu";
    case "update":
      return "güncelledi";
    case "delete":
      return "sildi";
    default:
      return operation ?? "değiştirdi";
  }
};
