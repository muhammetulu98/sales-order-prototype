<script setup lang="ts">
// Kesit 7 · yeni satış teklifi/siparişi. Tip query ile gelir (?type=0 sipariş, 2 teklif);
// gövde ekran 04 ile 05 için AYNIDIR (legacy'de de tek SIPARISLER satırı, farklı sip_tip).
import { ArrowLeft } from "lucide-vue-next";
import type { ErpSalesOrderLookups, ErpSalesOrderSavePayload } from "~/composables/useErpSalesOrders";
import { SALES_OFFER_TYPE, ErpSalesOrderActionError } from "~/composables/useErpSalesOrders";

definePageMeta({
  pageTitle: "Yeni Satış Evrakı",
  erpPermission: "ERP.SalesOrder.Create",
});

const route = useRoute();
const router = useRouter();
const salesApi = useErpSalesOrders();
const notifier = useNotifier();

const orderType = computed(() => (Number(route.query.type) === SALES_OFFER_TYPE ? SALES_OFFER_TYPE : 0));
const title = computed(() => (orderType.value === SALES_OFFER_TYPE ? "Yeni Satış Teklifi" : "Yeni Satış Siparişi"));

const lookups = ref<ErpSalesOrderLookups | null>(null);
const saving = ref(false);
// Sayfa keep-alive'da kalır: başarıdan sonra form yeniden kurulur (formKey) ki sonraki "Yeni"
// eski evrakı tekrar göndermesin. requestId kaybolan yanıttan sonraki tekrar tıklamayı korur.
const formKey = ref(0);
let requestId = crypto.randomUUID();

onMounted(async () => {
  lookups.value = await salesApi.lookups().catch(() => null);
});

const submit = async (payload: ErpSalesOrderSavePayload) => {
  saving.value = true;
  try {
    // Tür formdan gelir: "Kaydet" sayfanın türünü, "Teklif Kaydet" teklifi (2) yazar.
    const saved = await salesApi.create({ ...payload, requestId });
    requestId = crypto.randomUUID();
    formKey.value++;
    // PROTOTİP: evrak detay sayfası yok; form sıfırlanır, kayıt bildirimi gösterilir.
    notifier.success(`${saved.orderType === SALES_OFFER_TYPE ? "Teklif" : "Sipariş"} kaydedildi: ${saved.orderSeries}-${saved.orderNumber}`);
  } catch (error) {
    notifier.error(error instanceof ErpSalesOrderActionError ? error.message : "Evrak kaydedilemedi.");
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader :title="title" description="Numara ERP bandından verilir (900000–999999); seri korunur.">
      <template #actions>
        <!-- Bütçe kutusu (sağ üst): form buraya taşır. -->
        <div id="header-budget" class="flex items-center" />
        <Button variant="secondary" @click="router.push('/sales/orders')">
          <ArrowLeft class="mr-2 size-4" />
          Listeye Dön
        </Button>
      </template>
    </PageHeader>

    <ErpSalesOrderForm :key="formKey" :order-type="orderType" :lookups="lookups" :saving="saving" @submit="submit" />
  </div>
</template>
