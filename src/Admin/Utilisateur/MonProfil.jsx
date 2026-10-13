import { useEffect, useState } from 'react';
import { ArrowLeft, KeyRound, Save, UserRound } from 'lucide-react';
import { authApi } from '../../config/apiService';
import { useLanguage } from '../../i18n/useLanguage';
import { useToastNotice } from '../../composant/toastContext';

const EMPTY_PASSWORDS = { current_password: '', new_password: '', confirm_password: '' };
const asDate = (value, language) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

export default function MonProfil({ currentUser, onBack, onUserUpdated }) {
  const { language, t } = useLanguage();
  const [profile, setProfile] = useState(currentUser || {});
  const [form, setForm] = useState({
    nom: currentUser?.nom || '',
    prenom: currentUser?.prenom || '',
    email: currentUser?.email || '',
    telephone: currentUser?.telephone || '',
  });
  const [passwords, setPasswords] = useState(EMPTY_PASSWORDS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useToastNotice();

  useEffect(() => {
    let active = true;
    authApi.getProfile()
      .then((response) => {
        if (!active) return;
        const data = response?.data;
        if (!data) throw new Error(t('profileLoadError'));
        setProfile(data);
        setForm({
          nom: data.nom || '',
          prenom: data.prenom || '',
          email: data.email || '',
          telephone: data.telephone || '',
        });
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || t('profileLoadError'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [t]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (passwords.new_password && passwords.new_password.length < 8) {
      setError(t('passwordTooShort'));
      return;
    }
    if (passwords.new_password !== passwords.confirm_password) {
      setError(t('passwordMismatch'));
      return;
    }
    if (passwords.new_password && !passwords.current_password) {
      setError(t('passwordRequiredWithNew'));
      return;
    }

    const payload = { ...form };
    if (passwords.new_password) {
      payload.current_password = passwords.current_password;
      payload.new_password = passwords.new_password;
    }
    setSaving(true);
    try {
      const response = await authApi.updateProfile(payload);
      if (!response?.data) throw new Error(response?.error || t('profileLoadError'));
      setProfile(response.data);
      setForm({
        nom: response.data.nom || '',
        prenom: response.data.prenom || '',
        email: response.data.email || '',
        telephone: response.data.telephone || '',
      });
      onUserUpdated?.({ ...response.data, role: response.data.role_code });
      setPasswords(EMPTY_PASSWORDS);
      setNotice(t('profileSaved'));
    } catch (saveError) {
      setError(saveError.message || t('profileLoadError'));
    } finally {
      setSaving(false);
    }
  };

  const textField = (field, labelKey, type = 'text') => (
    <label key={field} className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-700">{t(labelKey)}</span>
      <input
        type={type}
        required={field === 'nom' || field === 'prenom'}
        value={form[field]}
        onChange={(event) => setForm((value) => ({ ...value, [field]: event.target.value }))}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
      />
    </label>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="border-b border-slate-200 pb-5">
        <button type="button" onClick={onBack} className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800 hover:text-teal-950">
          <ArrowLeft className="h-3.5 w-3.5" /> {t('backToDashboard')}
        </button>
        <h1 className="text-2xl font-bold text-slate-900">{t('profile')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('personalInformation')}</p>
      </header>

      {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
      {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-4">
          <span className="rounded-lg bg-teal-50 p-2 text-teal-700"><UserRound className="h-4 w-4" /></span>
          <div>
            <h2 className="text-sm font-bold text-slate-900">{t('accountInformation')}</h2>
            <p className="text-xs text-slate-500">{profile.role_nom || profile.role_code || '—'}</p>
          </div>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [t('userId'), profile.id],
            [t('role'), profile.role_nom || profile.role_code],
            [t('trainerId'), profile.formateur_matricule],
            [t('accountStatus'), Number(profile.actif) === 1 ? t('active') : t('inactive')],
            [t('lastLogin'), asDate(profile.last_login, language)],
            [t('createdAt'), asDate(profile.created_at, language)],
            [t('updatedAt'), asDate(profile.updated_at, language)],
          ].filter(([, value]) => value).map(([label, value]) => (
            <div key={label} className="rounded-lg border border-slate-100 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
              <p className="mt-1 break-words text-xs font-semibold text-slate-800">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-sm font-bold text-slate-900">{t('personalInformation')}</h2>
          <p className="mt-1 text-xs text-slate-500">{t('profileEditHint')}</p>
        </div>
        {loading ? (
          <p role="status" className="py-5 text-sm text-slate-500">{t('loading')}</p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              {textField('prenom', 'firstName')}
              {textField('nom', 'lastName')}
              {textField('email', 'email', 'email')}
              {textField('telephone', 'phone', 'tel')}
            </div>
            <section className="space-y-4 border-t border-slate-100 pt-5">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-slate-500" />
                <h3 className="text-sm font-bold text-slate-900">{t('newPassword')}</h3>
              </div>
              <p className="text-xs text-slate-500">{t('passwordChangeHint')}</p>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  ['current_password', 'currentPassword'],
                  ['new_password', 'newPassword'],
                  ['confirm_password', 'confirmPassword'],
                ].map(([field, labelKey]) => (
                  <label key={field} className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-slate-700">{t(labelKey)}</span>
                    <input
                      type="password"
                      autoComplete={field === 'current_password' ? 'current-password' : 'new-password'}
                      value={passwords[field]}
                      onChange={(event) => setPasswords((value) => ({ ...value, [field]: event.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                    />
                  </label>
                ))}
              </div>
            </section>
            <div className="flex justify-end border-t border-slate-100 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-teal-800 disabled:cursor-wait disabled:opacity-60"
              >
                <Save className="h-4 w-4" /> {saving ? t('loading') : t('saveChanges')}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
