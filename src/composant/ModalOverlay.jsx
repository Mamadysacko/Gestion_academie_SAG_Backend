import { useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * Couche modale unique de l'application. Toutes les fenêtres (formulaires, confirmations, tiroirs)
 * passent par elle, ce qui règle d'un seul endroit les problèmes d'affichage :
 *
 *  - rendu dans <body> (portail) : aucune fenêtre n'est coupée ni décalée par un parent
 *    transformé, masqué (overflow) ou à contexte d'empilement ;
 *  - empilement automatique : la dernière ouverte est toujours au-dessus, les confirmations
 *    passent au-dessus de toutes les fenêtres, les notifications au-dessus des confirmations ;
 *  - une seule fenêtre réagit à « Échap » : la plus récente (jamais deux fermées d'un coup) ;
 *  - défilement de la page bloqué sans saut de mise en page, arrière-plan inerte (clavier et lecteurs d'écran) ;
 *  - focus placé dans la fenêtre, gardé dans la fenêtre (Tab / Maj+Tab), puis rendu à l'élément d'origine ;
 *  - fermeture par clic extérieur seulement si le clic commence ET finit sur le fond (pas de fermeture
 *    accidentelle en sélectionnant du texte) ;
 *  - hauteur limitée à l'écran (dvh), contenu défilant, pied de formulaire toujours accessible.
 */

const stack = []; // fenêtres ouvertes, de la plus ancienne à la plus récente
let scrollLocks = 0;
let savedBodyStyle = null;

const LAYERS = { modal: 400, confirm: 500 };
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function lockPage() {
  scrollLocks += 1;
  if (scrollLocks > 1) return;
  const { body } = document;
  savedBodyStyle = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
  const scrollbar = window.innerWidth - document.documentElement.clientWidth;
  body.style.overflow = 'hidden';
  if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
  const root = document.getElementById('root');
  if (root) { root.inert = true; root.setAttribute('aria-hidden', 'true'); }
}

function unlockPage() {
  scrollLocks = Math.max(0, scrollLocks - 1);
  if (scrollLocks > 0) return;
  const { body } = document;
  body.style.overflow = savedBodyStyle?.overflow ?? '';
  body.style.paddingRight = savedBodyStyle?.paddingRight ?? '';
  const root = document.getElementById('root');
  if (root) { root.inert = false; root.removeAttribute('aria-hidden'); }
}

const applyStacking = () => {
  let modalIndex = 0;
  let confirmIndex = 0;
  stack.forEach((entry) => {
    const index = entry.layer === 'confirm' ? confirmIndex++ : modalIndex++;
    entry.node.style.zIndex = String(LAYERS[entry.layer] + index * 5);
  });
};

/**
 * Marque comme « pied de fenêtre » (collé en bas, toujours visible) la rangée de boutons qui contient
 * le bouton d'envoi d'un formulaire, pour les fenêtres qui défilent entièrement.
 */
function markFooters(dialog) {
  dialog.querySelectorAll('button[type="submit"]').forEach((submit) => {
    if (submit.closest('table, ul, ol, [data-modal-fixed]')) return;
    let row = submit.parentElement;
    // Remonte jusqu'à l'enveloppe la plus large qui ne contient que la rangée de boutons.
    while (row && row.parentElement && row.parentElement !== dialog && row.parentElement.tagName !== 'FORM'
      && row.parentElement.querySelectorAll('button').length <= 5 && row.parentElement.children.length <= 3) {
      row = row.parentElement;
    }
    if (!row || row === dialog || row.tagName === 'FORM' || row.hasAttribute('data-modal-footer')) return;
    const buttons = row.querySelectorAll('button').length;
    if (buttons >= 2 && buttons <= 5) row.setAttribute('data-modal-footer', '');
  });
}

export default function ModalOverlay({
  children, onClose, layer = 'modal', closeOnBackdrop = true, align = 'center', className = '', label,
}) {
  const ref = useRef(null);
  const pressedOnBackdrop = useRef(false);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  useLayoutEffect(() => {
    const node = ref.current;
    const entry = { node, layer, close: () => closeRef.current?.() };
    const opener = document.activeElement;
    stack.push(entry);
    lockPage();
    applyStacking();

    // Focus : champ prévu (autofocus) sinon premier élément utile ; le titre à défaut.
    const dialog = node.querySelector('[role="dialog"], [role="alertdialog"]') || node;
    const target = dialog.querySelector('[autofocus], [data-autofocus]') || dialog.querySelector(FOCUSABLE) || dialog;
    if (!dialog.hasAttribute('tabindex')) dialog.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    markFooters(dialog);
    // Les formulaires construits après coup (étapes, listes) reçoivent aussi leur pied collé.
    const observer = new MutationObserver(() => markFooters(dialog));
    observer.observe(dialog, { childList: true, subtree: true });

    const onKeyDown = (event) => {
      if (stack[stack.length - 1] !== entry) return; // seule la fenêtre du dessus réagit
      if (event.key === 'Escape') {
        event.stopPropagation();
        if (entry.layer === 'confirm' || closeRef.current) entry.close();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusables = [...dialog.querySelectorAll(FOCUSABLE)].filter((element) => element.offsetParent !== null);
      if (!focusables.length) { event.preventDefault(); dialog.focus(); return; }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      observer.disconnect();
      const index = stack.indexOf(entry);
      if (index >= 0) stack.splice(index, 1);
      applyStacking();
      unlockPage();
      // Le focus revient à l'élément d'origine, sauf si une autre fenêtre est encore ouverte.
      if (!stack.length && opener instanceof HTMLElement && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, [layer]);

  const alignment = align === 'bottom' ? 'items-end sm:items-center' : align === 'top' ? 'items-start' : 'items-center';
  return createPortal(
    <div
      ref={ref}
      data-modal-layer={layer}
      aria-label={label}
      style={{ zIndex: LAYERS[layer] }}
      className={`fixed inset-0 flex ${alignment} justify-center overflow-y-auto overscroll-contain bg-brand-charcoal/55 p-3 backdrop-blur-[2px] sm:p-6 ${className}`}
      onMouseDown={(event) => { pressedOnBackdrop.current = event.target === event.currentTarget; }}
      onClick={(event) => {
        const started = pressedOnBackdrop.current;
        pressedOnBackdrop.current = false;
        if (closeOnBackdrop && onClose && started && event.target === event.currentTarget) onClose();
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
