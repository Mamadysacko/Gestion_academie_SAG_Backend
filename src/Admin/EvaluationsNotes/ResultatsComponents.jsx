import { RESULT_LABELS } from './resultatsHelpers';

const APPRECIATION_TONES = {
  1: 'border-rose-200 bg-rose-50 text-rose-800',
  2: 'border-amber-200 bg-amber-50 text-amber-800',
  3: 'border-sky-200 bg-sky-50 text-sky-800',
  4: 'border-emerald-200 bg-emerald-50 text-emerald-800',
};

const RESULT_TONES = {
  admis: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  non_admis: 'border-rose-200 bg-rose-50 text-rose-800',
  en_attente: 'border-slate-200 bg-slate-50 text-slate-600',
  abandonne: 'border-slate-300 bg-slate-100 text-slate-700',
};

/** Appréciation 1 à 4 (ex. « 3 · Bien »). */
export function AppreciationBadge({ appreciation, compact = false }) {
  if (!appreciation) return <span className="text-xs text-slate-400">—</span>;
  return (
    <span title={`Appréciation ${appreciation.note}/4 · ${appreciation.libelle}`} className={`inline-flex items-center gap-1 whitespace-nowrap border px-1.5 py-0.5 text-[10px] font-bold ${APPRECIATION_TONES[appreciation.note] || APPRECIATION_TONES[1]}`}>
      <span className="tabular-nums">{appreciation.note}/4</span>{!compact && <span className="font-semibold">· {appreciation.libelle}</span>}
    </span>
  );
}

export function ResultBadge({ resultat, motif }) {
  return <span title={motif || undefined} className={`inline-flex whitespace-nowrap border px-2 py-0.5 text-[10px] font-bold ${RESULT_TONES[resultat] || RESULT_TONES.en_attente}`}>{RESULT_LABELS[resultat] || resultat}</span>;
}

/** Barre « notes saisies / attendues ». */
export function ProgressBar({ done, total }) {
  const rate = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="min-w-24">
      <div className="h-1.5 bg-slate-100"><div className={`h-1.5 ${rate === 100 ? 'bg-emerald-600' : 'bg-amber-500'}`} style={{ width: `${rate}%` }} /></div>
      <p className="mt-1 text-[10px] tabular-nums text-slate-500">{done}/{total} notes</p>
    </div>
  );
}
