import { Scale } from 'lucide-react';
import ParametreSection from './ParametreSection';
import { optionId } from './parametresApi';

const definition = {
  resource: 'regles-passage',
  tableName: 'regles_evaluation',
  label: 'Règles d’évaluation et de passage',
  singular: 'règle',
  icon: Scale,
  description: 'La règle générale s’applique à tous les niveaux ; ajoutez une règle propre à un niveau pour la remplacer (nombre d’évaluations, moyenne d’admission, présence minimale, passage automatique).',
  references: [{ key: 'niveaux', resource: 'niveaux' }],
  fields: [
    { key: 'libelle', label: 'Libellé', required: true, placeholder: 'Ex: Règle du niveau 2' },
    {
      key: 'id_niveau',
      label: 'Niveau concerné (vide = règle générale)',
      type: 'select',
      numeric: true,
      options: ({ niveaux }) => (niveaux || []).map((item) => ({ value: optionId(item), label: item.libelle })),
      format: (value, refs, row) => row.niveau_libelle || (value ? value : 'Tous les niveaux (générale)'),
    },
    { key: 'nb_evaluations', label: 'Évaluations par session', type: 'number', numeric: true, required: true, defaultValue: 3 },
    { key: 'moyenne_admission', label: 'Moyenne d’admission (/4)', type: 'number', numeric: true, required: true, defaultValue: 2, format: (value) => `${Number(value).toFixed(2)} /4` },
    { key: 'taux_presence_min', label: 'Présence minimale (%)', type: 'number', numeric: true, required: true, defaultValue: 0, format: (value) => `${Number(value)} %` },
    { key: 'passage_automatique', label: 'Passage automatique à la clôture de la session', type: 'checkbox', format: (value) => (value ? 'Automatique' : 'Manuel') },
  ],
  titleFor: (row) => row.libelle,
};

export default function ReglesPassage() {
  return <ParametreSection definition={definition} />;
}
