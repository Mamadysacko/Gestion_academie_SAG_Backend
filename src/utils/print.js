/**
 * Imprime (ou enregistre en PDF via la boîte d'impression du navigateur) uniquement les
 * éléments fournis, sans la navigation de l'application. Les styles de la page sont recopiés
 * dans un cadre invisible ; chaque élément `.print-page` commence sur une nouvelle page.
 */
export function printElements(elements, title = 'Document', { orientation = 'portrait', margin = '12mm' } = {}) {
  const nodes = (Array.isArray(elements) ? elements : [elements]).filter(Boolean);
  if (!nodes.length) return;

  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(frame);

  const doc = frame.contentDocument;
  const styles = [...document.querySelectorAll('style, link[rel="stylesheet"]')].map((node) => node.outerHTML).join('');
  const body = nodes.map((node) => node.outerHTML).join('');
  doc.open();
  doc.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${title}</title>${styles}
    <style>
      @page { size: A4 ${orientation}; margin: ${margin}; }
      body { background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .print-page { break-after: page; page-break-after: always; box-shadow: none !important; }
      .print-page:last-child { break-after: auto; page-break-after: auto; }
      .no-print { display: none !important; }
    </style></head><body>${body}</body></html>`);
  doc.close();

  const run = () => {
    frame.contentWindow.focus();
    frame.contentWindow.print();
    window.setTimeout(() => frame.remove(), 1000);
  };
  // Laisse le temps aux feuilles de style recopiées de se charger.
  window.setTimeout(run, 400);
}
