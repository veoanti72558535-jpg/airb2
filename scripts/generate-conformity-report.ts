/**
 * Conformity report generator — bilingual FR/EN, 100% deterministic, NO AI.
 *
 * Pour chaque "golden case" du projet, ce script :
 *   1. Charge les inputs canoniques (BallisticInput).
 *   2. Exécute le moteur AirBallistik (calculateTrajectory) — moteur figé,
 *      pas de provider IA, pas de fetch externe.
 *   3. Si une référence externe existe (cross-validation case), aligne les
 *      sorties moteur sur les distances de référence et calcule les écarts
 *      via `compareReference` (tolérances par défaut).
 *   4. Émet un verdict de conformité (PASS / INDICATIVE / FAIL) selon les
 *      mêmes règles que le harness BUILD-B.
 *   5. Sérialise tout en un rapport markdown bilingue (FR + EN côte à côte
 *      dans le même document).
 *
 * Sortie : /mnt/documents/conformity-report.md
 *
 * Usage :
 *   bun scripts/generate-conformity-report.ts
 *
 * Notes :
 *  - Les "golden cases" couverts ici = (a) `GOLDEN_FIXTURES` snapshot suite
 *    + (b) cas cross-validation présents sous `src/lib/__fixtures__/cross-validation/`.
 *  - Pour les fixtures golden sans référence externe, le rapport indique
 *    explicitement "no reference / pas de référence" — le moteur n'est PAS
 *    déclaré conforme par défaut, statut = `BASELINE` (snapshot only).
 *  - Aucun fichier produit ne mute le repo. Tout va dans /mnt/documents/.
 */

import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { calculateTrajectory } from '../src/lib/ballistics';
import {
  compareReference,
  type ComparisonStatus,
  type ReferenceComparisonResult,
} from '../src/lib/cross-validation/compare';
import { parseExternalReferenceCsv } from '../src/lib/cross-validation/loader';
import type {
  CrossValidationCase,
  ExternalReference,
  ReferenceMeta,
} from '../src/lib/cross-validation/types';
import { GOLDEN_FIXTURES } from '../src/lib/__fixtures__/sessions/golden/fixtures';
import type { BallisticInput, BallisticResult } from '../src/lib/types';

// ----------------------------------------------------------------------------
// Types internes
// ----------------------------------------------------------------------------

type GoldenSource = 'fixtures-suite' | 'cross-validation';

interface GoldenCaseEntry {
  id: string;
  description: string;
  source: GoldenSource;
  caliber?: string;
  projectileType?: string;
  inputs: BallisticInput;
  references: ExternalReference[];
  notes?: string;
}

interface PerCaseReport {
  entry: GoldenCaseEntry;
  engineRows: BallisticResult[];
  comparisons: ReferenceComparisonResult[];
  /** Verdict consolidé : pire des références, ou BASELINE si aucune ref. */
  verdict: ComparisonStatus | 'BASELINE';
}

// ----------------------------------------------------------------------------
// Discovery — golden fixtures (snapshot suite, sans référence externe)
// ----------------------------------------------------------------------------

function loadFixturesSuite(): GoldenCaseEntry[] {
  return GOLDEN_FIXTURES.map((fx) => ({
    id: fx.id,
    description: fx.description,
    source: 'fixtures-suite' as const,
    caliber: fx.caliber,
    projectileType: fx.projectileType,
    inputs: fx.input,
    references: [],
  }));
}

// ----------------------------------------------------------------------------
// Discovery — cross-validation cases (avec références externes)
// ----------------------------------------------------------------------------

const CV_DIR = join(process.cwd(), 'src/lib/__fixtures__/cross-validation');

interface CaseManifest {
  id: string;
  description: string;
  tags?: string[];
  inputsFile: string;
  references: Array<{ metaFile: string; csvFile: string }>;
  notes?: string;
}

