import { ToastStatus, ToastItem } from '@type/toast';
import { StoreSlice } from './store';

let toastSeq = 0;

export interface ToastSlice {
  toasts: ToastItem[];
  /** Push a toast onto the queue (auto-dismisses; renders stacked). */
  addToast: (status: ToastStatus, message: string) => void;
  /** Remove a toast by id. */
  dismissToast: (id: number) => void;
}

export const createToastSlice: StoreSlice<ToastSlice> = (set) => ({
  toasts: [],
  addToast: (status: ToastStatus, message: string) => {
    set((prev: ToastSlice) => ({
      ...prev,
      toasts: [...prev.toasts, { id: ++toastSeq, status, message }],
    }));
  },
  dismissToast: (id: number) => {
    set((prev: ToastSlice) => ({
      ...prev,
      toasts: prev.toasts.filter((toast) => toast.id !== id),
    }));
  },
});
