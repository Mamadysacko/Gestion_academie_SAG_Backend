import { useMemo } from 'react';
import { dependencyGraph } from './dependencies';
import { useRequirements } from './useRequirements';

const COLORS = { ok: '#39C832', partial: '#F2D719', missing: '#C82927', unknown: '#9D988E' };
const NODE_W = 188;
const NODE_H = 38;
const GAP_X = 70;
const GAP_Y = 14;

/**
 * Carte des dépendances entre les données de l'application : chaque flèche va d'un élément
 * obligatoire vers ce qui en dépend. Le graphe est calculé à partir des clés étrangères
 * obligatoires du schéma SQL ; la couleur de chaque nœud reflète l'état réel des données.
 */
export default function DependencyMap({ schema, currentUser }) {
  const graph = useMemo(() => dependencyGraph(schema), [schema]);
  const { statuses } = useRequirements(graph.map((node) => node.table), currentUser);

  const layout = useMemo(() => {
    const depth = {};
    const resolve = (table, trail = []) => {
      if (depth[table] !== undefined) return depth[table];
      if (trail.includes(table)) return 0;
      const node = graph.find((item) => item.table === table);
      depth[table] = node && node.parents.length ? 1 + Math.max(...node.parents.map((parent) => resolve(parent, [...trail, table]))) : 0;
      return depth[table];
    };
    graph.forEach((node) => resolve(node.table));
    const columns = {};
    graph.forEach((node) => { (columns[depth[node.table]] ||= []).push(node); });
    const positions = {};
    Object.entries(columns).forEach(([level, nodes]) => {
      nodes.forEach((node, index) => { positions[node.table] = { x: Number(level) * (NODE_W + GAP_X), y: index * (NODE_H + GAP_Y) }; });
    });
    const levels = Object.keys(columns).length;
    const rows = Math.max(...Object.values(columns).map((nodes) => nodes.length));
    return { positions, width: levels * (NODE_W + GAP_X) - GAP_X, height: rows * (NODE_H + GAP_Y) - GAP_Y };
  }, [graph]);

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <svg width={layout.width + 8} height={layout.height + 8} role="img" aria-label="Carte des dépendances entre les données" className="mx-auto block">
        <defs>
          <marker id="dep-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="#A97324" />
          </marker>
        </defs>
        {graph.flatMap((node) => node.parents.map((parent) => {
          const from = layout.positions[parent];
          const to = layout.positions[node.table];
          const x1 = from.x + NODE_W; const y1 = from.y + NODE_H / 2; const x2 = to.x; const y2 = to.y + NODE_H / 2;
          const mid = (x1 + x2) / 2;
          return <path key={`${parent}-${node.table}`} d={`M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2 - 2},${y2}`} fill="none" stroke="#A97324" strokeOpacity="0.55" strokeWidth="1.5" markerEnd="url(#dep-arrow)" />;
        }))}
        {graph.map((node) => {
          const { x, y } = layout.positions[node.table];
          const state = statuses[node.table]?.state || 'unknown';
          return (
            <g key={node.table} transform={`translate(${x},${y})`}>
              <title>{`${node.label} — ${statuses[node.table]?.detail || 'vérification…'}`}</title>
              <rect width={NODE_W} height={NODE_H} rx="10" fill="#fff" stroke={COLORS[state]} strokeWidth="2" />
              <circle cx="14" cy={NODE_H / 2} r="5" fill={COLORS[state]} />
              <text x="28" y={NODE_H / 2 + 4} fontSize="12" fontWeight="600" fill="#1F1F20">{node.label.length > 24 ? `${node.label.slice(0, 23)}…` : node.label}</text>
            </g>
          );
        })}
      </svg>
      <ul className="mt-4 flex flex-wrap justify-center gap-3 text-[11px] text-slate-600">
        {[['ok', 'Disponible'], ['partial', 'À compléter'], ['missing', 'Manquant'], ['unknown', 'Non vérifiable']].map(([state, label]) => (
          <li key={state} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[state] }} />{label}</li>
        ))}
      </ul>
      <p className="mt-2 text-center text-[11px] text-slate-500">Lecture de gauche à droite : un élément ne peut être créé que si ceux qui le précèdent existent.</p>
    </div>
  );
}
