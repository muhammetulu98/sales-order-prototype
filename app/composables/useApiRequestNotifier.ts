// composables/useApiRequestNotifier.ts
//
// Tracks in-flight API requests via the global RequestActivity store, which
// drives the ambient top progress bar (components/RequestProgressBar.vue).
//
// Errors are batched into a single toast per error burst, so 5 failed
// requests on a dashboard load → 1 toast saying "5 istek başarısız", not 5.

const normalizeErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return "İşlem tamamlanamadı.";
};

// Module-level batch (singleton) so multiple parallel failures merge
let batchErrors: string[] = [];
let batchTimer: ReturnType<typeof setTimeout> | null = null;
const BATCH_WINDOW_MS = 250;

const flushBatchErrors = () => {
  batchTimer = null;
  if (!import.meta.client || batchErrors.length === 0) {
    batchErrors = [];
    return;
  }
  const notifier = useNotifier();
  const errors = [...batchErrors];
  batchErrors = [];

  if (errors.length === 1) {
    notifier.error({
      title: "İşlem tamamlanamadı",
      message: errors[0] || "İşlem tamamlanamadı.",
      ariaRole: "alert",
      ariaLive: "assertive",
    });
    return;
  }

  notifier.error({
    title: `${errors.length} istek başarısız`,
    message: errors[0] || "İşlem tamamlanamadı.",
    ariaRole: "alert",
    ariaLive: "assertive",
  });
};

const queueErrorToast = (message: string) => {
  if (!import.meta.client) return;
  batchErrors.push(message);
  if (batchTimer) clearTimeout(batchTimer);
  batchTimer = setTimeout(flushBatchErrors, BATCH_WINDOW_MS);
};

export const useApiRequestNotifier = () => {
  // `silent`: çağıran hatayı kendisi ele alıyor (ör. 409 çözümü). İlerleme çubuğu yine
  // çalışır, yalnız ortak hata toast'ı bastırılır — çözülmüş bir çakışma için
  // "İşlem tamamlanamadı" demek yanlış bilgidir.
  const track = async <T>(
    operation: () => Promise<T>,
    options: { silent?: boolean } = {},
  ): Promise<T> => {
    const activity = useRequestActivity();
    activity.start();

    try {
      const result = await operation();
      activity.end();
      return result;
    } catch (error) {
      activity.end(error);
      if (!options.silent) queueErrorToast(normalizeErrorMessage(error));
      throw error;
    }
  };

  return {
    track,
  };
};
