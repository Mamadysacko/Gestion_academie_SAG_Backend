import { Star } from 'lucide-react';
import ParametreSection from './ParametreSection';

const definition = {
  resource: 'baremes-appreciation',
  tableName: 'baremes_appreciation',
  label: 'Barème d’appréciation (1 à 4)',
  singular: 'appréciation',
  icon: Star,
  description: 'Chaque appréciation est attribuée automatiquement dès que la moyenne (/4) atteint son seuil. La plus petite note commence à 0 et les seuils croissent avec la note.',
  references: [],
  fields: [
    { key: 'note', label: 'Note (1 à 4)', type: 'number', numeric: true, required: true, format: (value) => `${value}/4` },
    { key: 'libelle', label: 'Libellé', required: true, placeholder: 'Ex: Très bien' },
    { key: 'seuil_min', label: 'À partir de la moyenne (/4)', type: 'number', numeric: true, required: true, format: (value) => `≥ ${Number(value).toFixed(2)}` },
  ],
  titleFor: (row) => `${row.note}/4 · ${row.libelle}`,
};

export default function BaremesAppreciation() {
  return <ParametreSection definition={definition} />;
}