function loadCrossValidationCases(): GoldenCaseEntry[] {
  let entries: GoldenCaseEntry[] = [];
  let dirContent: string[];
  try {
    dirContent = readdirSync(CV_DIR);
  } catch {
    return entries;
  }

  for (const name of dirContent) {
    const full = join(CV_DIR, name);
    if (!statSync(full).isDirectory()) continue;
    const manifestPath = join(full, 'case.json');
    try {
      statSync(manifestPath);
    } catch {
      continue;
    }

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as CaseManifest;
    const inputs = JSON.parse(
      readFileSync(join(full, manifest.inputsFile), 'utf-8'),
    ) as BallisticInput;

    const references: ExternalReference[] = manifest.references.map((ref) => {
      const meta = JSON.parse(readFileSync(join(full, ref.metaFile), 'utf-8')) as ReferenceMeta;
      const csv = readFileSync(join(full, ref.csvFile), 'utf-8');
      const parsed = parseExternalReferenceCsv(csv);
      return { meta, rows: parsed.rows };
    });

    entries.push({
      id: manifest.id,
      description: manifest.description,
      source: 'cross-validation',
      inputs,
      references,
      notes: manifest.notes,
    });
  }
  return entries;
}

// ----------------------------------------------------------------------------
// Run engine + compare
// ----------------------------------------------------------------------------

function processCase(entry: GoldenCaseEntry): PerCaseReport {
  const engineRows = calculateTrajectory(entry.inputs);

  if (entry.references.length === 0) {
    return { entry, engineRows, comparisons: [], verdict: 'BASELINE' };
  }

  const cvCase: CrossValidationCase = {
    id: entry.id,
    description: entry.description,
    inputs: entry.inputs,
    references: entry.references,
  };
  const comparisons = entry.references.map((ref) =>
    compareReference(cvCase, ref, engineRows),
  );

  const rank: Record<ComparisonStatus, number> = { PASS: 0, INDICATIVE: 1, FAIL: 2 };
  const worst = comparisons.reduce<ComparisonStatus>(
    (acc, c) => (rank[c.status] > rank[acc] ? c.status : acc),
    'PASS',
  );
  return { entry, engineRows, comparisons, verdict: worst };
}

// ----------------------------------------------------------------------------
// Markdown rendering — bilingue
// ----------------------------------------------------------------------------

function fmt(n: number | undefined, digits = 2): string {
  if (n === undefined || Number.isNaN(n)) return '—';
  return n.toFixed(digits);
}

function badge(status: ComparisonStatus | 'BASELINE'): string {
  switch (status) {
    case 'PASS':
      return '✅ **PASS**';
    case 'FAIL':
      return '❌ **FAIL**';
    case 'INDICATIVE':
      return '⚠️ **INDICATIVE**';
    case 'BASELINE':
      return '📌 **BASELINE**';
  }
}

function renderInputsTable(input: BallisticInput): string {
  const w = input.weather;
  return [
    '| Field / Champ | Value |',
    '|---|---|',
    `| Muzzle velocity / Vitesse initiale | ${fmt(input.muzzleVelocity, 2)} m/s |`,
    `| BC | ${fmt(input.bc, 4)} (${input.dragModel ?? 'G1'}) |`,
    `| Projectile weight / Poids | ${fmt(input.projectileWeight, 2)} gr |`,
    `| Sight height / Hauteur de visée | ${fmt(input.sightHeight, 1)} mm |`,
    `| Zero range / Distance de zéro | ${fmt(input.zeroRange, 1)} m |`,
    `| Max range / Distance max | ${fmt(input.maxRange, 0)} m |`,
    `| Range step / Pas | ${fmt(input.rangeStep, 0)} m |`,
    `| Temperature / Température | ${fmt(w.temperature, 1)} °C |`,
    `| Pressure / Pression | ${fmt(w.pressure, 1)} hPa |`,
    `| Humidity / Humidité | ${fmt(w.humidity, 0)} % |`,
    `| Altitude | ${fmt(w.altitude, 0)} m |`,
    `| Wind / Vent | ${fmt(w.windSpeed, 1)} m/s @ ${fmt(w.windAngle, 0)}° |`,
  ].join('\n');
}

