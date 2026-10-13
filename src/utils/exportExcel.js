import logoSag from '../assets/logo-sag.png';
import logoAges from '../assets/logo-ages.png';

export const FOOTER_LEFT = 'Vérifié par : AGES COORDINATEUR';
export const FOOTER_RIGHT = 'SAG EDUCATION PROJECT';

const ORANGE = 'FFF28C1E';
const GREEN = 'FF0F766E';
const GREY = 'FFE2E8F0';
const BORDER = { style: 'thin', color: { argb: 'FF475569' } };
const ALL_BORDERS = { top: BORDER, left: BORDER, bottom: BORDER, right: BORDER };
const FORMATS = { int: '#,##0', dec: '0.00', pct: '0.0"%"', date: 'dd/mm/yyyy' };

async function loadImage(url) {
  const response = await fetch(url);
  return response.arrayBuffer();
}

const safeSheetName = (name, used) => {
  const base = String(name || 'Rapport').replace(/[\\/?*[\]:]/g, ' ').slice(0, 28) || 'Rapport';
  let candidate = base;
  let n = 2;
  while (used.has(candidate.toLowerCase())) { candidate = `${base.slice(0, 25)} ${n}`; n += 1; }
  used.add(candidate.toLowerCase());
  return candidate;
};

function cellValue(value, type) {
  if (value === null || value === undefined || value === '') return null;
  if (type === 'date' && /^\d{4}-\d{2}-\d{2}/.test(String(value))) return new Date(`${String(value).slice(0, 10)}T12:00:00`);
  if (['int', 'dec', 'pct'].includes(type)) {
    const number = Number(value);
    return Number.isFinite(number) ? number : String(value);
  }
  return value;
}

/**
 * Exporte un classeur Excel professionnel : une feuille par entrée de `sheets`, au format A4 paysage.
 * Chaque feuille : bandeau avec logos (SAG à gauche, AGES à droite) et « Siguiri Education Project »,
 * titre de l'analyse, période et filtres, résumé, tableaux (en-têtes stylés), pied de page
 * « Vérifié par : AGES COORDINATEUR » / « SAG EDUCATION PROJECT ».
 *
 * sheets: [{ name, title, subtitle?, filters?: [{label,value}], summary?: [{label,value}],
 *            sections: [{ titre, colonnes: [{key,label,type,width?}], lignes: [] }] }]
 */
