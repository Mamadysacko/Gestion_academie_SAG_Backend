import { useMemo, useState } from 'react';

/**
 * Pagination côté interface : n'affiche que `pageSize` lignes à la fois, ce qui garde les
 * grands tableaux fluides. Revient à la première page quand le nombre de lignes change
 * (nouveau filtre, nouvelle recherche).
 *
 *   const { pageRows, pagerProps } = usePagination(rows, 25);
 *   … rows.map → pageRows.map … <Pagination {...pagerProps} />
 */
export function usePagination(rows, pageSize = 25) {
  const [state, setState] = useState({ page: 1, size: pageSize, total: rows.length });
  // La page revient à 1 dès que le jeu de données change de taille (filtre, recherche).
  const page = state.total === rows.length ? state.page : 1;
  const pageCount = Math.max(1, Math.ceil(rows.length / state.size));
  const current = Math.min(page, pageCount);

  const setPage = (next) => setState({ page: Math.min(Math.max(1, next), pageCount), size: state.size, total: rows.length });
  const setSize = (size) => setState({ page: 1, size, total: rows.length });

  const pageRows = useMemo(
    () => rows.slice((current - 1) * state.size, current * state.size),
    [rows, current, state.size],
  );

  return {
    pageRows,
    pagerProps: { page: current, pageCount, total: rows.length, size: state.size, setPage, setSize },
  };
}
