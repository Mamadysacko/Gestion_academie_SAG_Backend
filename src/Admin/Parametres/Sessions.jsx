import { CalendarDays } from 'lucide-react';
import ParametreSection from './ParametreSection';
import { optionId } from './parametresApi';

const definition = {
  resource: 'sessions',
  tableName: 'sessions',
  label: 'Sessions de formation',
  singular: 'session',
  icon: CalendarDays,
  description: 'Planifiez et configurez les promotions par année scolaire, format de formation et niveau pédagogique.',
  references: [
    { key: 'annees', resource: 'annees-scolaires' },
    { key: 'types', resource: 'types-formations' },
    { key: 'niveaux', resource: 'niveaux' },
  ],
  fields: [
    {
      key: 'code',
      label: 'Code session',
      required: true,
      placeholder: 'Ex: ANG-A1-2425',
      help: 'Identifiant unique de la session dans le système.',
    },
    {
      key: 'libelle',
      label: 'Libellé complet',
      required: true,
      placeholder: 'Ex: Session Anglais Débutant Automne',
    },
    {
      key: 'id_annee',
      label: 'Année scolaire',
      type: 'select',
      required: true,
      numeric: true,
      options: ({ annees }) =>
        (annees || []).map((item) => ({
          value: optionId(item),
          label: `${item.libelle}${item.statut === 1 ? ' (En cours)' : ''}`,
        })),
      format: (value, refs, row) =>
        row.annee_libelle ||
        refs.annees?.find((item) => String(optionId(item)) === String(value))?.libelle ||
        value,
    },
    {
      key: 'id_type_formation',
      label: 'Type de formation',
      type: 'select',
      required: true,
      numeric: true,
      options: ({ types }) =>
        (types || []).map((item) => ({
          value: optionId(item),
          label: item.libelle,
        })),
      format: (value, refs, row) =>
        row.type_formation_libelle ||
        refs.types?.find((item) => String(optionId(item)) === String(value))?.libelle ||
        value,
    },
    {
      key: 'id_niveau',
      label: 'Niveau',
      type: 'select',
      required: true,
      numeric: true,
      options: ({ niveaux }) =>
        (niveaux || []).map((item) => ({
          value: optionId(item),
          label: item.libelle,
        })),
      format: (value, refs, row) =>
        row.niveau_libelle ||
        refs.niveaux?.find((item) => String(optionId(item)) === String(value))?.libelle ||
        value,
    },
    {
      key: 'date_debut',
      label: 'Date de début',
      type: 'date',
      required: true,
    },
    {
      key: 'date_fin',
      label: 'Date de fin',
      type: 'date',
      required: true,
    },
    {
      key: 'statut',
      label: 'Statut',
      type: 'select',
      required: true,
      defaultValue: 'planifiee',
      options: [
        { value: 'planifiee', label: 'Planifiée' },
        { value: 'ouverte', label: 'Ouverte' },
        { value: 'en_cours', label: 'En cours' },
        { value: 'terminee', label: 'Terminée' },
        { value: 'annulee', label: 'Annulée' },
      ],
    },
  ],
  titleFor: (row) => row.libelle || row.code,
};

export default function Sessions() {
  return <ParametreSection definition={definition} />;
}