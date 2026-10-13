import { BookOpen } from 'lucide-react';
import ParametreSection from './ParametreSection';

const definition = {
  resource: 'types-formations',
  tableName: 'types_formations',
  label: 'Types de formations',
  singular: 'type de formation',
  icon: BookOpen,
  description: 'Gérez le catalogue des rythmes et formats de formation proposés par l’académie (intensif, standard, en ligne...).',
  references: [],
  fields: [
    {
      key: 'libelle',
      label: 'Intitulé du type de formation',
      required: true,
      fullWidth: true,
      placeholder: 'Ex: Formation Intensive, Cours du soir, Formation Weekend...',
    },
  ],
  titleFor: (row) => row.libelle,
};

export default function TypesFormations() {
  return <ParametreSection definition={definition} />;
}