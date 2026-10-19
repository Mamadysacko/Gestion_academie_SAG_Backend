import { AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import manifest from 'virtual:ages-features';
import { useAppNavigate } from '../composant/navContext';

/**
 * Bandeau de prérequis : n'apparaît que s'il manque quelque chose. Chaque élément manquant a son
 * bouton d'accès direct (si l'utilisateur a le droit d'ouvrir l'écran qui le crée).
 * `prerequisites` : résultat de usePrerequisites, pour partager le calcul avec les boutons à bloquer.
 */
export default function PrerequisiteBanner({ prerequisites, action = 'cette opération' }) {
  const navigate = useAppNavigate();
  // Écran d'origine, pour proposer le retour une fois le prérequis complété.
  const [originModule, originTab = null] = prerequisites.featureId.split('/');
  const originLabel = manifest.modules[originModule]?.subtabs.find((subtab) => subtab.id === originTab)?.label || null;
  const returnTo = { featureId: prerequisites.featureId, moduleId: originModule, tabId: originTab, label: originLabel || action };
  const missing = prerequisites.items.filter((item) => item.state === 'missing' || item.state === 'partial');
  if (prerequisites.loading || !missing.length) return null;
  return (
    <section role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm">
      <p className="flex items-start gap-2 text-sm font-bold text-amber-950">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        Bloqué : {missing.length} prérequis à compléter avant {action}.
      </p>
      <ul className="mt-3 space-y-2">
        {missing.map((item) => (
          <li key={item.id} className="flex flex-col gap-2 rounded-xl bg-white p-3 ring-1 ring-amber-200 sm:flex-row sm:items-center sm:justify-between">
            <span className="min-w-0 text-sm text-slate-800"><strong>{item.label}</strong> — {item.detail}</span>
            {item.fix ? (
              <button type="button" onClick={() => navigate(item.fix.moduleId, item.fix.tabId || null, { action: item.fix.action, returnTo })} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-brand-charcoal px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-gold">
                {item.state === 'missing' && !item.completesExisting ? 'Créer maintenant' : 'Compléter maintenant'} <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : <span className="text-xs text-slate-500">Demandez à un administrateur de le configurer.</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Pastille discrète « tout est prêt », à afficher si l'on veut rassurer l'utilisateur. */
export function PrerequisitesReady({ prerequisites }) {
  if (prerequisites.loading || prerequisites.blocked || !prerequisites.items.length) return null;
  return <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800"><CheckCircle2 className="h-4 w-4" />Prérequis réunis</p>;
}
