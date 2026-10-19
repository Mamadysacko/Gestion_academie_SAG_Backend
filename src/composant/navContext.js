import { createContext, useContext } from 'react';

/** Navigation globale : navigate(moduleId, sousOngletId?) ouvre n'importe quel écran sans repasser par l'accueil. */
export const NavContext = createContext(() => {});

export function useAppNavigate() {
  return useContext(NavContext);
}
