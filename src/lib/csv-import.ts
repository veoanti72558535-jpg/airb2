/**
 * C2 — CSV/Excel projectile importer.
 * Parses CSV text with columns: brand, model, weight, bc, caliber, bcModel, type.
 * Handles common separators (comma, semicolon, tab) and ignores header rows.
 */
import type { Projectile, DragModel, ProjectileType } from '@/lib/types';

interface ImportResult {
  imported: Projectile[];
  errors: string[];
  skipped: number;
}

const VALID_DRAG_MODELS: DragModel[] = ['G1', 'G7', 'GA', 'GS', 'RA4', 'GA2', 'SLG0', 'SLG1'];
const VALID_TYPES: ProjectileType[] = ['pellet', 'slug', 'bb', 'dart', 'other'];

function detectSeparator(line: string): string {
  if (line.includes('\t')) return '\t';
  if (line.includes(';')) return ';';
  return ',';
}

function isHeaderRow(cells: string[]): boolean {
  const headerKeywords = ['brand', 'model', 'weight', 'bc', 'caliber', 'marque', 'modèle', 'poids', 'calibre'];
  return cells.some((c) => headerKeywords.includes(c.toLowerCase().trim()));
}

/**
 * Parse CSV text into Projectile objects.
 * Expected columns (order flexible): brand, model, weight(gr), bc, caliber
 * Optional: bcModel, projectileType
 */
export function parseProjectileCsv(csvText: string): ImportResult {
  const lines = csvText.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { imported: [], errors: ['Fichier vide'], skipped: 0 };

  const sep = detectSeparator(lines[0]);
  const rows = lines.map((line) => line.split(sep).map((c) => c.trim().replace(/^["']|["']$/g, '')));

  // Detect header
  let startIndex = 0;
  let colMap: Record<string, number> = {};

  if (isHeaderRow(rows[0])) {
    const headers = rows[0].map((h) => h.toLowerCase().replace(/[^a-z]/g, ''));
    headers.forEach((h, i) => {
      if (h.includes('brand') || h.includes('marque')) colMap.brand = i;
      else if (h.includes('model') || h.includes('modele')) colMap.model = i;
      else if (h.includes('weight') || h.includes('poids') || h.includes('grain')) colMap.weight = i;
      else if (h === 'bc' || h.includes('coefficient')) colMap.bc = i;
      else if (h.includes('caliber') || h.includes('calibre')) colMap.caliber = i;
      else if (h.includes('drag') || h.includes('bcmodel')) colMap.bcModel = i;
      else if (h.includes('type')) colMap.type = i;
    });
    startIndex = 1;
  } else {
    // Assume: brand, model, weight, bc, caliber
    colMap = { brand: 0, model: 1, weight: 2, bc: 3, caliber: 4, bcModel: 5, type: 6 };
  }

  const imported: Projectile[] = [];
  const errors: string[] = [];
  let skipped = 0;

  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    try {
      const brand = row[colMap.brand] ?? '';
      const model = row[colMap.model] ?? '';
      const weight = parseFloat(row[colMap.weight] ?? '');
      const bc = parseFloat(row[colMap.bc] ?? '');
      const caliber = row[colMap.caliber] ?? '';

      if (!brand || !model || isNaN(weight) || isNaN(bc) || weight <= 0 || bc <= 0) {
        skipped++;
        continue;
      }

      const rawDragModel = (row[colMap.bcModel] ?? 'G1').toUpperCase() as DragModel;
      const bcModel = VALID_DRAG_MODELS.includes(rawDragModel) ? rawDragModel : 'G1';

      const rawType = (row[colMap.type] ?? 'pellet').toLowerCase() as ProjectileType;
      const projectileType = VALID_TYPES.includes(rawType) ? rawType : 'pellet';

      const now = new Date().toISOString();
      imported.push({
        id: crypto.randomUUID(),
        brand,
        model,
        weight,
        bc,
        bcModel,
        projectileType,
        caliber,
        importedFrom: 'json-user',
        createdAt: now,
        updatedAt: now,
      });
    } catch (e) {
      errors.push(`Ligne ${i + 1}: ${String(e)}`);
    }
  }

  return { imported, errors, skipped };
}
