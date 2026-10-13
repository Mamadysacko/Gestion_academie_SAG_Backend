import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

const COLORS = ['#0d9488', '#2563eb', '#8b5cf6', '#f59e0b', '#f43f5e', '#06b6d4', '#10b981', '#64748b'];

function Segmented({ value, onChange, options, label }) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={`relative rounded-lg px-3 py-1.5 text-xs font-semibold transition ${value === option.value ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}
        >
          {value === option.value && <motion.span layoutId={`seg-${label}`} className="absolute inset-0 rounded-lg bg-white shadow-sm" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
          <span className="relative">{option.label}</span>
        </button>
      ))}
    </div>
  );
}

function Card({ title, subtitle, action, children }) {
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="font-semibold text-slate-900">{title}</h2>{subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}</div>
        {action}
      </div>
      {children}
    </motion.section>
  );
}

const Empty = ({ text }) => <p className="flex h-64 items-center justify-center text-center text-sm text-slate-500">{text}</p>;

const label = (row) => (row.code ? `${row.code}${row.libelle ? ` · ${row.libelle}` : ''}` : row.libelle);

/** Analyses interactives : effectifs, présences (taux de présence / d'absence) et résultats. */
export default function AnalysesTableau({ dashboard }) {
  const [effectifBy, setEffectifBy] = useState('salles');
  const [presenceBy, setPresenceBy] = useState('salle');

  const effectifs = {
    salles: dashboard.repartition_salles || [],
    sessions: dashboard.repartition_sessions || [],
    types: dashboard.repartition_types_employes || [],
    niveaux: dashboard.repartition_niveaux || [],
    groupes: dashboard.repartition_groupes || [],
    departements: dashboard.repartition_departements || [],
  };
  const effectifRows = effectifs[effectifBy].map((row) => ({
    name: label(row), auditeurs: Number(row.auditeurs) || 0, capacite: row.capacite == null ? null : Number(row.capacite),
  }));

  const presenceRows = ({
    salle: dashboard.presence_par_salle,
    groupe: dashboard.presence_par_groupe,
    departement: dashboard.presence_par_departement,
    type: dashboard.presence_par_type_employe,
  }[presenceBy] || []).map((row) => ({
    name: label(row), Présence: row.taux_presence ?? 0, Absence: row.taux_absence ?? 0, pointages: row.total,
  }));

  const results = dashboard.resultats || {};
  const resultPie = [
    { name: 'Admis', value: Number(results.admis) || 0 },
    { name: 'Non admis', value: Number(results.non_admis) || 0 },
    { name: 'En attente', value: Number(results.en_attente) || 0 },
  ].filter((item) => item.value > 0);
  const sessionAverages = (results.par_session || []).map((row) => ({ name: row.libelle, moyenne: row.moyenne ?? 0 }));
  const typePie = (dashboard.repartition_types_employes || []).map((row) => ({ name: row.libelle, value: Number(row.auditeurs) || 0 })).filter((item) => item.value > 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-2">
        <Card
          title="Effectifs"
          subtitle="Auditeurs actifs ; la capacité est affichée pour les salles"
          action={<Segmented label="effectifs" value={effectifBy} onChange={setEffectifBy} options={[
            { value: 'salles', label: 'Salles' }, { value: 'groupes', label: 'Groupes' }, { value: 'sessions', label: 'Sessions' },
            { value: 'niveaux', label: 'Niveaux' }, { value: 'types', label: 'Types d’employé' }, { value: 'departements', label: 'Départements' },
          ]} />}
        >
          {effectifRows.length ? (
            <div className="h-72"><ResponsiveContainer width="100%" height="100%">
              <BarChart data={effectifRows} margin={{ top: 8, right: 8, left: -18, bottom: 28 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" interval={0} angle={-25} textAnchor="end" height={56} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <Tooltip cursor={{ fill: 'rgba(15,118,110,0.06)' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="auditeurs" name="Auditeurs" radius={[6, 6, 0, 0]} animationDuration={600}>{effectifRows.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}</Bar>
                {effectifBy === 'salles' && <Bar dataKey="capacite" name="Capacité" fill="#cbd5e1" radius={[6, 6, 0, 0]} />}
              </BarChart>
            </ResponsiveContainer></div>
          ) : <Empty text="Aucun effectif actif dans le périmètre sélectionné." />}
        </Card>

        <Card
          title="Taux de présence et d’absence"
          subtitle="Calculés sur les pointages enregistrés (cliquez la légende pour masquer une série)"
          action={<Segmented label="presence" value={presenceBy} onChange={setPresenceBy} options={[
            { value: 'salle', label: 'Salle' }, { value: 'groupe', label: 'Groupe' }, { value: 'departement', label: 'Département' }, { value: 'type', label: 'Type d’employé' },
          ]} />}
        >
          {presenceRows.length ? (
            <div className="h-72"><ResponsiveContainer width="100%" height="100%">
              <BarChart data={presenceRows} margin={{ top: 8, right: 8, left: -18, bottom: 28 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" interval={0} angle={-25} textAnchor="end" height={56} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} unit=" %" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value, name) => [`${value} %`, name]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Présence" fill="#10b981" radius={[6, 6, 0, 0]} animationDuration={600} />
                <Bar dataKey="Absence" fill="#f43f5e" radius={[6, 6, 0, 0]} animationDuration={600} />
              </BarChart>
            </ResponsiveContainer></div>
          ) : <Empty text="Aucun pointage enregistré dans le périmètre sélectionné." />}
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card title="Résultats des sessions" subtitle="Admis, non admis et en attente">
          {resultPie.length ? (
            <div className="h-64"><ResponsiveContainer width="100%" height="100%">
              <PieChart><Pie data={resultPie} dataKey="value" nameKey="name" innerRadius={52} outerRadius={86} paddingAngle={3} animationDuration={700}>
                {resultPie.map((item) => <Cell key={item.name} fill={{ Admis: '#10b981', 'Non admis': '#f43f5e', 'En attente': '#94a3b8' }[item.name]} />)}
              </Pie><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} /></PieChart>
            </ResponsiveContainer></div>
          ) : <Empty text="Aucun résultat calculable." />}
        </Card>
        <Card title="Moyenne par session" subtitle="Moyenne générale sur 4">
          {sessionAverages.some((row) => row.moyenne > 0) ? (
            <div className="h-64"><ResponsiveContainer width="100%" height="100%">
              <BarChart data={sessionAverages} margin={{ top: 8, right: 8, left: -18, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 4]} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <Tooltip /><Bar dataKey="moyenne" name="Moyenne /4" fill="#0d9488" radius={[6, 6, 0, 0]} animationDuration={600} />
              </BarChart>
            </ResponsiveContainer></div>
          ) : <Empty text="Les moyennes apparaîtront quand les évaluations seront complètes." />}
        </Card>
        <Card title="Répartition par type d’employé" subtitle="Auditeurs actifs">
          {typePie.length ? (
            <div className="h-64"><ResponsiveContainer width="100%" height="100%">
              <PieChart><Pie data={typePie} dataKey="value" nameKey="name" outerRadius={86} animationDuration={700}>{typePie.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} /></PieChart>
            </ResponsiveContainer></div>
          ) : <Empty text="Aucun type d’employé renseigné." />}
        </Card>
      </div>
    </div>
  );
}
