import { useEffect, useState } from 'react';
import { CalendarDays, Clock3 } from 'lucide-react';
import { useLanguage } from '../i18n/useLanguage';

/**
 * Date et heure du jour, mises à jour chaque seconde. Placée dans la barre supérieure,
 * elle reste toujours au même endroit de l'écran.
 */
export default function LiveClock({ className = '' }) {
  const { language } = useLanguage();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const locale = language === 'en' ? 'en-GB' : 'fr-FR';
  const longDate = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now);
  const shortDate = new Intl.DateTimeFormat(locale, { weekday: 'short', day: '2-digit', month: 'short' }).format(now);
  const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(now);

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-sm ${className}`}
      role="timer"
      aria-live="off"
      aria-label={`${longDate} ${time}`}
    >
      <span className="hidden items-center gap-1.5 text-xs font-medium capitalize text-slate-600 md:inline-flex">
        <CalendarDays className="h-4 w-4 text-brand-gold" />
        <span className="hidden xl:inline">{longDate}</span>
        <span className="xl:hidden">{shortDate}</span>
      </span>
      <span className="hidden h-5 w-px bg-slate-200 md:block" aria-hidden="true" />
      <span className="inline-flex items-center gap-1.5 text-sm font-bold tabular-nums text-brand-charcoal">
        <Clock3 className="h-4 w-4 text-brand-gold" />
        {time}
      </span>
    </div>
  );
}
