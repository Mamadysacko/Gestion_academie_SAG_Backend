import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, pageCount, total, size, setPage, setSize }) {
  if (total <= 10) return null;
  const from = (page - 1) * size + 1;
  const to = Math.min(total, page * size);
  const btn = 'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-brand-gold hover:text-brand-gold disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:text-slate-600 print:hidden';
  return (
    <nav aria-label="Pagination" className="flex flex-col items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-xs text-slate-600 sm:flex-row print:hidden">
      <p>
        <strong className="tabular-nums text-slate-800">{from}–{to}</strong> sur <strong className="tabular-nums text-slate-800">{total}</strong>
      </p>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5">
          Lignes
          <select value={size} onChange={(event) => setSize(Number(event.target.value))} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs">
            {[10, 25, 50, 100].map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => setPage(1)} disabled={page === 1} aria-label="Première page" className={btn}>«</button>
        <button type="button" onClick={() => setPage(page - 1)} disabled={page === 1} aria-label="Page précédente" className={btn}><ChevronLeft className="h-4 w-4" /></button>
        <span className="min-w-16 text-center font-semibold tabular-nums text-slate-800">{page} / {pageCount}</span>
        <button type="button" onClick={() => setPage(page + 1)} disabled={page === pageCount} aria-label="Page suivante" className={btn}><ChevronRight className="h-4 w-4" /></button>
        <button type="button" onClick={() => setPage(pageCount)} disabled={page === pageCount} aria-label="Dernière page" className={btn}>»</button>
      </div>
    </nav>
  );
}
