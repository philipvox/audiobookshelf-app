/**
 * src/shared/hooks/useToast.ts
 *
 * Global toast notification system using Zustand.
 * Unlike useSnackbar (component-local), this provides app-wide toast state.
 *
 * Usage:
 *   const { showToast } = useToast();
 *   showToast({ type: 'success', message: 'Item saved!' });
 *
 * Add <ToastContainer /> to your root component to render toasts.
 */

import { create } from 'zustand';
import { useCallback } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

// ============================================================================
// STORE
// ============================================================================

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const duration = toast.duration ?? 3000;

    set((state) => ({
      toasts: [...state.toasts, { ...toast, id, duration }],
    }));

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        const currentToasts = get().toasts;
        if (currentToasts.some((t) => t.id === id)) {
          set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id),
          }));
        }
      }, duration);
    }

    return id;
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  clearToasts: () => set({ toasts: [] }),
}));

// ============================================================================
// HOOK
// ============================================================================

export interface ShowToastOptions {
  type: ToastType;
  message: string;
  /** Duration in ms. Default: 3000. Set to 0 for persistent. */
  duration?: number;
}

export function useToast() {
  const addToast = useToastStore((state) => state.addToast);
  const removeToast = useToastStore((state) => state.removeToast);
  const clearToasts = useToastStore((state) => state.clearToasts);
  const toasts = useToastStore((state) => state.toasts);

  const showToast = useCallback(
    (options: ShowToastOptions): string => {
      return addToast({
        type: options.type,
        message: options.message,
        duration: options.duration ?? 3000,
      });
    },
    [addToast]
  );

  // Convenience methods
  const showSuccess = useCallback(
    (message: string, duration = 3000) => showToast({ type: 'success', message, duration }),
    [showToast]
  );

  const showError = useCallback(
    (message: string, duration = 4000) => showToast({ type: 'error', message, duration }),
    [showToast]
  );

  const showWarning = useCallback(
    (message: string, duration = 3500) => showToast({ type: 'warning', message, duration }),
    [showToast]
  );

  const showInfo = useCallback(
    (message: string, duration = 3000) => showToast({ type: 'info', message, duration }),
    [showToast]
  );

  return {
    // Core
    showToast,
    removeToast,
    clearToasts,
    toasts,
    // Convenience
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
}
