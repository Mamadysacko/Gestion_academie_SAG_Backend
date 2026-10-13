import { BarChart3 } from 'lucide-react';
import ParametreSection from './ParametreSection';

const definition = {
  resource: 'niveaux',
  tableName: 'niveaux',
  label: 'Niveaux de formation',
  singular: 'niveau',
  icon: BarChart3,
  description: 'Maintenez le référentiel des niveaux. L’ordre définit la progression : un auditeur admis passe au niveau d’ordre suivant.',
  references: [],
  fields: [
    {
      key: 'libelle',
      label: 'Libellé du niveau',
      required: true,
      placeholder: 'Ex: Débutant (A1), Intermédiaire (B1), Avancé (C1)...',
    },
    {
      key: 'ordre',
      label: 'Ordre de progression',
      required: true,
      type: 'number',
      numeric: true,
      placeholder: 'Ex: 1 pour le premier niveau',
    },
  ],
  titleFor: (row) => row.libelle,
};

export default function Niveaux() {
  return <ParametreSection definition={definition} />;
}
