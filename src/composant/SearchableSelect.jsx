import TagSelect from './TagSelect';

/** Sélection simple avec recherche, affichée en liste déroulante à étiquettes (voir TagSelect). */
export default function SearchableSelect({
  label,
  value,
  onChange,
  options,
  placeholder = 'Rechercher ou sélectionner…',
  emptyMessage = 'Aucun résultat.',
  disabled = false,
}) {
  return (
    <TagSelect
      label={label}
      value={value}
      onChange={(next) => onChange(next)}
      options={options}
      placeholder={placeholder}
      emptyMessage={emptyMessage}
      disabled={disabled}
    />
  );
}
