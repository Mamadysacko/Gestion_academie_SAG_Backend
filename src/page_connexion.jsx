import { useState } from 'react';
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight,
  School,
} from 'lucide-react';
import { authApi } from './config/apiService';

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-4">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden grid md:grid-cols-2">
        {/* Panneau gauche : branding + sélection du rôle */}
        <div className="hidden md:flex flex-col justify-between bg-slate-900 text-white p-8">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-white/10 rounded-lg">
                <School className="w-6 h-6" />
              </div>
              <span className="text-xl font-semibold">Académie AGES</span>
            </div>

            <h2 className="text-2xl font-bold mb-2">Bienvenue</h2>
            <p className="text-slate-400 text-sm mb-8">
              Connectez-vous avec le compte attribué par votre établissement. Vos accès sont déterminés par le rôle de ce compte.
            </p>
          </div>
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} Académie AGES System. Connexion Sécurisée BD.
          </p>
        </div>

        {/* Panneau droit : formulaire de connexion BD */}
        <div className="p-8 md:p-12 flex flex-col justify-center">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Connexion Authentifiée</h1>
            <p className="text-sm text-slate-500">
              Vos droits seront chargés depuis votre rôle attribué.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Email ou téléphone enregistré
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  name="usernameOrEmail"
                  required
                  autoComplete="username"
                  value={formData.usernameOrEmail}
                  onChange={handleInputChange}
                  placeholder="ex: admin@gmail.com ou 621000001"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-md"
            >
              {loading ? (
                'Vérification en base de données…'
              ) : (
                <>
                  Se connecter
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PageConnexion;