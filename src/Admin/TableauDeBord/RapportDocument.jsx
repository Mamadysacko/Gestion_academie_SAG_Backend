import { forwardRef, useMemo } from 'react';
import logoSag from '../../assets/logo-sag.png';
import logoAges from '../../assets/logo-ages.png';
import { FOOTER_LEFT, FOOTER_RIGHT } from '../../utils/exportExcel';
import { buildReportCharts, chartSvg } from '../../utils/reportCharts';

const frDate = (iso) => String(iso).slice(0, 10).split('-').reverse().join('/');

function formatCell(value, type) {
  if (value === null || value === undefined || value === '') return '—';
  if (type === 'date') return frDate(value);
  if (type === 'pct') return `${Number(value).toFixed(1)} %`;
  if (type === 'dec') return Number(value).toFixed(2);
  if (type === 'int') return Number(value).toLocaleString('fr-FR');
  return String(value);
}

const alignOf = (type) => (['int', 'dec', 'pct'].includes(type) ? 'text-right tabular-nums' : type === 'date' ? 'text-center' : 'text-left');

/**
 * Document de rapport : A4 paysage, en-tête avec logos et titre de l'analyse, pied de page
 * « Vérifié par : AGES COORDINATEUR » / « SAG EDUCATION PROJECT » répétés à chaque page imprimée.
 */
const RapportDocument = forwardRef(function RapportDocument({ report }, ref) {
  const generated = new Date();
  const charts = useMemo(() => buildReportCharts(report), [report]);
  return (
    <article ref={ref} className="print-page mx-auto w-[277mm] bg-white text-[10px] text-black shadow-sm ring-1 ring-slate-200" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <table className="w-full border-collapse">
        <thead style={{ display: 'table-header-group' }}>
          <tr><td className="pb-2">
            <div className="grid grid-cols-[48mm_1fr_58mm] items-center gap-3">
              <img src={logoSag} alt="SAG — AngloGold Ashanti" className="h-[19mm] w-auto object-contain object-left" />
              <div className="text-center">
                <p className="rounded-sm bg-[#1F1F20] px-3 py-1 text-[14px] font-extrabold tracking-wide text-[#F5D482]">Siguiri Education Project</p>
                <p className="mt-1 text-[10px] font-bold">SAG French Numeracy and Literacy – Employees Education Attendance &amp; Reporting</p>
              </div>
              <img src={logoAges} alt="AGES" className="ml-auto h-[19mm] w-auto object-contain object-right" />
            </div>
            <div className="mt-2 border-y-2 border-[#A97324] py-1.5 text-center">
              <h1 className="text-[15px] font-extrabold uppercase tracking-wide">{report.titre}</h1>
              <p className="mt-0.5 text-[10px] text-slate-700">
                {report.categorie_libelle}{report.periode ? ` · ${report.periode.libelle}` : ''}
                {report.filtres?.length ? ` · ${report.filtres.map((item) => `${item.label} : ${item.value}`).join(' · ')}` : ''}
              </p>
            </div>
          </td></tr>
        </thead>

        <tfoot style={{ display: 'table-footer-group' }}>
          <tr><td className="pt-3">
            <div className="flex items-end justify-between border-t border-slate-500 pt-1.5 text-[10px]">
              <p>{FOOTER_LEFT.replace('AGES COORDINATEUR', '')}<strong>AGES COORDINATEUR</strong></p>
              <p className="text-[8px] text-slate-500">Édité le {generated.toLocaleDateString('fr-FR')} à {generated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
              <p className="font-extrabold tracking-wide">{FOOTER_RIGHT}</p>
            </div>
          </td></tr>
        </tfoot>

        <tbody>
          <tr><td>
            {report.resume?.length > 0 && (
              <div className="mb-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(report.resume.length, 6)}, minmax(0, 1fr))` }}>
                {report.resume.slice(0, 6).map((item) => (
                  <div key={item.label} className="border border-slate-400 text-center">
                    <p className="bg-slate-100 px-1 py-0.5 text-[8px] font-bold uppercase text-slate-600">{item.label}</p>
                    <p className="px-1 py-1 text-[13px] font-extrabold text-[#A97324]">{String(item.value)}</p>
                  </div>
                ))}
              </div>
            )}

            {report.sections.map((section, index) => (
              <section key={`${section.titre}-${index}`} className="mb-4">
                {section.titre && <h2 className="bg-[#A97324] px-2 py-1 text-[10.5px] font-bold uppercase text-white" style={{ breakAfter: 'avoid' }}>{section.titre}</h2>}
                <table className="w-full border-collapse text-[9px]">
                  <thead style={{ display: 'table-header-group' }}>
                    <tr>{section.colonnes.map((column) => <th key={column.key} className="border border-slate-600 bg-slate-100 px-1.5 py-1 text-center text-[8.5px] font-bold uppercase leading-tight">{column.label}</th>)}</tr>
                  </thead>
                  <tbody>
                    {section.lignes.map((line, lineIndex) => (
                      <tr key={lineIndex} style={{ breakInside: 'avoid' }} className={lineIndex % 2 ? 'bg-slate-50' : ''}>
                        {section.colonnes.map((column) => <td key={column.key} className={`border border-slate-500 px-1.5 py-[3px] align-middle ${alignOf(column.type)}`}>{formatCell(line[column.key], column.type)}</td>)}
                      </tr>
                    ))}
                    {!section.lignes.length && <tr><td colSpan={section.colonnes.length} className="border border-slate-500 px-2 py-3 text-center italic text-slate-500">Aucune donnée pour ces filtres.</td></tr>}
                  </tbody>
                </table>
              </section>
            ))}

            {charts.length > 0 && (
              <section aria-label="Visualisation des données" style={{ breakBefore: 'page', pageBreakBefore: 'always' }}>
                <h2 className="bg-[#A97324] px-2 py-1 text-[10.5px] font-bold uppercase text-white">Visualisation des données</h2>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  {charts.map((chart) => (
                    <figure key={chart.kind} className={`m-0 border border-slate-300 ${chart.kind === 'stacked' ? 'col-span-2' : ''}`} style={{ breakInside: 'avoid' }}
                      dangerouslySetInnerHTML={{ __html: chartSvg(chart, { width: chart.kind === 'stacked' ? 1140 : 560, height: chart.kind === 'stacked' ? 250 : 270, responsive: true }) }} />
                  ))}
                </div>
              </section>
            )}
          </td></tr>
        </tbody>
      </table>
    </article>
  );
});

export default RapportDocument;
