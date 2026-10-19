import logoSag from '../assets/logo-sag.png';
import logoAges from '../assets/logo-ages.png';
import { FOOTER_LEFT, FOOTER_RIGHT } from './exportExcel';

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
const absolute = (url) => new URL(url, window.location.href).href;

/** En-tête uniforme : logo SAG, « Siguiri Education Project », logo AGES, puis titre du document. */
function headerHtml(title) {
  return `<div style="display:grid;grid-template-columns:46mm 1fr 56mm;align-items:center;gap:10px">
      <img src="${absolute(logoSag)}" alt="SAG" style="height:18mm;width:auto;object-fit:contain;object-position:left">
      <div style="text-align:center">
        <p style="margin:0;background:#1F1F20;color:#F5D482;padding:4px 10px;border-radius:3px;font-size:14px;font-weight:800;letter-spacing:.04em">Siguiri Education Project</p>
        <p style="margin:4px 0 0;font-size:9px;font-weight:700;color:#3E3C39">SAG French Numeracy and Literacy – Employees Education Attendance &amp; Reporting</p>
      </div>
      <img src="${absolute(logoAges)}" alt="AGES" style="height:18mm;width:auto;object-fit:contain;object-position:right;margin-left:auto;display:block">
    </div>
    <div style="margin-top:8px;border-top:2px solid #A97324;border-bottom:2px solid #A97324;padding:5px 0;text-align:center">
      <p style="margin:0;font-size:15px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:#1F1F20">${escapeHtml(title)}</p>
    </div>`;
}

/** Pied de page uniforme : « Vérifié par : AGES COORDINATEUR » / date d'édition / « SAG EDUCATION PROJECT ». */
function footerHtml() {
  const now = new Date();
  const left = escapeHtml(FOOTER_LEFT).replace('AGES COORDINATEUR', '<strong>AGES COORDINATEUR</strong>');
  return `<div style="display:flex;align-items:flex-end;justify-content:space-between;border-top:2px solid #A97324;padding-top:5px;font-size:10px;color:#1F1F20">
      <span>${left}</span>
      <span style="font-size:8px;color:#706C64">Édité le ${now.toLocaleDateString('fr-FR')} à ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
      <strong style="letter-spacing:.04em">${escapeHtml(FOOTER_RIGHT)}</strong>
    </div>`;
}

/** Enveloppe un élément dans un tableau dont l'en-tête et le pied se répètent à chaque page. */
function brandedPage(node, title) {
  const clone = node.cloneNode(true);
  clone.classList.remove('print-page');
  const page = document.createElement('table');
  page.className = 'print-page brand-sheet';
  page.innerHTML = `<thead><tr><td>${headerHtml(title)}<div style="height:8px"></div></td></tr></thead>
    <tfoot><tr><td><div style="height:8px"></div>${footerHtml()}</td></tr></tfoot>
    <tbody><tr><td></td></tr></tbody>`;
  page.querySelector('tbody td').appendChild(clone);
  return page;
}

/**
 * Imprime (ou enregistre en PDF via la boîte d'impression du navigateur) uniquement les
 * éléments fournis, sans la navigation de l'application. Les styles de la page sont recopiés
 * dans un cadre invisible ; chaque élément `.print-page` commence sur une nouvelle page.
 *
 * Par défaut, chaque page reçoit l'en-tête commun (logos SAG et AGES, « Siguiri Education
 * Project », titre) et le pied de page commun. Passer `branded: false` pour un document qui
 * porte déjà son propre en-tête (rapports, fiches journalières).
 * `hideControls` masque boutons, onglets et champs de saisie (impression d'un écran entier).
 */
export function printElements(elements, title = 'Document', {
  orientation = 'portrait', margin = '12mm', branded = true, hideControls = false,
} = {}) {
  const nodes = (Array.isArray(elements) ? elements : [elements]).filter(Boolean);
  if (!nodes.length) return;

  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(frame);

  const doc = frame.contentDocument;
  const styles = [...document.querySelectorAll('style, link[rel="stylesheet"]')].map((node) => node.outerHTML).join('');
  const body = nodes.map((node) => (branded ? brandedPage(node, title).outerHTML : node.outerHTML)).join('');
  doc.open();
  doc.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>${styles}
    <style>
      @page { size: A4 ${orientation}; margin: ${margin}; }
      body { background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: Arial, Helvetica, sans-serif; }
      .print-page { break-after: page; page-break-after: always; box-shadow: none !important; }
      .print-page:last-child { break-after: auto; page-break-after: auto; }
      .no-print { display: none !important; }
      table.brand-sheet { width: 100%; border-collapse: collapse; }
      table.brand-sheet > thead { display: table-header-group; }
      table.brand-sheet > tfoot { display: table-footer-group; }
      table.brand-sheet > tbody > tr > td, table.brand-sheet > thead > tr > td, table.brand-sheet > tfoot > tr > td { padding: 0; border: 0; }
      ${hideControls ? 'button, select, input, textarea, nav, [role="tablist"], .print\\:hidden { display: none !important; }' : ''}
      tr, img { break-inside: avoid; }
    </style></head><body>${body}</body></html>`);
  doc.close();

  const run = () => {
    frame.contentWindow.focus();
    frame.contentWindow.print();
    window.setTimeout(() => frame.remove(), 1000);
  };
  // Laisse le temps aux feuilles de style et aux logos de se charger.
  window.setTimeout(run, 600);
}

/** Imprime le contenu affiché de la page courante avec l'en-tête et le pied de page communs. */
export function printPage(title = 'Document', options = {}) {
  const content = document.querySelector('main');
  if (!content) return;
  printElements(content, title, { hideControls: true, orientation: 'landscape', margin: '10mm', ...options });
}
