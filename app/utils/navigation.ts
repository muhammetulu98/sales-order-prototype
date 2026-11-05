// ERP navigasyonu — ERP branch'indeki utils/erpNavigation.ts'ten port; rotalar
// artık bağımsız uygulamada olduğundan /erp öneki YOK. Görünürlük ERP izinlerinden
// türetilir (useErpPermissions().canAny(item.requiredPermission)). Modül sayfaları
// port edildikçe (Faz 2+) gruplardaki maddeler açılır.

import type { Component } from "vue";
import {
  ArrowLeftRight,
  Banknote,
  ClipboardCheck,
  Database,
  Factory,
  FileSignature,
  FileText,
  FolderTree,
  LayoutDashboard,
  LifeBuoy,
  Package,
  PackageCheck,
  PackageSearch,
  Receipt,
  Percent,
  Route,
  ShieldCheck,
  ShoppingCart,
  Tags,
  Truck,
  Undo2,
  Users,
  Warehouse,
  Activity,
} from "lucide-vue-next";

export interface NavItem {
  label: string;
  to: string;
  icon: Component;
  /** superAdminOnly true ise anlamsızdır (rol kapısı izinin yerini alır). */
  /** Biri yeterli (canAny). */
  requiredPermission?: string | readonly string[];
  /** İzin yerine rol kapısı: yalnız Süper Admin görür (personel denetimi ekranları). */
  superAdminOnly?: boolean;
}

export interface NavGroup {
  title: string;
  collapsible?: boolean;
  items: NavItem[];
}

