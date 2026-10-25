import { IdCard } from 'lucide-react';
import ParametreSection from './ParametreSection';

const definition = {
  resource: 'positions',
  tableName: 'positions',
  label: 'Positions',
  singular: 'position',
  icon: IdCard,
  description: 'Postes ou fonctions que l’on attribue à chaque auditeur lors de sa création (comme le type d’employé).',
  references: [],
  fields: [
    { key: 'libelle', label: 'Libellé', required: true, fullWidth: true, placeholder: 'Ex: Chef de service, Agent de maîtrise, Opérateur...' },
    { key: 'nb_auditeurs', label: 'Auditeurs rattachés', form: false },
  ],
  titleFor: (row) => row.libelle,
};

export default function Positions() {
  return <ParametreSection definition={definition} />;
}
