import { toast } from "vue-sonner";

export type NotifierTone = "success" | "error" | "info" | "warning";
export type NotifierActionTone = "primary" | "secondary" | "danger";

export interface NotifierActionConfig {
  id?: string;
  label: string;
  pendingLabel?: string;
  tone?: NotifierActionTone;
  disabled?: boolean;
  closeOnClick?: boolean;
  onClick?: () => void | Promise<void>;
}

export interface NotifierVisualProps {
  caption?: string;
  meta?: string;
  actions?: NotifierActionConfig[];
  dismissible?: boolean;
}

export interface NotifierOptions extends NotifierVisualProps {
  title?: string;
  message: string;
  duration?: number;
  ariaLive?: "polite" | "assertive";
  ariaRole?: "alert" | "status";
  skipQueue?: boolean;
  ariaLiveOnly?: boolean;
}

export type NotifierInput = string | NotifierOptions;
export type NotifierResolver<T> = NotifierInput | ((value: T) => NotifierInput);

export interface NotifierPromiseOptions<T> {
  pending: NotifierInput;
  success?: NotifierResolver<T>;
  error?: NotifierResolver<unknown>;
}

type ToastId = string | number;

export interface NotifierToastController {
  id: ToastId;
  dismiss: () => void;
}

export interface NotifierPromiseController extends NotifierToastController {
  success: (input: NotifierInput) => ToastId;
  error: (input: NotifierInput) => ToastId;
}

const defaultPromiseSuccessMessage = "İşlem tamamlandı.";
const defaultPromiseErrorMessage = "İşlem tamamlanamadı.";

const normalizeInput = (input: NotifierInput): NotifierOptions => {
  if (typeof input === "string") return { message: input };
  return input;
};

const resolveInput = <T>(
  input: NotifierResolver<T> | undefined,
  fallback: NotifierInput,
  value: T,
): NotifierInput => {
  if (!input) return fallback;
  return typeof input === "function" ? input(value) : input;
};

const withDefaults = (
  input: NotifierInput,
  defaults: Partial<NotifierOptions>,
): NotifierOptions => ({
  ...defaults,
  ...normalizeInput(input),
});

// Mesaj başlığı + description'a böl. Title yoksa message ana başlık olur,
// caption description olur. Title varsa title ana, message description olur.
type SonnerOptions = {
  description?: string;
  duration?: number;
  dismissible?: boolean;
  action?: { label: string; onClick: () => void | Promise<void> };
  id?: ToastId;
};

const toSonnerArgs = (
  input: NotifierInput,
): { primary: string; options: SonnerOptions } => {
  const n = normalizeInput(input);
  const primary = n.title || n.message;
  const description = n.title ? n.message : n.caption;

  // vue-sonner tek action button destekliyor; ilkini kullan.
  const firstAction = n.actions?.[0];
  const action = firstAction
    ? {
        label: firstAction.label,
        onClick: () => {
          void firstAction.onClick?.();
        },
      }
    : undefined;

  // ÖNEMLİ: duration/dismissible undefined geçirme — vue-sonner bu durumda
  // Toaster'ın default'unu (3000ms) sıfırlıyor ve toast kalıcı oluyor.
  const options: SonnerOptions = {};
  if (description !== undefined) options.description = description;
  if (n.duration !== undefined) options.duration = n.duration;
  if (n.dismissible !== undefined) options.dismissible = n.dismissible;
  if (action) options.action = action;

  return { primary, options };
};

const buildController = (id: ToastId): NotifierToastController => ({
  id,
  dismiss: () => toast.dismiss(id),
});

export const useNotifier = () => {
  const success = (input: NotifierInput): NotifierToastController => {
    const { primary, options } = toSonnerArgs(input);
    const id = toast.success(primary, options);
    return buildController(id);
  };

  const error = (input: NotifierInput): NotifierToastController => {
    const { primary, options } = toSonnerArgs(input);
    const id = toast.error(primary, options);
    return buildController(id);
  };

  const info = (input: NotifierInput): NotifierToastController => {
    const { primary, options } = toSonnerArgs(input);
    const id = toast.info(primary, options);
    return buildController(id);
  };

  const warning = (input: NotifierInput): NotifierToastController => {
    const { primary, options } = toSonnerArgs(input);
    const id = toast.warning(primary, options);
    return buildController(id);
  };

  const loading = (input: NotifierInput): NotifierToastController => {
    const { primary, options } = toSonnerArgs(
      withDefaults(input, { dismissible: false }),
    );
    const id = toast.loading(primary, options);
    return buildController(id);
  };

  const action = (
    input: NotifierOptions & { tone?: NotifierTone },
  ): NotifierToastController => {
    const { tone = "info", ...rest } = input;
    const enriched = withDefaults(rest, { duration: 10000 });
    switch (tone) {
      case "success":
        return success(enriched);
      case "error":
        return error(enriched);
      case "warning":
        return warning(enriched);
      default:
        return info(enriched);
    }
  };

  // Promise controller: loading → success/error.
  // ÖNEMLİ: vue-sonner aynı id ile update edince orijinal duration (loading için
  // Infinity) korunuyor — toast el ile kapanana kadar sabit kalıyor. Bu yüzden
  // transition'da eski loading toast'u dismiss edip TAZE bir success/error yaratıyoruz.
  const startPromise = (input: NotifierInput): NotifierPromiseController => {
    const loadingArgs = toSonnerArgs(withDefaults(input, { dismissible: false }));
    const id = toast.loading(loadingArgs.primary, loadingArgs.options);
    return {
      id,
      dismiss: () => toast.dismiss(id),
      success: (next: NotifierInput) => {
        toast.dismiss(id);
        const { primary: p, options: o } = toSonnerArgs(next);
        return toast.success(p, o);
      },
      error: (next: NotifierInput) => {
        toast.dismiss(id);
        const { primary: p, options: o } = toSonnerArgs(next);
        return toast.error(p, o);
      },
    };
  };

  const promise = async <T>(
    operation: Promise<T> | (() => Promise<T>),
    options: NotifierPromiseOptions<T>,
  ): Promise<T> => {
    const controller = startPromise(options.pending);

    try {
      const result = await (typeof operation === "function"
        ? operation()
        : operation);
      controller.success(
        resolveInput(
          options.success,
          { message: defaultPromiseSuccessMessage },
          result,
        ),
      );
      return result;
    } catch (err) {
      const fallbackMessage =
        err instanceof Error && err.message
          ? err.message
          : defaultPromiseErrorMessage;

      controller.error(
        resolveInput(options.error, { message: fallbackMessage }, err),
      );
      throw err;
    }
  };

  return {
    success,
    error,
    info,
    warning,
    loading,
    action,
    startPromise,
    promise,
    clearAll: () => toast.dismiss(),
    destroyAll: () => toast.dismiss(),
  };
};
