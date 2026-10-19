import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, CircleDashed, Lock, ShieldQuestion } from 'lucide-react';
import manifest from 'virtual:ages-features';
import { CHECKS } from '../../aide/dependencies';
import { useRequirements } from '../../aide/useRequirements';
import { hasPermission } from '../../aide/featureModel';
import { useAppNavigate } from '../../composant/navContext';
import { REQUIRED_MODULE, WHERE, buildConfigSteps } from './configModel';

const CHIP = {
  done: { label: 'Terminé', icon: CheckCircle2, classes: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  todo: { label: 'À configurer', icon: CircleDashed, classes: 'border-amber-300 bg-amber-50 text-amber-900' },
  blocked: { label: 'Bloqué', icon: Lock, classes: 'border-red-200 bg-red-50 text-red-800' },
  unknown: { label: 'Non vérifiable', icon: ShieldQuestion, classes: 'border-slate-200 bg-slate-100 text-slate-600' },
};

export default function Configuration({ currentUser, onOpenTab }) {
  const navigate = useAppNavigate();
  const steps = useMemo(() => buildConfigSteps(manifest.schema), []);
  const { statuses, loading } = useRequirements(steps.map((step) => step.id), currentUser);

  const rows = steps.map((step) => {
    const state = statuses[step.id]?.state;
    const blockers = step.parents.filter((parent) => ['missing', 'partial'].includes(statuses[parent]?.state));
    let status = 'unknown';
    if (state === 'ok') status = 'done';
    else if (state === 'missing' || state === 'partial') status = blockers.length ? 'blocked' : 'todo';
    return { ...step, state, status, blockers, detail: statuses[step.id]?.detail };
  });

  const labelOf = (id) => CHECKS[id]?.label || id;
  const done = rows.filter((row) => row.status === 'done').length;
  const next = rows.find((row) => row.status === 'todo');
  const open = (id) => {
    const where = WHERE[id];
    if (!where) return;
    if (where.tab) onOpenTab(where.tab);
    else navigate(where.module, where.sub);
  };
  const canOpen = (id) => {
    const where = WHERE[id];
    if (!where) return false;
    return where.tab ? hasPermission(currentUser, 'parametres') || hasPermission(currentUser, 'organisation-pedagogique') : hasPermission(currentUser, REQUIRED_MODULE[id] || where.module);
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Configuration de l’académie</h2>
            <p className="mt-1 text-sm text-slate-600">Les éléments sont rangés dans l’ordre réel de leurs dépendances, lu dans le schéma de la base : chaque étape ne devient possible qu’une fois celles qui la précèdent terminées.</p>
          </div>
          {!loading && <p className="shrink-0 text-2xl font-bold tabular-nums text-brand-gold">{done}<span className="text-base text-slate-400"> / {rows.length}</span></p>}
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={rows.length} aria-valuenow={done} aria-label="Progression de la configuration">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-brand-gold to-brand-gold-light" initial={false} animate={{ width: `${rows.length ? (done / rows.length) * 100 : 0}%` }} transition={{ duration: 0.5 }} />
        </div>
        {!loading && next && canOpen(next.id) && (
          <div className="mt-4 flex flex-col gap-2 rounded-xl border border-brand-gold/50 bg-brand-gold-light/25 p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-800"><strong>Prochaine étape recommandée :</strong> {labelOf(next.id)}</p>
            <button type="button" onClick={() => open(next.id)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-charcoal px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-gold">Configurer maintenant <ArrowRight className="h-4 w-4" /></button>
          </div>
        )}
        {!loading && !next && done === rows.length && <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-emerald-800"><CheckCircle2 className="h-4 w-4" />Toute la configuration est en place.</p>}
      </section>

      <ol className="space-y-3">
        {rows.map((row, index) => {
          const chip = CHIP[row.status];
          const Icon = chip.icon;
          const allowed = canOpen(row.id);
          return (
            <li key={row.id} className={`rounded-2xl border bg-white p-4 shadow-sm ${row.status === 'todo' ? 'border-brand-gold/60' : 'border-slate-200'}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${row.status === 'done' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>{row.status === 'done' ? <CheckCircle2 className="h-4 w-4" /> : index + 1}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">{labelOf(row.id)}</p>
                    <p className="text-xs text-slate-500">{row.detail || 'Vérification…'}</p>
                    {row.status === 'blocked' && (
                      <p className="mt-1 text-xs font-semibold text-red-800">Nécessite d’abord : {row.blockers.map(labelOf).join(', ')}</p>
                    )}
                    {row.parents.length > 0 && row.status !== 'blocked' && <p className="mt-0.5 text-[11px] text-slate-400">Dépend de : {row.parents.map(labelOf).join(', ')}</p>}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${chip.classes}`}><Icon className="h-3.5 w-3.5" />{chip.label}</span>
                  {row.status === 'blocked' ? (
                    row.blockers.slice(0, 2).map((blocker) => canOpen(blocker) && (
                      <button key={blocker} type="button" onClick={() => open(blocker)} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition hover:border-brand-gold hover:text-brand-gold">
                        Commencer par : {labelOf(blocker)} <ArrowRight className="h-3 w-3" />
                      </button>
                    ))
                  ) : allowed ? (
                    <button type="button" onClick={() => open(row.id)} className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${row.status === 'done' ? 'border border-slate-300 bg-white text-slate-800 hover:border-brand-gold hover:text-brand-gold' : 'bg-brand-charcoal text-white hover:bg-brand-gold'}`}>
                      {row.status === 'done' ? 'Consulter / modifier' : 'Configurer'} <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  ) : <span className="text-[11px] text-slate-500">Droits insuffisants</span>}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
