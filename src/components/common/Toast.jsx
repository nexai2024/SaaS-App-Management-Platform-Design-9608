import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';

const { FiCheckCircle, FiAlertCircle, FiX } = FiIcons;

let externalToast = null;

export function toast(message, type = 'info') {
  if (externalToast) {
    externalToast(message, type);
    return;
  }
  if (type === 'error') console.error(message);
  else console.log(message);
}

export function toastError(message) {
  toast(message, 'error');
}

export function toastSuccess(message) {
  toast(message, 'success');
}

const ToastContext = createContext({
  toast,
  toastError,
  toastSuccess,
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);

  const dismiss = useCallback((id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const push = useCallback((message, type = 'info') => {
    if (!message) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setItems((prev) => [...prev.slice(-4), { id, message: String(message), type }]);
    window.setTimeout(() => dismiss(id), type === 'error' ? 6000 : 3500);
  }, [dismiss]);

  useEffect(() => {
    externalToast = push;
    return () => {
      if (externalToast === push) externalToast = null;
    };
  }, [push]);

  const value = {
    toast: push,
    toastError: (message) => push(message, 'error'),
    toastSuccess: (message) => push(message, 'success'),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {items.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              className={`pointer-events-auto rounded-2xl border backdrop-blur-xl shadow-lift px-4 py-3.5 flex items-start gap-3 ${
                item.type === 'error'
                  ? 'bg-red-50/95 border-red-200 text-red-800'
                  : item.type === 'success'
                    ? 'bg-emerald-50/95 border-emerald-200 text-emerald-800'
                    : 'bg-white/95 border-ink-100 text-ink-800'
              }`}
            >
              <SafeIcon
                icon={item.type === 'error' ? FiAlertCircle : FiCheckCircle}
                className={`w-5 h-5 mt-0.5 shrink-0 ${
                  item.type === 'error'
                    ? 'text-red-500'
                    : item.type === 'success'
                      ? 'text-emerald-500'
                      : 'text-brand-500'
                }`}
              />
              <p className="text-sm font-medium flex-1 leading-snug">{item.message}</p>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="text-current opacity-50 hover:opacity-100 transition-opacity"
              >
                <SafeIcon icon={FiX} className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
