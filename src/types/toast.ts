export type ToastStatus = 'success' | 'error' | 'warning';

export interface ToastItem {
  id: number;
  status: ToastStatus;
  message: string;
}
