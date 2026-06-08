import React, { useState, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

const _listeners: Set<(t: ToastItem) => void> = new Set();
let _id = 0;

export function toast(message: string, type: ToastType = 'info') {
  const item: ToastItem = { id: ++_id, message, type };
  _listeners.forEach((fn) => fn(item));
}

export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler = (t: ToastItem) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 4500);
    };
    _listeners.add(handler);
    return () => { _listeners.delete(handler); };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-5 py-3 rounded-xl shadow-xl text-xs font-black uppercase italic tracking-wide pointer-events-auto max-w-xs
            ${t.type === 'error' ? 'bg-red-600 text-white' : t.type === 'success' ? 'bg-green-600 text-white' : 'bg-sidebar-bg text-white'}`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
