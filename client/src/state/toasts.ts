import { create } from "zustand";
import { uid } from "../lib/ids";

export type ToastKind = "success" | "error" | "warn";

export type Toast = {
  id: string;
  kind: ToastKind;
  message: string;
  createdAt: number;
};

type ToastState = {
  toasts: Toast[];
  push: (kind: ToastKind, message: string) => void;
  dismiss: (id: string) => void;
};

export const useToasts = create<ToastState>((set, get) => ({
  toasts: [],
  push: (kind, message) => {
    const t: Toast = { id: uid(), kind, message, createdAt: Date.now() };
    set({ toasts: [...get().toasts, t] });
    setTimeout(() => get().dismiss(t.id), 4000);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export const toast = {
  success: (msg: string) => useToasts.getState().push("success", msg),
  error: (msg: string) => useToasts.getState().push("error", msg),
  warn: (msg: string) => useToasts.getState().push("warn", msg),
};
