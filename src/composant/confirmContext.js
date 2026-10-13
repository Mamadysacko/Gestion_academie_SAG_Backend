import { createContext, useContext } from 'react';

export const ConfirmContext = createContext(null);

/**
 * Ouvre la fenêtre de confirmation et résout `true` si l'utilisateur confirme.
 * Usage : `if (!(await confirm({ title, message, tone: 'danger' }))) return;`
 * tone : 'danger' (suppression), 'warning' (modification), 'primary' (création).
 */
export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error('useConfirm doit être utilisé sous <ConfirmProvider>.');
  return confirm;
}
