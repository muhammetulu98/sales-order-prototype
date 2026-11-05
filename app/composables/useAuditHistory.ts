export interface AuditChange {
  field: string;
  label: string;
  oldValue?: string | null;
  newValue?: string | null;
  oldDisplay?: string | null;
  newDisplay?: string | null;
  context?: string | null;
}

export interface AuditEvent {
  correlationId: string;
  changedAt: string;
  changedBy: string;
  changedByName?: string | null;
  operation: string; // "create" | "update" | "delete"
  summary?: string | null;
  changes: AuditChange[];
  /** Kullanıcı bazlı geçmişte dolu gelir: "neyi" değiştirdiği (kayıt bazlı geçmişte gereksiz). */
  entityType?: string | null;
  /** Bu işlemde yazılan denetim satırı sayısı; toplu içe aktarımda 1'den büyük olur. */
  changeCount?: number;
}

export const useAuditHistory = () => {
  const api = useApi();

  const events = ref<AuditEvent[]>([]);
  const loading = ref(false);
  const loadedUrl = ref<string | null>(null);

  const load = async (url: string) => {
    loading.value = true;
    try {
      const data = await api.request<AuditEvent[]>(url);
      events.value = Array.isArray(data) ? data : [];
      loadedUrl.value = url;
    } catch {
      events.value = [];
      // error toast is surfaced by useApi's notifier
    } finally {
      loading.value = false;
    }
  };

  const reset = () => {
    events.value = [];
    loadedUrl.value = null;
  };

  return { events, loading, loadedUrl, load, reset };
};
