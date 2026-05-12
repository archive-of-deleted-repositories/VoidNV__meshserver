import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { useToasts } from "../state/toasts";

export function Toasts() {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((t) => {
        const Icon =
          t.kind === "error" ? AlertTriangle : t.kind === "warn" ? AlertTriangle : CheckCircle2;
        return (
          <div key={t.id} className={"toast " + t.kind}>
            <span className="toast-icon">
              <Icon size={16} />
            </span>
            <span className="toast-body">{t.message}</span>
            <button
              className="toast-close"
              aria-label="Dismiss"
              onClick={() => dismiss(t.id)}
            >
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
