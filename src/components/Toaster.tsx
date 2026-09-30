/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

// Tiny module-level store so any component (or plain function) can raise a toast
// or ask for confirmation without threading context/props through the tree.

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ConfirmRequest {
  message: string;
  confirmLabel: string;
  resolve: (ok: boolean) => void;
}

let toasts: ToastItem[] = [];
let pendingConfirm: ConfirmRequest | null = null;
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

function push(message: string, kind: ToastKind) {
  const id = nextId++;
  toasts = [...toasts.slice(-3), { id, message, kind }];
  emit();
  setTimeout(() => dismiss(id), kind === 'error' ? 6000 : 3500);
}

export const toast = {
  success: (message: string) => push(message, 'success'),
  error: (message: string) => push(message, 'error'),
  info: (message: string) => push(message, 'info')
};

export function confirmAction(message: string, confirmLabel = 'Confirm'): Promise<boolean> {
  pendingConfirm?.resolve(false);
  return new Promise((resolve) => {
    pendingConfirm = { message, confirmLabel, resolve };
    emit();
  });
}

function settleConfirm(ok: boolean) {
  pendingConfirm?.resolve(ok);
  pendingConfirm = null;
  emit();
}

const kindStyles: Record<ToastKind, { box: string; icon: React.ReactNode }> = {
  success: { box: 'border-emerald-200 bg-emerald-50 text-emerald-800', icon: <CheckCircle2 size={18} className="text-emerald-600 shrink-0" /> },
  error: { box: 'border-rose-200 bg-rose-50 text-rose-800', icon: <AlertCircle size={18} className="text-rose-600 shrink-0" /> },
  info: { box: 'border-gray-200 bg-white text-gray-800', icon: <Info size={18} className="text-teal-600 shrink-0" /> }
};

export function Toaster() {
  const [, forceRender] = useState(0);

  useEffect(() => {
    const listener = () => forceRender((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!pendingConfirm) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') settleConfirm(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <>
      <div
        className="fixed bottom-4 right-4 left-4 sm:left-auto z-[60] flex flex-col gap-2 sm:w-96 pointer-events-none"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg text-sm font-medium animate-fade-in ${kindStyles[t.kind].box}`}
          >
            {kindStyles[t.kind].icon}
            <p className="flex-1 leading-snug">{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="opacity-60 hover:opacity-100" aria-label="Dismiss">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      {pendingConfirm && (
        <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => settleConfirm(false)}>
          <div
            role="alertdialog"
            aria-modal="true"
            className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm space-y-5 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-gray-800 leading-relaxed">{pendingConfirm.message}</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => settleConfirm(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                autoFocus
                onClick={() => settleConfirm(true)}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white"
              >
                {pendingConfirm.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
