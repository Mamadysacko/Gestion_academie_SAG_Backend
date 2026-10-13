import { ClipboardCheck } from 'lucide-react';
import ParametreSection from './ParametreSection';

const definition = {
  resource: 'parametres',
  tableName: 'parametres',
  label: 'Paramètres d’évaluation',
  singular: 'paramètre',
  icon: ClipboardCheck,
  description: 'Créez les paramètres et leurs barèmes. Ils sont communs et réutilisables dans toutes les évaluations.',
  fields: [
    {
      key: 'libelle',
      label: 'Libellé du paramètre',
      required: true,
      placeholder: 'Ex : Expression orale, Compréhension écrite, Vocabulaire...',
    },
    {
      key: 'bareme',
      label: 'Barème maximal (points)',
      type: 'number',
      required: true,
      numeric: true,
      min: '0.01',
      step: '0.01',
      defaultValue: '4.00',
      placeholder: '4.00',
      help: 'Note maximale pour ce paramètre (ex. : 4.00 ou 20.00).',
    },
  ],
  titleFor: (row) => row.libelle,
};

export default function ParametresEvaluation() {
  return <ParametreSection definition={definition} />;
}