function renderEngineTable(rows: BallisticResult[]): string {
  const head = [
    '| Range (m) | Drop (mm) | Velocity (m/s) | TOF (s) | Wind (mm) | Energy (J) |',
    '|---:|---:|---:|---:|---:|---:|',
  ];
  const body = rows.map(
    (r) =>
      `| ${r.range} | ${fmt(r.drop, 2)} | ${fmt(r.velocity, 2)} | ${fmt(r.tof, 4)} | ${fmt(r.windDrift, 2)} | ${fmt(r.energy, 2)} |`,
  );
  return [...head, ...body].join('\n');
}

function renderComparison(cmp: ReferenceComparisonResult): string {
  const lines: string[] = [];
  lines.push(
    `**Reference / Référence :** ${cmp.source} — \`${cmp.version}\` — confidence/confiance \`${cmp.confidence}\``,
  );
  lines.push('');
  lines.push(`**Status / Statut :** ${badge(cmp.status)}`);
  lines.push('');

  if (cmp.metricSummaries.length > 0) {
    lines.push('**Per-metric summary / Synthèse par métrique :**');
    lines.push('');
    lines.push('| Metric | N | Failures / Échecs | Max |Δ| abs | Max |Δ| rel |');
    lines.push('|---|---:|---:|---:|---:|');
    for (const m of cmp.metricSummaries) {
      const rel = m.maxRelDelta === null ? '—' : `${(m.maxRelDelta * 100).toFixed(2)} %`;
      lines.push(
        `| ${m.metric} | ${m.count} | ${m.failures} | ${m.maxAbsDelta.toFixed(3)} | ${rel} |`,
      );
    }
    lines.push('');
  }

  // Per-line detail
  if (cmp.lines.length > 0) {
    lines.push('**Per-line deltas / Écarts ligne par ligne :**');
    lines.push('');
    lines.push('| Range (m) | Metric | Engine / Moteur | Reference / Référence | Δ abs | Δ rel | Within tol. |');
    lines.push('|---:|---|---:|---:|---:|---:|:---:|');
    for (const line of cmp.lines) {
      if (!line.engineRowFound) {
        lines.push(
          `| ${line.range} | — | _no engine row / aucune ligne moteur_ | — | — | — | ❌ |`,
        );
        continue;
      }
      for (const m of line.metrics) {
        const rel = m.relativeDelta === null ? '—' : `${(m.relativeDelta * 100).toFixed(2)} %`;
        lines.push(
          `| ${line.range} | ${m.metric} | ${m.engineValue.toFixed(3)} | ${m.referenceValue.toFixed(3)} | ${m.absoluteDelta.toFixed(3)} | ${rel} | ${m.withinTolerance ? '✅' : '❌'} |`,
        );
      }
    }
    lines.push('');
  }

  if (cmp.warnings.length > 0) {
    lines.push('**Warnings / Avertissements :**');
    for (const w of cmp.warnings) {
      lines.push(`- \`${w.kind}\` — ${w.detail}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function renderConclusion(report: PerCaseReport): string {
  const FR: Record<typeof report.verdict, string> = {
    PASS: 'Conforme : toutes les comparaisons sont dans les tolérances par défaut.',
    INDICATIVE:
      'Indicatif : aucune comparaison hors tolérance, mais la confiance source est `C` ou aucune métrique comparable n\'est disponible. À ne pas considérer comme une validation forte.',
    FAIL: 'Non conforme : au moins une comparaison sort des tolérances. Investigation requise (cf. lignes marquées ❌).',
    BASELINE:
      'Baseline snapshot uniquement : ce cas n\'a pas de référence externe. Le moteur tourne et produit une trajectoire, le test golden snapshot vérifie sa stabilité bit-exact, mais aucune confrontation à un oracle externe n\'est faite ici.',
  };
  const EN: Record<typeof report.verdict, string> = {
    PASS: 'Conforming: every compared metric stays within default tolerances.',
    INDICATIVE:
      'Indicative only: no out-of-tolerance comparison, but source confidence is `C` or no metric was actually comparable. Do not treat as strong validation.',
    FAIL: 'Non-conforming: at least one comparison falls outside tolerance. Investigation required (see rows flagged ❌).',
    BASELINE:
      'Baseline snapshot only: this case has no external reference. The engine runs and produces a trajectory, the golden snapshot test pins it bit-exact, but no external oracle confrontation happens here.',
  };
  return [
    '**Conclusion (FR) :** ' + FR[report.verdict],
    '',
    '**Conclusion (EN):** ' + EN[report.verdict],
  ].join('\n');
}

function renderCase(report: PerCaseReport): string {
  const e = report.entry;
  const out: string[] = [];
  out.push(`## ${e.id}`);
  out.push('');
  out.push(`_${e.description}_`);
  out.push('');
  out.push(
    `- **Source / Origine** : \`${e.source}\`` +
      (e.caliber ? ` · caliber ${e.caliber}` : '') +
      (e.projectileType ? ` · ${e.projectileType}` : ''),
  );
  out.push(`- **Verdict** : ${badge(report.verdict)}`);
  out.push('');
  out.push('### Inputs / Entrées');
  out.push('');
  out.push(renderInputsTable(e.inputs));
  out.push('');
  out.push('### Engine outputs / Sorties moteur');
  out.push('');
  out.push(renderEngineTable(report.engineRows));
  out.push('');
  if (report.comparisons.length === 0) {
    out.push('### Reference comparison / Comparaison référence');
    out.push('');
    out.push('_No external reference attached to this case. / Aucune référence externe rattachée à ce cas._');
    out.push('');
  } else {
    for (const cmp of report.comparisons) {
      out.push('### Reference comparison / Comparaison référence');
      out.push('');
      out.push(renderComparison(cmp));
    }
  }
  out.push('### Conclusion');
  out.push('');
  out.push(renderConclusion(report));
  out.push('');
  out.push('---');
  out.push('');
  return out.join('\n');
}

function renderHeader(reports: PerCaseReport[]): string {
  const total = reports.length;
  const counts = reports.reduce<Record<string, number>>((acc, r) => {
    acc[r.verdict] = (acc[r.verdict] ?? 0) + 1;
    return acc;
  }, {});
  const now = new Date().toISOString();

  const out: string[] = [];
  out.push('# Conformity Report — Rapport de conformité');
  out.push('');
  out.push(
    '> **EN —** Auto-generated, deterministic, **no AI in the loop**. Each golden case is fed to the AirBallistik engine; outputs are compared to attached external references (when present) using the BUILD-B harness with default tolerances.',
  );
  out.push('>');
  out.push(
    '> **FR —** Généré automatiquement, déterministe, **sans IA**. Chaque "golden case" est passé au moteur AirBallistik ; les sorties sont confrontées aux références externes attachées (si présentes) via le harness BUILD-B avec les tolérances par défaut.',
  );
  out.push('');
  out.push(`- Generated at / Généré le : \`${now}\``);
  out.push(`- Total cases / Cas totaux : **${total}**`);
  for (const k of ['PASS', 'INDICATIVE', 'FAIL', 'BASELINE'] as const) {
    if (counts[k]) out.push(`- ${badge(k)} : ${counts[k]}`);
  }
  out.push('');
  out.push('## Summary table / Tableau récapitulatif');
  out.push('');
  out.push('| Case ID | Source | Verdict | References / Réf. |');
  out.push('|---|---|:---:|---:|');
  for (const r of reports) {
    out.push(
      `| [\`${r.entry.id}\`](#${r.entry.id.toLowerCase()}) | ${r.entry.source} | ${badge(r.verdict)} | ${r.entry.references.length} |`,
    );
  }
  out.push('');
  out.push('---');
  out.push('');
  return out.join('\n');
}

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------

function main() {
  const entries: GoldenCaseEntry[] = [...loadFixturesSuite(), ...loadCrossValidationCases()];
  if (entries.length === 0) {
    console.error('No golden cases found.');
    process.exit(1);
  }

  const reports = entries.map(processCase);

  const md = renderHeader(reports) + reports.map(renderCase).join('');

  const outDir = '/mnt/documents';
  try {
    mkdirSync(outDir, { recursive: true });
  } catch {
    // ignore
  }
  const outPath = join(outDir, 'conformity-report.md');
  writeFileSync(outPath, md, 'utf-8');

  console.log(`✓ Report written to ${outPath}`);
  console.log(`  ${reports.length} cases processed.`);
  for (const r of reports) {
    console.log(`  - ${r.entry.id}: ${r.verdict}`);
  }
}

main();