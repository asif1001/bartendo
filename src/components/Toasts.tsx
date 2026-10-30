import { Check, Info, TriangleAlert, X } from 'lucide-react';
import type { ManagerEvent } from '../services/bluetooth/BluetoothManager';

export type ToastEntry = ManagerEvent & { id: number };

interface ToastsProps {
  toasts: ToastEntry[];
  onDismiss: (id: number) => void;
}

const ICONS: Record<ToastEntry['type'], typeof Check> = {
  error: TriangleAlert,
  success: Check,
  info: Info,
};

const STYLES: Record<ToastEntry['type'], string> = {
  error: 'border-rose-500/40 bg-rose-950/80 text-rose-100',
  success: 'border-emerald-500/40 bg-emerald-950/80 text-emerald-100',
  info: 'border-sky-500/40 bg-sky-950/80 text-sky-100',
};

/** Top-anchored auto-stacking notification host. */
export function Toasts({ toasts, onDismiss }: ToastsProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-4">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.type];
        return (
          <div
            key={toast.id}
            className={`animate-toast-in pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border px-4 py-3 backdrop-blur-md ${STYLES[toast.type]}`}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="flex-1 text-[13px] leading-snug">{toast.message}</p>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              className="shrink-0 opacity-60 transition hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
