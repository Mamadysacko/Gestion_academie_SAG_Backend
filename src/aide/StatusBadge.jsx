import { AlertTriangle, CheckCircle2, CircleHelp, XCircle } from 'lucide-react';
import { STATE_LABELS } from './dependencies';

const STYLES = {
  ok: { icon: CheckCircle2, classes: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  partial: { icon: AlertTriangle, classes: 'border-amber-200 bg-amber-50 text-amber-900' },
  missing: { icon: XCircle, classes: 'border-red-200 bg-red-50 text-red-800' },
  unknown: { icon: CircleHelp, classes: 'border-slate-200 bg-slate-100 text-slate-600' },
};

/** Pastille d'état d'un prérequis : Disponible / À compléter / Manquant / Non vérifiable. */
export default function StatusBadge({ state, loading = false }) {
  if (loading) return <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-400">Vérification…</span>;
  const { icon: Icon, classes } = STYLES[state] || STYLES.unknown;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${classes}`}>
      <Icon className="h-3 w-3" />{STATE_LABELS[state] || STATE_LABELS.unknown}
    </span>
  );
}
