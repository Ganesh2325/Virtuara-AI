"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, AlertCircle, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

let toastQueue: ((toast: Toast) => void)[] = [];

export function showToast(message: string, type: ToastType = "info") {
  const id = Math.random().toString(36).slice(2);
  toastQueue.forEach((fn) => fn({ id, message, type }));
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const registerHandler = useCallback((fn: (toast: Toast) => void) => {
    toastQueue.push(fn);
    return () => {
      toastQueue = toastQueue.filter((f) => f !== fn);
    };
  }, []);

  const addToast = useCallback((toast: Toast) => {
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, 4000);
  }, []);

  const removeToast = (id: string) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  return { toasts, registerHandler, addToast, removeToast };
}

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="w-5 h-5 text-accent-emerald" />,
  error: <XCircle className="w-5 h-5 text-red-400" />,
  info: <AlertCircle className="w-5 h-5 text-accent-cyan" />,
};

const colors: Record<ToastType, string> = {
  success: "border-accent-emerald/30 bg-accent-emerald/10",
  error: "border-red-500/30 bg-red-500/10",
  info: "border-accent-cyan/30 bg-accent-cyan/10",
};

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

export function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  return (
    <div className="fixed top-6 right-6 z-[999] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 80, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm text-sm text-text-primary max-w-sm ${colors[toast.type]}`}
          >
            {icons[toast.type]}
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
