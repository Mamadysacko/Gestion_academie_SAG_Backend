import { createContext, useCallback, useContext } from 'react';

export const ToastContext = createContext(null);

/**
 * Notifications animées : toast.success(message), toast.error(...), toast.info(...), toast.warning(...).
 * Options : { title, duration (ms, 0 = reste affiché), action: { label, onClick } }.
 */
export function useToast() {
  const toast = useContext(ToastContext);
  if (!toast) throw new Error('useToast doit être utilisé sous <ToastProvider>.');
  return toast;
}

/**
 * Remplace `useState('')` pour les messages de réussite d'un écran :
 * chaque message passé au setter est affiché en notification, sans bannière dans la page.
 */
export function useToastNotice(type = 'success') {
  const toast = useToast();
  const setNotice = useCallback((value) => {
    const message = typeof value === 'function' ? value('') : value;
    if (message) toast[type](message);
  }, [toast, type]);
  return ['', setNotice];
}
