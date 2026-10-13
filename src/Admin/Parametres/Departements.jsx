import { Building2 } from 'lucide-react';
import ParametreSection from './ParametreSection';

const definition = {
  resource: 'departements',
  tableName: 'departements',
  label: 'Départements',
  singular: 'département',
  icon: Building2,
  description: 'Structurez l’organisation administrative et linguistique rattachée aux inscriptions des auditeurs.',
  references: [],
  fields: [
    { key: 'code', label: 'Code département', required: true, placeholder: 'Ex: ANG, FRA, ESP...' },
    { key: 'libelle', label: 'Nom du département', required: true, placeholder: 'Ex: Département d\'Anglais' },
  ],
  titleFor: (row) => row.libelle || row.code,
};

export default function Departements() {
  return <ParametreSection definition={definition} />;
}