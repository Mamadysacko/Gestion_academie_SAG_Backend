import { ArrowRight, Check, Circle, Lock } from 'lucide-react';
import { CHECKS } from './dependencies';
import { useRequirements } from './useRequirements';
import StatusBadge from './StatusBadge';

/**
 * Parcours guidé : étapes dans l'ordre recommandé, avec l'état réel de chacune
 * (déjà configurée, à compléter, manquante) et la prochaine action recommandée.
 */
export default function JourneyView({ journey, catalog, currentUser, onNavigate }) {
  const checkIds = journey.steps.map((step) => step.check).filter(Boolean);
  const { statuses, loading } = useRequirements(checkIds, currentUser);

  const stateOf = (step) => (step.check ? statuses[step.check]?.state : undefined);
  const nextIndex = journey.steps.findIndex((step) => {
    const state = stateOf(step);
    return state === 'missing' || state === 'partial';
  });
  const done = journey.steps.filter((step) => stateOf(step) === 'ok').length;
  const verifiable = journey.steps.filter((step) => step.check && stateOf(step) && stateOf(step) !== 'unknown').length;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-label={journey.title}>
      <h3 className="text-base font-bold text-slate-900">{journey.title}</h3>
      <p className="mt-1 text-sm text-slate-600">{journey.summary}</p>
      {!loading && verifiable > 0 && (
        <div className="mt-3">
          <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={journey.steps.length} aria-valuenow={done}>
            <div className="h-full rounded-full bg-gradient-to-r from-brand-gold to-brand-gold-light transition-all" style={{ width: `${(done / journey.steps.length) * 100}%` }} />
          </div>
          <p className="mt-1 text-xs text-slate-500">{done} étape(s) déjà en place sur {journey.steps.length}.</p>
        </div>
      )}

      <ol className="mt-4 space-y-2">
        {journey.steps.map((step, index) => {
          const feature = catalog.features.find((item) => item.id === step.feature);
          const state = stateOf(step);
          const isNext = index === nextIndex;
          return (
            <li key={`${step.feature}-${step.check || index}`} className={`rounded-xl border p-3 ${isNext ? 'border-brand-gold bg-brand-gold-light/20' : 'border-slate-200'}`}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${state === 'ok' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                    {state === 'ok' ? <Check className="h-3.5 w-3.5" /> : index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                    <p className="text-xs text-slate-500">{feature?.path.join(' › ')}{step.check ? ` · ${CHECKS[step.check]?.label}` : ''}</p>
                    {isNext && <p className="mt-1 text-xs font-bold text-brand-bordeaux">Prochaine action recommandée</p>}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {step.check ? <StatusBadge state={state} loading={!state} /> : <span className="inline-flex items-center gap-1 text-[11px] text-slate-400"><Circle className="h-3 w-3" />Non vérifiable automatiquement</span>}
                  {step.allowed ? (
                    <button type="button" onClick={() => onNavigate(feature.moduleId, feature.tabId || null)} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:border-brand-gold hover:text-brand-gold">
                      Ouvrir <ArrowRight className="h-3 w-3" />
                    </button>
                  ) : <span className="inline-flex items-center gap-1 text-[11px] text-slate-500"><Lock className="h-3 w-3" />Droits requis</span>}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
