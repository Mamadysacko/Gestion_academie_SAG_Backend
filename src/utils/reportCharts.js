/**
 * Visualisation automatique des rapports : à partir des colonnes typées d'un rapport
 * (`{ colonnes: [{key,label,type}], lignes: [] }`), construit jusqu'à trois graphiques
 * (diagramme en bâtons, diagramme circulaire en anneau, diagramme en bâtons empilés) et les
 * dessine en SVG (aux couleurs AGES / SAG). Le même SVG sert à la dernière page imprimée du
 * rapport et, converti en image, à la dernière page des exports Excel.
 */
const NUMERIC = ['int', 'dec', 'pct'];
const PALETTE = ['#A97324', '#1F1F20', '#39C832', '#F5D482', '#C82927', '#A96C32', '#572A27', '#F2D719'];
const NAMED_COLORS = [
  [/pr[ée]sent|valid|admis|r[ée]ussi|excellent|termin/i, '#39C832'],
  [/absent|abandon|ajourn|[ée]chec|insuffisant|annul/i, '#C82927'],
  [/retard|passable|moyen|attente|incompl/i, '#F2D719'],
  [/cong/i, '#A96C32'],
  [/permission/i, '#572A27'],
];
const SKIPPED_NUMBERS = /^(rang|n°|no\b|num[ée]ro|id\b|ann[ée]e)/i;
const TOTAL_LIKE = /total|effectif|nombre/i;
const CATEGORY_HINT = /statut|niveau|d[ée]cision|appr[ée]ciation|sexe|genre|type|d[ée]partement|r[ée]sultat|salle|groupe|session|jour/i;