export async function exportWorkbook({ filename, sheets }) {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AGES — Gestion Académie';
  workbook.created = new Date();
  const [sagBuffer, agesBuffer] = await Promise.all([loadImage(logoSag), loadImage(logoAges)]);
  const sagId = workbook.addImage({ buffer: sagBuffer, extension: 'png' });
  const agesId = workbook.addImage({ buffer: agesBuffer, extension: 'png' });
  const used = new Set();

  sheets.forEach((sheet) => {
    const ws = workbook.addWorksheet(safeSheetName(sheet.name || sheet.title, used), {
      pageSetup: {
        paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0,
        margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.6, header: 0.2, footer: 0.25 },
        horizontalCentered: true,
      },
      headerFooter: { oddFooter: `&L&9${FOOTER_LEFT}&C&9Page &P / &N&R&9&B${FOOTER_RIGHT}` },
      views: [{ showGridLines: false }],
    });
    const columnCount = Math.max(8, ...sheet.sections.map((section) => section.colonnes.length));
    const lastCol = columnCount;

    // Largeurs : selon le contenu le plus long de chaque colonne.
    const widths = Array.from({ length: columnCount }, () => 10);
    sheet.sections.forEach((section) => section.colonnes.forEach((column, index) => {
      const longest = Math.max(String(column.label).length * 0.9, ...section.lignes.slice(0, 200).map((row) => String(row[column.key] ?? '').length));
      widths[index] = Math.min(46, Math.max(widths[index], column.width || longest + 2));
    }));
    widths.forEach((width, index) => { ws.getColumn(index + 1).width = width; });

    // Bandeau : logos + « Siguiri Education Project »
    [1, 2, 3].forEach((row) => { ws.getRow(row).height = 24; });
    ws.addImage(sagId, { tl: { col: 0.1, row: 0.1 }, ext: { width: 92, height: 92 } });
    ws.addImage(agesId, { tl: { col: Math.max(0, lastCol - 2.2), row: 0.15 }, ext: { width: 150, height: 79 } });
    const bandFrom = Math.min(3, lastCol - 2);
    const bandTo = Math.max(bandFrom + 1, lastCol - 2);
    ws.mergeCells(1, bandFrom, 1, bandTo);
    const band = ws.getCell(1, bandFrom);
    band.value = 'Siguiri Education Project';
    band.font = { name: 'Arial', bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
    band.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ORANGE } };
    band.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.mergeCells(2, bandFrom, 2, bandTo);
    ws.getCell(2, bandFrom).value = 'SAG French Numeracy and Literacy – Employees Education Attendance & Reporting';
    ws.getCell(2, bandFrom).font = { name: 'Arial', bold: true, size: 10 };
    ws.getCell(2, bandFrom).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.mergeCells(3, bandFrom, 3, bandTo);
    ws.getCell(3, bandFrom).value = 'Formation Numératie et Alphabétisation en Français — Projet Éducation Siguiri (SAG)';
    ws.getCell(3, bandFrom).font = { name: 'Arial', italic: true, size: 9 };
    ws.getCell(3, bandFrom).alignment = { horizontal: 'center', vertical: 'middle' };

    let row = 5;
    const fullRow = (text, font, fill, height = 20) => {
      ws.mergeCells(row, 1, row, lastCol);
      const cell = ws.getCell(row, 1);
      cell.value = text;
      cell.font = { name: 'Arial', ...font };
      if (fill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 };
      ws.getRow(row).height = height;
      row += 1;
    };

    fullRow(sheet.title, { bold: true, size: 15, color: { argb: 'FF0F172A' } }, null, 26);
    if (sheet.subtitle) fullRow(sheet.subtitle, { size: 10, color: { argb: 'FF475569' } });
    if (sheet.filters?.length) fullRow(`Filtres : ${sheet.filters.map((item) => `${item.label} = ${item.value}`).join('  ·  ')}`, { size: 9, italic: true, color: { argb: 'FF475569' } });
    fullRow(`Édité le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`, { size: 9, color: { argb: 'FF64748B' } });
    row += 1;

    if (sheet.summary?.length) {
      const per = Math.max(1, Math.floor(lastCol / Math.min(sheet.summary.length, 6)));
      sheet.summary.slice(0, 6).forEach((item, index) => {
        const from = 1 + index * per;
        const to = index === Math.min(sheet.summary.length, 6) - 1 ? lastCol : from + per - 1;
        if (to > from) { ws.mergeCells(row, from, row, to); ws.mergeCells(row + 1, from, row + 1, to); }
        const label = ws.getCell(row, from);
        label.value = item.label;
        label.font = { name: 'Arial', size: 8, bold: true, color: { argb: 'FF475569' } };
        label.alignment = { horizontal: 'center', vertical: 'middle' };
        label.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREY } };
        const value = ws.getCell(row + 1, from);
        value.value = item.value;
        value.font = { name: 'Arial', size: 13, bold: true, color: { argb: GREEN } };
        value.alignment = { horizontal: 'center', vertical: 'middle' };
        for (let c = from; c <= to; c += 1) {
          ws.getCell(row, c).border = ALL_BORDERS;
          ws.getCell(row + 1, c).border = ALL_BORDERS;
        }
      });
      ws.getRow(row).height = 16;
      ws.getRow(row + 1).height = 24;
      row += 3;
    }

    sheet.sections.forEach((section) => {
      if (section.titre) fullRow(section.titre, { bold: true, size: 11, color: { argb: 'FFFFFFFF' } }, GREEN, 22);
      const headerRow = ws.getRow(row);
      section.colonnes.forEach((column, index) => {
        const cell = headerRow.getCell(index + 1);
        cell.value = column.label;
        cell.font = { name: 'Arial', bold: true, size: 9 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREY } };
        cell.border = ALL_BORDERS;
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      });
      headerRow.height = 30;
      const headerIndex = row;
      row += 1;

      section.lignes.forEach((line, lineIndex) => {
        const dataRow = ws.getRow(row);
        section.colonnes.forEach((column, index) => {
          const cell = dataRow.getCell(index + 1);
          cell.value = cellValue(line[column.key], column.type);
          cell.font = { name: 'Arial', size: 9 };
          cell.border = ALL_BORDERS;
          cell.alignment = { vertical: 'middle', horizontal: ['int', 'dec', 'pct'].includes(column.type) ? 'right' : column.type === 'date' ? 'center' : 'left', wrapText: true };
          if (FORMATS[column.type]) cell.numFmt = FORMATS[column.type];
          if (lineIndex % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        });
        if (section.hauteurLigne) dataRow.height = section.hauteurLigne;
        row += 1;
      });
      if (!section.lignes.length) {
        ws.mergeCells(row, 1, row, lastCol);
        ws.getCell(row, 1).value = 'Aucune donnée pour ces filtres.';
        ws.getCell(row, 1).font = { name: 'Arial', italic: true, size: 9, color: { argb: 'FF64748B' } };
        row += 1;
      }
      if (sheet.sections.length === 1) ws.views = [{ showGridLines: false, state: 'frozen', ySplit: headerIndex }];
      row += 1;
    });

    // Pied de page : à gauche « Vérifié par », à droite « SAG EDUCATION PROJECT ».
    row += 1;
    const half = Math.max(1, Math.floor(lastCol / 2));
    ws.mergeCells(row, 1, row, half);
    ws.mergeCells(row, half + 1, row, lastCol);
    const left = ws.getCell(row, 1);
    left.value = FOOTER_LEFT;
    left.font = { name: 'Arial', bold: true, size: 10 };
    left.alignment = { horizontal: 'left', vertical: 'middle' };
    const right = ws.getCell(row, half + 1);
    right.value = FOOTER_RIGHT;
    right.font = { name: 'Arial', bold: true, size: 10 };
    right.alignment = { horizontal: 'right', vertical: 'middle' };
    for (let c = 1; c <= lastCol; c += 1) ws.getCell(row, c).border = { top: BORDER };
    ws.getRow(row).height = 22;
    ws.pageSetup.printArea = `A1:${ws.getColumn(lastCol).letter}${row}`;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.xlsx`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
