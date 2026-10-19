import { AlertCircle, ArrowRight, Check, ChevronRight, Lightbulb, Lock, X } from 'lucide-react';
import { PERMISSION_LABELS } from './featureModel';
import RequirementList from './RequirementList';

const Section = ({ title, children }) => (
  <section className="space-y-2">
    <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">{title}</h3>
    {children}
  </section>
);

/**
 * Fiche d'aide détaillée : chemin de navigation, étapes, prérequis (avec état réel), actions
 * disponibles et leurs permissions, règles à connaître, erreurs fréquentes, fonctionnalités liées.
 */
export default function FeatureSheet({ feature, catalog, currentUser, onNavigate, onSelect, onClose, errorHits = [] }) {
  const related = (feature.related || []).map((id) => catalog.features.find((item) => item.id === id)).filter(Boolean);
  const errors = errorHits.length ? errorHits : [];
  const moduleErrors = (feature.errors || []).filter((error) => !errors.includes(error)).slice(0, 6);
  const open = () => onNavigate(feature.moduleId, feature.tabId || null);

  return (
    <article className="flex h-full min-h-0 flex-col bg-white" aria-label={`Fiche : ${feature.title}`}>
      <header className="border-b border-slate-200 bg-slate-50 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <nav aria-label="Chemin de navigation" className="flex min-w-0 flex-wrap items-center gap-1 text-[11px] font-semibold text-brand-gold">
            {feature.path.map((part, index) => (
              <span key={`${part}-${index}`} className="inline-flex items-center gap-1">
                {index > 0 && <ChevronRight className="h-3 w-3 text-slate-400" />}{part}
              </span>
            ))}
          </nav>
          {onClose && <button type="button" onClick={onClose} aria-label="Fermer la fiche" className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-slate-200"><X className="h-4 w-4" /></button>}
        </div>
        <h2 className="mt-2 text-lg font-bold text-slate-900">{feature.title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">{feature.summary}</p>
        {!feature.documented && <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-900">Fiche générée automatiquement à partir du code : aucun texte rédactionnel n’a encore été écrit pour cette fonctionnalité.</p>}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {feature.allowed ? (
            <button type="button" onClick={open} className="inline-flex items-center gap-2 rounded-xl bg-brand-charcoal px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-gold">
              Accéder à cette fonctionnalité <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <p className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"><Lock className="h-4 w-4" /> Votre rôle n’autorise pas cette fonctionnalité{feature.permission ? ` (permission « ${PERMISSION_LABELS[feature.permission]} » requise)` : ''}. Demandez-la à un administrateur.</p>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 sm:p-5">
        {feature.steps.length > 0 && (
          <Section title="Étapes à suivre">
            <ol className="space-y-2">
              {feature.steps.map((step, index) => (
                <li key={step} className="flex gap-3 text-sm text-slate-700">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-gold-light/60 text-xs font-bold text-brand-bordeaux">{index + 1}</span>
                  <span className="pt-0.5 leading-6">{step}</span>
                </li>
              ))}
            </ol>
          </Section>
        )}

        {feature.type !== 'module' && (
          <Section title="Prérequis et dépendances">
            <RequirementList ids={feature.requires} currentUser={currentUser} catalog={catalog} onNavigate={onNavigate} />
          </Section>
        )}

        {feature.actions?.length > 0 && (
          <Section title="Actions disponibles dans cet écran">
            <ul className="grid gap-2 sm:grid-cols-2">
              {feature.actions.map((action) => (
                <li key={action.label} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <span className="min-w-0 truncate font-medium text-slate-800">{action.label}</span>
                  <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${action.allowed ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                    {action.allowed ? <Check className="h-3 w-3" /> : <Lock className="h-3 w-3" />}{PERMISSION_LABELS[action.permission]}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {feature.tips.length > 0 && (
          <Section title="Règles à connaître">
            <ul className="space-y-1.5">
              {feature.tips.map((tip) => (
                <li key={tip} className="flex gap-2 text-sm leading-6 text-slate-700"><Lightbulb className="mt-1 h-3.5 w-3.5 shrink-0 text-brand-gold" />{tip}</li>
              ))}
            </ul>
          </Section>
        )}

        {(errors.length > 0 || moduleErrors.length > 0) && (
          <Section title="Erreurs fréquentes">
            <ul className="space-y-1.5">
              {[...errors, ...moduleErrors].map((error) => (
                <li key={error.message} className="flex gap-2 rounded-lg bg-red-50/60 px-3 py-2 text-sm leading-5 text-red-900"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{error.message}</li>
              ))}
            </ul>
            <p className="text-[11px] text-slate-500">Messages renvoyés par le serveur, relevés automatiquement dans le code du backend.</p>
          </Section>
        )}

        {related.length > 0 && (
          <Section title="Fonctionnalités associées">
            <div className="flex flex-wrap gap-2">
              {related.map((item) => (
                <button key={item.id} type="button" onClick={() => onSelect(item)} className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-brand-gold hover:text-brand-gold">
                  {item.path.join(' › ')}
                </button>
              ))}
            </div>
          </Section>
        )}
      </div>
    </article>
  );
}
