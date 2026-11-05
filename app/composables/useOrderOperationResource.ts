import { operationError, operationStatus } from "~/utils/orderOperations";

/** Önerilen uçlar için 404/403/hata ayrımı ve geç yanıt koruması. Demo veri üretmez. */
export const useOrderOperationResource = <T>(loader: () => Promise<T>) => {
  const data = shallowRef<T | null>(null);
  const status = ref<"idle" | "loading" | "ready" | "unavailable" | "forbidden" | "error">("idle");
  const error = ref("");
  let sequence = 0;
  const reset = () => { sequence++; data.value = null; status.value = "idle"; error.value = ""; };
  const load = async () => {
    const current = ++sequence;
    data.value = null;
    error.value = "";
    status.value = "loading";
    try {
      const result = await loader();
      if (current === sequence) { data.value = result; status.value = "ready"; }
    } catch (err) {
      if (current !== sequence) return;
      status.value = operationStatus(err) === 404 ? "unavailable" : operationStatus(err) === 403 ? "forbidden" : "error";
      error.value = operationError(err);
    }
  };
  onScopeDispose(reset);
  return { data, status, error, load, reset };
};
