import { ArrowLeft, CheckCircle2, X } from 'lucide-react';
import { usePrerequisites } from './usePrerequisites';

/**
 * Barre « retour à la tâche d'origine », affichée quand l'utilisateur est parti compléter un prérequis
 * depuis un écran bloqué. Elle se met à jour en direct : dès que le prérequis est réuni, elle l'annonce
 * et propose de revenir exactement là où le travail était interrompu.
 */
export default function ReturnBar({ returnTo, currentUser, onReturn, onDismiss }) {
  const prerequisites = usePrerequisites(returnTo.featureId, currentUser);
  // Un retour sans prérequis (ex. suite d'un passage de niveau) affiche son propre message.
  const ready = Boolean(returnTo.note) || (!prerequisites.loading && !prerequisites.blocked);
  const remaining = prerequisites.items.filter((item) => item.state === 'missing' || item.state === 'partial').length;

  return (
    <div role="status" className={`flex flex-col gap-2 border-b px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-5 lg:px-8 print:hidden ${ready ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50'}`}>
      <p className={`flex items-center gap-2 text-sm font-semibold ${ready ? 'text-emerald-900' : 'text-amber-950'}`}>
        {ready && <CheckCircle2 className="h-4 w-4 shrink-0" />}
        {returnTo.note
          ? returnTo.note
          : ready
          ? <>Prérequis réunis : vous pouvez revenir à « {returnTo.label} ».</>
          : <>Vous complétez un prérequis pour « {returnTo.label} »{remaining ? ` — il en reste ${remaining}` : ''}.</>}
      </p>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => { onReturn(); onDismiss(); }} className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold text-white transition ${ready ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-brand-charcoal hover:bg-brand-gold'}`}>
          <ArrowLeft className="h-3.5 w-3.5" /> Retourner à « {returnTo.label} »
        </button>
        <button type="button" onClick={onDismiss} aria-label="Masquer ce rappel" className="rounded-lg p-1.5 text-slate-600 hover:bg-white/70"><X className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
