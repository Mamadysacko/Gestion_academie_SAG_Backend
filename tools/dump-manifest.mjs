import { buildManifest } from './featuresPlugin.js';

const { manifest } = buildManifest(process.cwd());
for (const m of Object.values(manifest.modules)) {
  console.log(`\n## ${m.id}  (${m.entry}) | actions du module : ${m.actions.map((a) => a.label).join(', ')}`);
  for (const s of m.subtabs) console.log(`  - ${s.id} | ${s.label} | ${s.component || '-'} | ${s.actions.map((a) => `${a.label}(${a.permission})`).join('; ')}`);
}
console.log(`\nTables : ${Object.keys(manifest.schema).length} · erreurs métier : ${manifest.errors.length}`);
for (const t of ['sessions', 'inscriptions', 'emplois_du_temps', 'notes', 'presences']) console.log(t, JSON.stringify(manifest.schema[t]));
