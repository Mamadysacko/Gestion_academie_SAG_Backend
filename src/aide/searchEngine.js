/**
 * Moteur de recherche en langage naturel, sans dépendance :
 * normalisation (accents, casse), mots vides français, racines courtes (préfixe de 7 lettres),
 * synonymes du domaine, tolérance aux fautes de frappe (distance d'édition) et recherche partielle.
 */
import { SYNONYMS } from './helpContent';

const STOP_WORDS = new Set((
  'comment pourquoi quand quel quelle quels quelles est sont etre suis puis peux peut faire fais effectuer avant apres ' +
  'je tu il elle on nous vous ils ne pas plus de du des d l la le les un une au aux en et ou pour sur sous par avec sans ' +
  'dans mon ma mes ton ta tes son sa ses ce cet cette ces qui que quoi dont a y se si me moi ou vers il faut doit dois ' +
  'veux voudrais souhaite besoin trouver trouve afficher voir lieu etapes etape'
).split(' '));

export const normalize = (text) => String(text ?? '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/[’'`]/g, ' ')
  .replace(/[^a-z0-9 ]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const KEY_LENGTH = 7;
const stem = (word) => (word.length > KEY_LENGTH ? word.slice(0, KEY_LENGTH) : word.replace(/s$/, ''));

export const tokenize = (text) => normalize(text).split(' ').filter((word) => word.length > 1 && !STOP_WORDS.has(word));

function distance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = previous[0];
    previous[0] = i;
    let rowMin = previous[0];
    for (let j = 1; j <= b.length; j += 1) {
      const above = previous[j];
      previous[j] = Math.min(previous[j] + 1, previous[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
      rowMin = Math.min(rowMin, previous[j]);
    }
    if (rowMin > max) return max + 1;
  }
  return previous[b.length];
}

// Groupes de synonymes sur les racines : racine → racines équivalentes
const synonymMap = new Map();
SYNONYMS.forEach((group) => {
  const stems = [...new Set(group.flatMap((entry) => tokenize(entry)).map(stem))];
  stems.forEach((key) => synonymMap.set(key, new Set([...(synonymMap.get(key) || []), ...stems])));
});

const FIELD_WEIGHTS = { title: 6, path: 3, keywords: 4, summary: 2, steps: 1, tips: 1, errors: 1.2 };

/** Prépare un document indexable à partir d'une fonctionnalité. */
function indexFeature(feature) {
  const fields = {
    title: feature.title,
    path: feature.path.join(' '),
    keywords: (feature.keywords || []).join(' '),
    summary: feature.summary,
    steps: (feature.steps || []).join(' '),
    tips: (feature.tips || []).join(' '),
  };
  const stems = {};
  Object.entries(fields).forEach(([name, value]) => { stems[name] = tokenize(value).map(stem); });
  return { feature, stems };
}

const ERROR_INTENT = /pourquoi|erreur|impossible|echec|refus|bloque|ne peux pas|ne puis|ne marche|probleme|n arrive pas/;
const HOWTO_INTENT = /comment|ou |etape|proced|guide|faire/;

export function createSearchIndex(features, journeys = []) {
  const docs = features.map(indexFeature);
  const journeyDocs = journeys.map((journey) => ({
    journey,
    stems: {
      title: tokenize(journey.title).map(stem),
      keywords: tokenize(journey.keywords.join(' ')).map(stem),
      summary: tokenize(journey.summary).map(stem),
      steps: tokenize(journey.steps.map((step) => step.title).join(' ')).map(stem),
    },
  }));

  // Racines connues (pour corriger les fautes de frappe)
  const vocabulary = new Set();
  [...docs, ...journeyDocs].forEach((doc) => Object.values(doc.stems).flat().forEach((key) => vocabulary.add(key)));

  const expand = (token) => {
    const key = stem(token);
    const variants = new Map([[key, 1]]);
    (synonymMap.get(key) || []).forEach((synonym) => { if (!variants.has(synonym)) variants.set(synonym, 0.7); });
    if (!vocabulary.has(key) && key.length >= 4) {
      const tolerance = key.length >= 7 ? 2 : 1;
      vocabulary.forEach((candidate) => {
        if (candidate.length >= 4 && distance(key, candidate, tolerance) <= tolerance && !variants.has(candidate)) variants.set(candidate, 0.6);
      });
    }
    // Recherche partielle : « inscr » trouve « inscri »
    if (key.length >= 3) vocabulary.forEach((candidate) => { if (candidate !== key && candidate.startsWith(key) && !variants.has(candidate)) variants.set(candidate, 0.5); });
    return variants;
  };

  function scoreStems(stems, variantsPerToken) {
    let total = 0;
    let matched = 0;
    variantsPerToken.forEach((variants) => {
      let best = 0;
      Object.entries(stems).forEach(([field, list]) => {
        const weight = FIELD_WEIGHTS[field] || 1;
        variants.forEach((factor, key) => {
          if (list.includes(key)) best = Math.max(best, weight * factor);
        });
      });
      if (best > 0) matched += 1;
      total += best;
    });
    return { total, matched };
  }

  return function search(query, { limit = 12, allowedOnly = false } = {}) {
    const normalized = normalize(query);
    const tokens = tokenize(query);
    if (!tokens.length) return { results: [], journeys: [] };
    const variantsPerToken = tokens.map(expand);
    const wantsErrors = ERROR_INTENT.test(normalized);
    const wantsHowTo = HOWTO_INTENT.test(`${normalized} `);

    const results = docs.map(({ feature, stems }) => {
      const { total, matched } = scoreStems(stems, variantsPerToken);
      if (!matched) return null;
      let score = total * (0.5 + matched / tokens.length);
      if (feature.type === 'subtab') score *= 1.15;
      if (feature.type === 'module') score *= 0.8;
      if (feature.type === 'action') score *= wantsHowTo || !wantsErrors ? 1.05 : 0.9;
      // Les explications d'erreurs ressortent quand la question parle d'un blocage
      const errorHits = wantsErrors && feature.errors?.length
        ? feature.errors
          // Une question sur un enregistrement n'a pas pour cause un refus de suppression, et inversement.
          .filter((error) => !/supprim/i.test(error.message) || /supprim|effac|retir|enlev/.test(normalized))
          .map((error) => ({ error, ...scoreStems({ errors: tokenize(error.message).map(stem) }, variantsPerToken) }))
          .filter((hit) => hit.matched > 0)
          .sort((a, b) => b.total - a.total)
        : [];
      if (errorHits.length) score += errorHits[0].total * 1.5;
      if (allowedOnly && !feature.allowed) return null;
      return { feature, score, matched, errorHits: errorHits.slice(0, 3).map((hit) => hit.error) };
    }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, limit);

    const matchedJourneys = journeyDocs.map(({ journey, stems }) => {
      const { total, matched } = scoreStems(stems, variantsPerToken);
      return matched ? { journey, score: total * (0.5 + matched / tokens.length) } : null;
    }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 3);

    return { results, journeys: matchedJourneys.map((item) => item.journey), tokens };
  };
}
