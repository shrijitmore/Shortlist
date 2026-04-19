// src/toast.ts — module-level pub/sub toast bus; no external packages
export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

type Listener = (items: ToastItem[]) => void;

let queue: ToastItem[] = [];
let listeners: Listener[] = [];
let nextId = 0;

function broadcast() {
  const snapshot = [...queue];
  for (let i = 0; i < listeners.length; i++) {
    listeners[i](snapshot);
  }
}

export function toast(message: string, type: ToastType = 'info'): void {
  const id = ++nextId;
  queue.push({ id, message, type });
  broadcast();
  setTimeout(() => {
    queue = queue.filter(t => t.id !== id);
    broadcast();
  }, 4000);
}

export function subscribeToasts(fn: Listener): () => void {
  listeners.push(fn);
  fn([...queue]);
  return () => {
    listeners = listeners.filter(l => l !== fn);
  };
}
