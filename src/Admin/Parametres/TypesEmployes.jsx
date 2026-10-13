import { BriefcaseBusiness } from 'lucide-react';
import ParametreSection from './ParametreSection';

const definition = {
  resource: 'types-employes',
  tableName: 'types_employes',
  label: 'Types d’employés',
  singular: 'type d’employé',
  icon: BriefcaseBusiness,
  description: 'Catégories professionnelles attribuées à chaque auditeur lors de son inscription.',
  references: [],
  fields: [
    { key: 'libelle', label: 'Libellé', required: true, fullWidth: true, placeholder: 'Ex: Fonctionnaire, Contractuel, Stagiaire...' },
    { key: 'nb_auditeurs', label: 'Auditeurs rattachés', form: false },
  ],
  titleFor: (row) => row.libelle,
};

export default function TypesEmployes() {
  return <ParametreSection definition={definition} />;
}
