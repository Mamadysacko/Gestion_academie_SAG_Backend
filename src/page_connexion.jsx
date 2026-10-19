import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CalendarCheck,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { authApi } from './config/apiService';
import logoAges from './assets/logo-ages.png';
import logoSag from './assets/logo-sag.png';

const FEATURES = [
  { icon: Users, text: 'Auditeurs, inscriptions et groupes' },
  { icon: CalendarCheck, text: 'Emplois du temps, salles et présences' },
  { icon: ShieldCheck, text: 'Accès sécurisés selon votre rôle' },
];

const INPUT_CLASS = 'w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-gold focus:ring-4 focus:ring-brand-gold-light/40';

const PageConnexion = ({ onLoginSuccess }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    usernameOrEmail: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errorMessage) setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.usernameOrEmail || !formData.password) {
      setErrorMessage('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    setLoading(true);
    try {
      // Authentification via le service API centralisé → Backend_AGES
      const result = await authApi.login({
        email: formData.usernameOrEmail.trim(),
        password: formData.password,
      });

      const user = result.data;
      if (!result.success || !user) {
        setErrorMessage(result.message || 'Identifiants incorrects ou rôle non autorisé.');
        return;
      }

      if (onLoginSuccess) {
        onLoginSuccess({ ...user, role: user.role_code });
      }
    } catch (err) {
      console.error('Erreur API:', err);
      setErrorMessage(err.message || 'Impossible de contacter le serveur. Vérifiez qu\'Apache et MySQL sont actifs dans XAMPP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 p-3 sm:p-6">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-gold-light/40 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-brand-gold/20 blur-3xl" aria-hidden="true" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 lg:grid-cols-[1.05fr_1fr]"
      >
        {/* Panneau de marque */}
        <div className="relative flex flex-col justify-between gap-8 overflow-hidden bg-gradient-to-br from-brand-charcoal via-slate-800 to-brand-bordeaux p-6 text-white sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-brand-gold/25 blur-3xl" aria-hidden="true" />
          <span className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-brand-gold via-brand-gold-light to-brand-gold" aria-hidden="true" />

          <div className="relative">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-16 items-center rounded-2xl bg-white px-3 shadow-lg ring-1 ring-brand-gold/50">
                <img src={logoAges} alt="AGES — Entreprise Albert Global Services" className="h-12 w-auto object-contain" />
              </div>
              <div className="flex h-16 w-40 items-center overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-brand-gold/50">
                <img src={logoSag} alt="Société AngloGold Ashanti de Guinée — SAG" className="w-full object-cover" />
              </div>
            </div>

            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.22em] text-brand-gold-light">Siguiri Education Project</p>
            <h2 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">Gestion de l’Académie</h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-slate-300">
              Plateforme de suivi de la formation en numératie et alphabétisation en français des employés : inscriptions, présences, évaluations et rapports.
            </p>

            <ul className="mt-6 hidden space-y-3 sm:block">
              {FEATURES.map(({ icon: Icon, text }, index) => (
                <motion.li
                  key={text}
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + index * 0.1 }}
                  className="flex items-center gap-3 text-sm text-slate-200"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gold/20 text-brand-gold-light ring-1 ring-brand-gold/40"><Icon className="h-4 w-4" /></span>
                  {text}
                </motion.li>
              ))}
            </ul>
          </div>

          <p className="relative text-xs text-slate-400">
            © {new Date().getFullYear()} AGES · Entreprise Albert Global Services — SAG Education Project
          </p>
        </div>

        {/* Formulaire */}
        <div className="flex flex-col justify-center p-6 sm:p-10 lg:p-12">
          <div className="mb-7">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-gold/40 bg-brand-gold-light/30 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-gold">
              <Lock className="h-3 w-3" /> Espace sécurisé
            </span>
            <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">Connexion</h1>
            <p className="mt-1 text-sm text-slate-500">
              Utilisez le compte attribué par votre établissement. Vos accès dépendent du rôle de ce compte.
            </p>
          </div>

          {errorMessage && (
            <motion.div
              role="alert"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {errorMessage}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="usernameOrEmail" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Email ou téléphone enregistré
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="usernameOrEmail"
                  type="text"
                  name="usernameOrEmail"
                  required
                  autoComplete="username"
                  value={formData.usernameOrEmail}
                  onChange={handleInputChange}
                  placeholder="ex: admin@gmail.com ou 621000001"
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  className={`${INPUT_CLASS} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-brand-gold"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.98 }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-charcoal to-slate-700 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-charcoal/20 transition hover:from-brand-gold hover:to-brand-anglo disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
                  Vérification en cours…
                </>
              ) : (
                <>
                  Se connecter
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </motion.button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-400">
            Connexion sécurisée · Les droits sont chargés depuis votre rôle
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default PageConnexion;
