const dateValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function getCurrentSchoolYear(years = [], today = dateValue(new Date())) {
  const normalizedYears = years
    .filter((year) => year?.id != null)
    .map((year) => ({ ...year, id: Number(year.id), statut: Number(year.statut) }));
  const compareRecentFirst = (left, right) => (
    String(right.date_debut || '').localeCompare(String(left.date_debut || ''))
    || right.id - left.id
  );

  return normalizedYears
    .filter((year) => year.date_debut && year.date_fin && year.date_debut <= today && today <= year.date_fin)
    .sort((left, right) => Number(right.statut === 1) - Number(left.statut === 1) || compareRecentFirst(left, right))[0]
    || normalizedYears.filter((year) => year.statut === 1).sort(compareRecentFirst)[0]
    || normalizedYears.sort(compareRecentFirst)[0]
    || null;
}

export function getCurrentSchoolYearId(years = [], today) {
  return getCurrentSchoolYear(years, today)?.id ?? null;
}