const escapeXml = (value) => String(value ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const short = (text, max) => { const s = String(text ?? ''); return s.length > max ? `${s.slice(0, max - 1)}…` : s; };
const toNumber = (value) => { const n = Number(value); return Number.isFinite(n) ? n : 0; };
const hasValues = (rows, column) => rows.some((row) => row[column.key] !== null && row[column.key] !== '' && row[column.key] !== undefined && Number.isFinite(Number(row[column.key])));

function assignColors(names) {
  const used = new Set();
  const out = names.map((name) => {
    const hit = NAMED_COLORS.find(([pattern]) => pattern.test(name));
    if (hit && !used.has(hit[1])) { used.add(hit[1]); return hit[1]; }
    return null;
  });
  let next = 0;
  return out.map((color) => {
    if (color) return color;
    while (used.has(PALETTE[next % PALETTE.length]) && used.size < PALETTE.length) next += 1;
    const pick = PALETTE[next % PALETTE.length];
    used.add(pick);
    next += 1;
    return pick;
  });
}

function pickLabelColumn(columns, rows) {
  const candidates = columns.filter((c) => !NUMERIC.includes(c.type) && c.type !== 'date');
  const preferred = candidates.find((c) => !/matricule|code|n°|identifiant/i.test(c.label) && rows.some((r) => r[c.key]));
  return preferred || candidates.find((c) => rows.some((r) => r[c.key])) || columns.find((c) => c.type === 'date') || null;
}

const unitOf = (column) => (column.type === 'pct' ? 'pct' : column.type === 'dec' ? 'dec' : 'int');

function metricColumn(numbers) {
  return numbers.find((c) => c.type === 'pct')
    || numbers.find((c) => /moyenne|total|effectif|nombre/i.test(c.label))
    || numbers[0];
}

function categoricalColumn(columns, rows, labelColumn) {
  const found = columns
    .filter((c) => !NUMERIC.includes(c.type) && c.type !== 'date' && c !== labelColumn)
    .map((column) => {
      const counts = new Map();
      rows.forEach((row) => { const v = row[column.key]; if (v !== null && v !== '' && v !== undefined) counts.set(String(v), (counts.get(String(v)) || 0) + 1); });
      return { column, counts, distinct: counts.size };
    })
    .filter((item) => item.distinct >= 2 && item.distinct <= 8 && rows.length / item.distinct >= 1.5);
  found.sort((a, b) => Number(CATEGORY_HINT.test(b.column.label)) - Number(CATEGORY_HINT.test(a.column.label)));
  return found[0] || null;
}

function donutFromTotals(labels, values, title, unit, name) {
  const pairs = labels.map((label, index) => ({ label, value: values[index] })).filter((p) => p.value > 0).sort((a, b) => b.value - a.value);
  if (pairs.length < 2) return null;
  const head = pairs.slice(0, 7);
  const rest = pairs.slice(7).reduce((sum, p) => sum + p.value, 0);
  if (rest > 0) head.push({ label: 'Autres', value: rest });
  return { kind: 'donut', title, unit, labels: head.map((p) => p.label), series: [{ name, values: head.map((p) => p.value) }] };
}

function chartsForSection(section) {
  const columns = section.colonnes || [];
  const rows = (section.lignes || []).filter((row) => !/^total/i.test(String(Object.values(row)[0] ?? '')));
  if (!rows.length) return [];
  const labelColumn = pickLabelColumn(columns, rows);
  const numbers = columns.filter((c) => NUMERIC.includes(c.type) && c !== labelColumn && !SKIPPED_NUMBERS.test(c.label) && hasValues(rows, c));
  const charts = [];
  const labelOf = (row) => short(labelColumn ? (labelColumn.type === 'date' ? String(row[labelColumn.key]).slice(0, 10).split('-').reverse().join('/') : row[labelColumn.key]) || '—' : '—', 18);

  if (labelColumn && numbers.length && rows.length >= 2) {
    const metric = metricColumn(numbers);
    let barRows = rows;
    if (rows.length > 12) barRows = [...rows].sort((a, b) => toNumber(b[metric.key]) - toNumber(a[metric.key])).slice(0, 12);
    charts.push({
      kind: 'bar', title: `${metric.label} par ${labelColumn.label.toLowerCase()}${rows.length > 12 ? ' (12 premiers)' : ''}`, unit: unitOf(metric),
      labels: barRows.map(labelOf), series: [{ name: metric.label, values: barRows.map((r) => toNumber(r[metric.key])) }],
    });
  }

  // Diagramme circulaire : part de chaque ligne (rapport agrégé) ou répartition d'une catégorie (liste de personnes).
  const ints = numbers.filter((c) => c.type === 'int');
  const category = categoricalColumn(columns, rows, labelColumn);
  const aggregated = labelColumn && rows.length <= 14 && ints.length;
  let donut = null;
  const parts = ints.filter((c) => !TOTAL_LIKE.test(c.label));
  if (aggregated && parts.length >= 2) {
    const sums = parts.slice(0, 6).map((c) => rows.reduce((total, r) => total + toNumber(r[c.key]), 0));
    donut = donutFromTotals(parts.slice(0, 6).map((c) => c.label), sums, 'Répartition globale', 'int', 'Total');
  }
  if (!donut && aggregated) {
    const metric = ints.find((c) => /total|effectif|nombre/i.test(c.label)) || ints[0];
    donut = donutFromTotals(rows.map(labelOf), rows.map((r) => toNumber(r[metric.key])), `Répartition : ${metric.label.toLowerCase()}`, 'int', metric.label);
  }
  if (!donut && category) {
    const entries = [...category.counts.entries()].sort((a, b) => b[1] - a[1]);
    donut = donutFromTotals(entries.map((e) => short(e[0], 22)), entries.map((e) => e[1]), `Répartition par ${category.column.label.toLowerCase()}`, 'int', 'Effectif');
  }
  if (donut) charts.push(donut);

  // Bâtons empilés : plusieurs effectifs comparés ligne par ligne.
  if (labelColumn && rows.length >= 2) {
    const components = ints.filter((c) => !TOTAL_LIKE.test(c.label));
    const series = (components.length >= 2 ? components : ints).slice(0, 5);
    if (series.length >= 2) {
      let stackRows = rows;
      const sum = (row) => series.reduce((total, c) => total + toNumber(row[c.key]), 0);
      if (rows.length > 10) stackRows = [...rows].sort((a, b) => sum(b) - sum(a)).slice(0, 10);
      if (stackRows.some((row) => sum(row) > 0)) {
        charts.push({
          kind: 'stacked', title: `Répartition par ${labelColumn.label.toLowerCase()}${rows.length > 10 ? ' (10 premiers)' : ''}`, unit: 'int',
          labels: stackRows.map(labelOf), series: series.map((c) => ({ name: c.label, values: stackRows.map((r) => toNumber(r[c.key])) })),
        });
      }
    }
  }
  return charts;
}

/** Graphiques d'un rapport : ceux de la première section exploitable (liste vide s'il n'y a rien à visualiser). */
export function buildReportCharts(report) {
  for (const section of report?.sections || []) {
    const charts = chartsForSection(section);
    if (charts.length) return charts;
  }
  return [];
}

// ───────────────────────────── Dessin SVG ─────────────────────────────

const formatValue = (value, unit) => {
  if (unit === 'pct') return `${Number(value).toFixed(1)}%`;
  if (unit === 'dec') return Number(value).toFixed(2);
  return Number(value).toLocaleString('fr-FR');
};

function niceMax(value, unit) {
  if (value <= 0) return 1;
  if (unit === 'pct' && value > 50) return 100;
  const exp = 10 ** Math.floor(Math.log10(value));
  const f = value / exp;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * exp;
}

function frame(inner, width, height, title, responsive) {
  const size = responsive ? 'style="width:100%;height:auto;display:block"' : `width="${width}" height="${height}"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" ${size} font-family="Arial, Helvetica, sans-serif">
<rect width="${width}" height="${height}" fill="#ffffff"/>
<text x="10" y="19" font-size="13" font-weight="700" fill="#1F1F20">${escapeXml(title)}</text>
<line x1="10" y1="27" x2="${width - 10}" y2="27" stroke="#A97324" stroke-width="1.5"/>${inner}</svg>`;
}

function axes(spec, plot, maxValue) {
  const { x0, x1, yTop, yBot } = plot;
  const steps = spec.unit === 'int' && maxValue < 4 ? Math.max(1, Math.round(maxValue)) : 4;
  let out = '';
  for (let i = 0; i <= steps; i += 1) {
    const value = (maxValue / steps) * i;
    const y = yBot - ((yBot - yTop) * i) / steps;
    out += `<line x1="${x0}" y1="${y.toFixed(1)}" x2="${x1}" y2="${y.toFixed(1)}" stroke="${i ? '#E4E1DA' : '#1F1F20'}" stroke-width="${i ? 0.8 : 1}"/>`;
    out += `<text x="${x0 - 6}" y="${(y + 3.5).toFixed(1)}" font-size="10" text-anchor="end" fill="#57534E">${escapeXml(formatValue(spec.unit === 'int' ? Math.round(value * 100) / 100 : value, spec.unit === 'pct' ? 'int' : spec.unit))}</text>`;
  }
  return out;
}

function categoryLabels(labels, plot, slot) {
  const rotate = labels.length > 6;
  return labels.map((label, index) => {
    const x = plot.x0 + slot * index + slot / 2;
    const y = plot.yBot + 14;
    return rotate
      ? `<text transform="translate(${x.toFixed(1)} ${y}) rotate(-35)" font-size="10" text-anchor="end" fill="#1F1F20">${escapeXml(short(label, 16))}</text>`
      : `<text x="${x.toFixed(1)}" y="${y}" font-size="10.5" text-anchor="middle" fill="#1F1F20">${escapeXml(short(label, 18))}</text>`;
  }).join('');
}

function barSvg(spec, width, height, responsive) {
  const rotated = spec.labels.length > 6;
  const plot = { x0: 52, x1: width - 16, yTop: 46, yBot: height - (rotated ? 60 : 34) };
  const maxValue = niceMax(Math.max(...spec.series[0].values, 0), spec.unit);
  const slot = (plot.x1 - plot.x0) / spec.labels.length;
  const bw = Math.min(52, slot * 0.62);
  const colors = assignColors([spec.series[0].name]);
  let inner = axes(spec, plot, maxValue);
  spec.series[0].values.forEach((value, index) => {
    const h = ((plot.yBot - plot.yTop) * value) / maxValue;
    const x = plot.x0 + slot * index + (slot - bw) / 2;
    inner += `<rect x="${x.toFixed(1)}" y="${(plot.yBot - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(h, 0).toFixed(1)}" rx="2" fill="${colors[0]}"/>`;
    inner += `<text x="${(x + bw / 2).toFixed(1)}" y="${(plot.yBot - h - 4).toFixed(1)}" font-size="10" font-weight="700" text-anchor="middle" fill="#1F1F20">${escapeXml(formatValue(value, spec.unit))}</text>`;
  });
  inner += categoryLabels(spec.labels, plot, slot);
  return frame(inner, width, height, spec.title, responsive);
}

function stackedSvg(spec, width, height, responsive) {
  const rotated = spec.labels.length > 6;
  const plot = { x0: 52, x1: width - 16, yTop: 46, yBot: height - (rotated ? 78 : 52) };
  const totals = spec.labels.map((_, i) => spec.series.reduce((sum, s) => sum + s.values[i], 0));
  const maxValue = niceMax(Math.max(...totals, 0), 'int');
  const slot = (plot.x1 - plot.x0) / spec.labels.length;
  const bw = Math.min(60, slot * 0.62);
  const colors = assignColors(spec.series.map((s) => s.name));
  let inner = axes({ ...spec, unit: 'int' }, plot, maxValue);
  spec.labels.forEach((_, index) => {
    let y = plot.yBot;
    const x = plot.x0 + slot * index + (slot - bw) / 2;
    spec.series.forEach((serie, k) => {
      const value = serie.values[index];
      if (value <= 0) return;
      const h = ((plot.yBot - plot.yTop) * value) / maxValue;
      y -= h;
      inner += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" fill="${colors[k]}" stroke="#fff" stroke-width="0.6"/>`;
      if (h >= 13) inner += `<text x="${(x + bw / 2).toFixed(1)}" y="${(y + h / 2 + 3.5).toFixed(1)}" font-size="9.5" font-weight="700" text-anchor="middle" fill="${['#F5D482', '#F2D719'].includes(colors[k]) ? '#1F1F20' : '#fff'}">${escapeXml(formatValue(value, 'int'))}</text>`;
    });
    inner += `<text x="${(x + bw / 2).toFixed(1)}" y="${(y - 4).toFixed(1)}" font-size="10" font-weight="700" text-anchor="middle" fill="#1F1F20">${escapeXml(formatValue(totals[index], 'int'))}</text>`;
  });
  inner += categoryLabels(spec.labels, plot, slot);
  let lx = plot.x0;
  const ly = height - 12;
  spec.series.forEach((serie, k) => {
    inner += `<rect x="${lx}" y="${ly - 9}" width="10" height="10" fill="${colors[k]}"/><text x="${lx + 14}" y="${ly}" font-size="10" fill="#1F1F20">${escapeXml(short(serie.name, 24))}</text>`;
    lx += 14 + Math.min(serie.name.length, 24) * 5.6 + 22;
  });
  return frame(inner, width, height, spec.title, responsive);
}

function arcPath(cx, cy, outer, inner, a0, a1) {
  const point = (r, a) => `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${point(outer, a0)} A ${outer} ${outer} 0 ${large} 1 ${point(outer, a1)} L ${point(inner, a1)} A ${inner} ${inner} 0 ${large} 0 ${point(inner, a0)} Z`;
}

function donutSvg(spec, width, height, responsive) {
  const values = spec.series[0].values;
  const total = values.reduce((sum, v) => sum + v, 0) || 1;
  const colors = assignColors(spec.labels);
  const outer = Math.min((height - 60) / 2, width * 0.3);
  const inner = outer * 0.58;
  const cx = 16 + outer + 8;
  const cy = 36 + (height - 36) / 2;
  let inside = '';
  let angle = -Math.PI / 2;
  values.forEach((value, index) => {
    const sweep = (value / total) * Math.PI * 2;
    if (value / total > 0.9995) {
      inside += `<circle cx="${cx}" cy="${cy}" r="${(outer + inner) / 2}" fill="none" stroke="${colors[index]}" stroke-width="${outer - inner}"/>`;
    } else {
      inside += `<path d="${arcPath(cx, cy, outer, inner, angle, angle + sweep)}" fill="${colors[index]}" stroke="#fff" stroke-width="1.2"/>`;
    }
    angle += sweep;
  });
  inside += `<text x="${cx}" y="${cy - 2}" font-size="${Math.round(outer * 0.3)}" font-weight="800" text-anchor="middle" fill="#1F1F20">${escapeXml(formatValue(total, 'int'))}</text>`;
  inside += `<text x="${cx}" y="${cy + 14}" font-size="9.5" text-anchor="middle" fill="#57534E">${escapeXml(short(spec.series[0].name, 18))}</text>`;
  const lx = cx + outer + 28;
  const rowH = Math.min(21, (height - 50) / values.length);
  const ly = cy - (rowH * values.length) / 2;
  values.forEach((value, index) => {
    const y = ly + rowH * index + 10;
    const percent = Math.round((value / total) * 1000) / 10;
    inside += `<rect x="${lx}" y="${(y - 9).toFixed(1)}" width="10" height="10" rx="2" fill="${colors[index]}"/>`;
    inside += `<text x="${lx + 15}" y="${y.toFixed(1)}" font-size="10.5" fill="#1F1F20">${escapeXml(short(spec.labels[index], 24))} — <tspan font-weight="700">${escapeXml(formatValue(value, 'int'))}</tspan> (${String(percent).replace('.', ',')} %)</text>`;
  });
  return frame(inside, width, height, spec.title, responsive);
}

/** SVG d'un graphique. `responsive` : s'adapte à la largeur du conteneur (écran, impression). */
export function chartSvg(spec, { width = 560, height = 260, responsive = false } = {}) {
  if (spec.kind === 'donut') return donutSvg(spec, width, height, responsive);
  if (spec.kind === 'stacked') return stackedSvg(spec, width, height, responsive);
  return barSvg(spec, width, height, responsive);
}

/** Image PNG (ArrayBuffer) d'un graphique, pour l'insérer dans un classeur Excel. */
export async function chartPng(spec, { width = 560, height = 260, scale = 2 } = {}) {
  const svg = chartSvg(spec, { width, height });
  const image = new Image();
  const loaded = new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('Graphique illisible.')); });
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await loaded;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  return blob.arrayBuffer();
}
