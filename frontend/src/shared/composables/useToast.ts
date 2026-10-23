type ToastType = "success" | "error" | "info" | "warning";

interface ToastOptions {
  title: string;
  description?: string;
  type?: ToastType;
}

export function useToast() {
  function toast(options: ToastOptions) {
    window.dispatchEvent(new CustomEvent("app-toast", { detail: { type: options.type ?? "info", ...options } }));
  }

  function success(title: string, description?: string) {
    toast({ type: "success", title, description });
  }

  function error(title: string, description?: string) {
    toast({ type: "error", title, description });
  }

  function warning(title: string, description?: string) {
    toast({ type: "warning", title, description });
  }

  return { toast, success, error, warning };
}