// Sıra: Genel Bakış → Ana Kayıtlar (cari + stok) → işlem ekranları. Ana kayıt
// ekranları her zaman işlemlerin ÜSTÜNDEDİR (kullanıcı kararı, 2026-09-18).
export const navGroups: NavGroup[] = [
  {
    title: "Genel",
    items: [
      {
        label: "Genel Bakış",
        to: "/",
        icon: LayoutDashboard,
        requiredPermission: "ERP.Dashboard.View",
      },
    ],
  },
  {
    title: "Ana Kayıtlar",
    items: [
      {
        label: "Cari Kartlar",
        to: "/customers",
        icon: Users,
        requiredPermission: "ERP.Customer.Read",
      },
      {
        label: "Stok Kartları",
        to: "/products",
        icon: Package,
        requiredPermission: "ERP.Product.Read",
      },
      {
        label: "Kategori Düzenleme",
        to: "/product-categories",
        icon: FolderTree,
        requiredPermission: "ERP.ProductCategory.Read",
      },
      {
        // Kesit 15 · ekran 25 — İnsert Tanımlama (projeye bağlı özel satış fiyat listesi).
        label: "İnsert Tanımları",
        to: "/price-lists",
        icon: Tags,
        requiredPermission: "ERP.PriceListDefinition.Read",
      },
    ],
  },
  // Sipariş akışı iş sahibine göre üç grup (kullanıcı kararı, 2026-10-19): Satış (satış ekibi +
  // finans onayı) → Sevkiyat (planlama + depo) → Satın Alma. Üstteki süreç şeridi kaldırıldı;
  // gezinme yalnız menüden.
  {
    title: "Satış",
    collapsible: true,
    items: [
      {
        // Teklif + sipariş listesi; Satış Teklifi Onaylama (Kesit 13 · ekran 19) bu sayfanın
        // "Onay Bekleyen Teklifler" sekmesi — iki izinden biri yeter.
        label: "Satış Evrakları",
        to: "/sales/orders",
        icon: ShoppingCart,
        requiredPermission: ["ERP.SalesOrder.Read", "ERP.SalesQuote.Read"],
      },
      {
        label: "Satış Sipariş Onaylama",
        to: "/sales/order-approvals",
        icon: ClipboardCheck,
        requiredPermission: "ERP.SalesOrderApproval.Read",
      },
      { label: "Sipariş Takibi", to: "/sales/order-tracking", icon: Route, requiredPermission: "ERP.SalesOrder.Read" },
      // PDF adım 6 — kutulanan irsaliyeden fatura, tedarikçiden karşılanan miktarlar için irsaliye/fatura.
      { label: "İrsaliye ve Fatura", to: "/sales/order-documents", icon: Receipt, requiredPermission: "ERP.SalesDocument.Read" },
      {
        label: "Kasa Satış",
        to: "/sales/cash-sale",
        icon: ShoppingCart,
        requiredPermission: "ERP.CashSale.Read",
      },
      { label: "Fiyat Farkı Talepleri", to: "/sales/price-differences", icon: Percent, requiredPermission: "ERP.PriceDifference.Read" },
      {
        // Ekran 26 — Satış Sipariş Aktarma (legacy FormSiparisAktarma): panodan toplu sipariş.
        label: "Sipariş Aktarma",
        to: "/sales/order-import",
        icon: FileText,
        requiredPermission: "ERP.SalesOrder.Create",
      },
      { label: "Sipariş Raporları", to: "/sales/order-reports", icon: FileText, requiredPermission: "ERP.OrderReport.Read" },
    ],
  },
  {
    title: "Sevkiyat",
    collapsible: true,
    items: [
      {
        // Kesit 15 · ekran 18 — Sipariş Yönetimi; satış ve depo siparişi bacakları tek listede.
        label: "Sipariş Planlama",
        to: "/sales/order-management",
        icon: ClipboardCheck,
        requiredPermission: "ERP.OrderManagement.Read",
      },
      {
        label: "Sevkiyat Plan Yönetimi",
        to: "/warehouse/shipments",
        icon: Truck,
        requiredPermission: "ERP.ShipmentPlan.Read",
      },
      {
        label: "Yerinden / Transit İzleme",
        to: "/dropship-orders",
        icon: Route,
        requiredPermission: "ERP.DropshipOrder.Read",
      },
      { label: "Depo Talep Fişleri", to: "/warehouse/transfer-requests", icon: Warehouse, requiredPermission: "ERP.InterDepotOrder.Read" },
    ],
  },
  {
    title: "Satın Alma",
    collapsible: true,
    items: [
      { label: "Satın Alma Siparişleri", to: "/purchasing/orders", icon: PackageSearch, requiredPermission: "ERP.PurchaseOrder.Read" },
      { label: "Mal Kabul", to: "/warehouse/goods-receipts", icon: PackageCheck, requiredPermission: "ERP.GoodsReceipt.Read" },
      {
        label: "Fiyat Yönetimi",
        to: "/purchase-conditions",
        icon: Percent,
        requiredPermission: "ERP.PurchaseCondition.Read",
      },
      {
        label: "Tedarikçi Sözleşmeleri",
        to: "/supplier-contracts",
        icon: FileSignature,
        requiredPermission: "ERP.SupplierContract.Read",
      },
    ],
  },
  {
    title: "İade",
    items: [
      {
        label: "İade Talepleri",
        to: "/returns",
        icon: Undo2,
        requiredPermission: "ERP.ReturnRequest.Read",
      },
    ],
  },
  {
    title: "Fuar",
    items: [
      {
        label: "Fuar Sipariş Risk Onayı",
        to: "/fair-approvals",
        icon: ClipboardCheck,
        requiredPermission: "ERP.FairApproval.Read",
      },
      {
        // Kesit 12 · ekran 22 — Fuar Sevkiyat Yönetimi (legacy menü 11012). Legacy'nin
        // Müşteri/Tedarikçi sekmeleri tek listede birleşti (stand filtresi).
        label: "Fuar Sevkiyat",
        to: "/fair-shipments",
        icon: Truck,
        requiredPermission: "ERP.FairShipment.Read",
      },
    ],
  },
  {
    title: "Destek",
    items: [
      {
        label: "Destek Talepleri",
        to: "/support-tickets",
        icon: LifeBuoy,
        requiredPermission: "ERP.Ticket.Read",
      },
    ],
  },
  {
    title: "Yönetim",
    items: [
      {
        // Kullanıcı aktivitesi — ERP izniyle değil Süper Admin rolüyle açılır (B2B ile aynı).
        label: "Aktivite",
        to: "/activity",
        icon: Activity,
        superAdminOnly: true,
      },
      {
        label: "Kullanıcılar",
        to: "/users",
        icon: Users,
        requiredPermission: "ERP.User.Read",
      },
      {
        label: "Rol Yetkileri",
        to: "/roles",
        icon: ShieldCheck,
        requiredPermission: "ERP.RolePermission.Read",
      },
    ],
  },
];
