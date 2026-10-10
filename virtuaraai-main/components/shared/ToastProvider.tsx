"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, AlertCircle, Info, Bell } from "lucide-react";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  title?: string;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, title?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info", title?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, title }]);
    setTimeout(() => removeToast(id), 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className="pointer-events-auto"
            >
              <ToastItem toast={toast} onRemove={removeToast} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-semantic-success-text" />,
    error: <AlertCircle className="w-5 h-5 text-semantic-error-text" />,
    info: <Info className="w-5 h-5 text-clematis-600" />,
    warning: <AlertCircle className="w-5 h-5 text-semantic-warning-text" />,
  };

  const backgrounds = {
    success: "bg-semantic-success-muted border-semantic-success-border",
    error: "bg-semantic-error-muted border-semantic-error-border",
    info: "bg-bg-elevated border-border-subtle",
    warning: "bg-semantic-warning-muted border-semantic-warning-border",
  };

  return (
    <div className={`w-[320px] p-4 rounded-2xl border shadow-xl backdrop-blur-md flex gap-4 ${backgrounds[toast.type]}`}>
      <div className="shrink-0 pt-0.5">{icons[toast.type]}</div>
      <div className="flex-1">
        {toast.title && <h4 className="text-[14px] font-bold text-text-heading mb-0.5">{toast.title}</h4>}
        <p className="text-[13px] text-text-secondary leading-relaxed">{toast.message}</p>
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="shrink-0 p-1 hover:bg-black/5 rounded-full transition-colors self-start"
      >
        <X className="w-4 h-4 text-text-tertiary" />
      </button>
    </div>
  );
}
