import { ArrowRight } from 'lucide-react';
import { CHECKS, parseTarget } from './dependencies';
import { useRequirements } from './useRequirements';
import StatusBadge from './StatusBadge';

/**
 * Liste des prérequis d'une fonctionnalité avec leur état réel.
 * Quand un prérequis manque, propose un lien direct vers l'écran qui permet de le créer — seulement
 * si l'utilisateur a le droit de le consulter (l'aide ne contourne jamais les permissions).
 */
export default function RequirementList({ ids, currentUser, catalog, onNavigate, compact = false }) {
  const { statuses, loading } = useRequirements(ids, currentUser);
  if (!ids.length) return <p className="text-sm text-slate-500">Aucun prérequis : cette fonctionnalité peut être utilisée directement.</p>;

  const missingCount = ids.filter((id) => ['missing', 'partial'].includes(statuses[id]?.state)).length;
  return (
    <div>
      {!loading && (
        <p className={`mb-2 text-xs font-semibold ${missingCount ? 'text-amber-800' : 'text-emerald-800'}`}>
          {missingCount ? `${missingCount} prérequis à traiter avant de commencer.` : 'Tous les prérequis vérifiables sont réunis.'}
        </p>
      )}
      <ul className="space-y-2">
        {ids.map((id) => {
          const check = CHECKS[id];
          const status = statuses[id];
          const target = parseTarget(status?.target || check?.create);
          const fix = target ? catalog.features.find((feature) => feature.id === `${target.moduleId}/${target.tabId}` || feature.id === target.moduleId) : null;
          const needsAction = status && ['missing', 'partial'].includes(status.state);
          return (
            <li key={id} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">{check?.label || id}</p>
                {!compact && <p className="mt-0.5 text-xs text-slate-500">{status?.detail || ' '}</p>}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <StatusBadge state={status?.state} loading={!status} />
                {needsAction && fix?.allowed && (
                  <button type="button" onClick={() => onNavigate(fix.moduleId, fix.tabId, { action: target.action })} className="inline-flex items-center gap-1 rounded-lg bg-brand-charcoal px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-brand-gold">
                    {status.state === 'missing' ? 'Créer' : 'Compléter'} <ArrowRight className="h-3 w-3" />
                  </button>
                )}
                {needsAction && fix && !fix.allowed && <span className="text-[11px] text-slate-500">Droits insuffisants : voir un administrateur.</span>}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
