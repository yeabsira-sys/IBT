import { createContext, useCallback, useContext, useRef, useState } from "react";

const ToastContext = createContext(null);
let nextId = 1;

/**
 * ToastProvider — a small global notification queue so buttons scattered
 * across the app (add to cart, sign in, favorite, coupon) can give instant
 * feedback without every page building its own banner. Mount once near the
 * app root; call `useToast()` anywhere beneath it.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (message, tone = "success", duration = 3200) => {
      const id = nextId++;
      setToasts((current) => [...current, { id, message, tone }]);
      const timer = setTimeout(() => dismiss(id), duration);
      timers.current.set(id, timer);
      return id;
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-viewport" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.tone}`} onClick={() => dismiss(t.id)}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** useToast — returns `toast(message, tone?, duration?)`. tone: "success" | "error" | "info". */
export function useToast() {
  const toast = useContext(ToastContext);
  if (!toast) throw new Error("useToast must be used within a <ToastProvider>");
  return toast;
}
