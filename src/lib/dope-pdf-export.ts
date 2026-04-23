/**
 * DOPE Card PDF export — 100% client-side via jsPDF (no html2canvas).
 * Generates a landscape A4 PDF with ballistic data for field use.
 */
import { jsPDF } from 'jspdf';
import type { Session, BallisticResult } from '@/lib/types';

/* ── helpers ─────────────────────────────────────────────── */

function msToFps(ms: number) { return +(ms * 3.28084).toFixed(0); }

function fmt(v: number, d = 1) { return v.toFixed(d); }

function sanitizeName(name: string) {
  return name.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 40);
}

/** Pick ≤ maxRows rows from results, skipping range=0, evenly spaced. */
function pickRows(results: BallisticResult[], maxRows: number): BallisticResult[] {
  const rows = results.filter(r => r.range > 0);
  if (rows.length <= maxRows) return rows;
  const step = (rows.length - 1) / (maxRows - 1);
  const picked: BallisticResult[] = [];
  for (let i = 0; i < maxRows; i++) {
    picked.push(rows[Math.round(i * step)]);
  }
  return picked;
}

/* ── colours ─────────────────────────────────────────────── */
const C = {
  primary: [33, 33, 33] as [number, number, number],
  muted: [120, 120, 120] as [number, number, number],
  accent: [180, 130, 10] as [number, number, number],
  headerBg: [240, 240, 240] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  line: [200, 200, 200] as [number, number, number],
  warn: [180, 60, 30] as [number, number, number],
};

/* ── main export ─────────────────────────────────────────── */

export interface DopePdfOptions {
  lang: 'fr' | 'en';
}

export async function exportDopePdf(
  session: Session,
  opts: DopePdfOptions = { lang: 'fr' },
): Promise<void> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const margin = 8;
  let y = margin;

  const l = opts.lang === 'fr';

  /* ── HEADER ────────────────────────────────────────── */
  doc.setFillColor(...C.accent);
  doc.rect(0, 0, W, 14, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...C.white);
  doc.text('AirBallistik — DOPE Card', margin, 9.5);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(session.name, W - margin, 9.5, { align: 'right' });
  y = 18;

  doc.setFontSize(7);
  doc.setTextColor(...C.muted);
  doc.text(`${l ? 'Créée le' : 'Created'} ${new Date(session.createdAt).toLocaleString()}`, margin, y);
  y += 5;

  /* ── INFO BLOCKS (3 columns) ───────────────────────── */
  const inp = session.input;
  const colW = (W - 2 * margin) / 3;

  const drawBlock = (x: number, title: string, lines: string[]) => {
    const blockY = y;
    doc.setFillColor(...C.headerBg);
    doc.roundedRect(x, blockY, colW - 2, 4 + lines.length * 3.5 + 1, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...C.accent);
    doc.text(title, x + 2, blockY + 3.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...C.primary);
    lines.forEach((line, i) => {
      doc.text(line, x + 2, blockY + 7 + i * 3.5);
    });
    return 4 + lines.length * 3.5 + 2;
  };

  const h1 = drawBlock(margin, l ? 'ARME & OPTIQUE' : 'WEAPON & OPTIC', [
    `${l ? 'Hauteur optique' : 'Sight height'}: ${inp.sightHeight} mm`,
    `${l ? 'Distance zéro' : 'Zero range'}: ${inp.zeroRange} m`,
    `${l ? 'Clics' : 'Clicks'}: ${inp.clickValue ?? '—'} ${inp.clickUnit ?? 'MRAD'}`,
  ]);

  const h2 = drawBlock(margin + colW, 'PROJECTILE', [
    `${l ? 'Poids' : 'Weight'}: ${inp.projectileWeight} gr`,
    `BC G1: ${inp.bc}`,
    `${l ? 'Vitesse' : 'Velocity'}: ${inp.muzzleVelocity} m/s (${msToFps(inp.muzzleVelocity)} fps)`,
  ]);

  const w = inp.weather;
  const h3 = drawBlock(margin + colW * 2, l ? 'ATMOSPHÈRE' : 'ATMOSPHERE', [
    `${l ? 'Temp' : 'Temp'}: ${w.temperature}°C | ${l ? 'Pression' : 'Pressure'}: ${w.pressure} hPa`,
    `${l ? 'Altitude' : 'Altitude'}: ${w.altitude} m`,
    `${l ? 'Vent' : 'Wind'}: ${w.windSpeed} m/s @ ${w.windAngle}°`,
  ]);

  y += Math.max(h1, h2, h3) + 2;

  /* ── BALLISTIC TABLE ──────────────────────────────── */
  const rows = pickRows(session.results, 30);
  if (rows.length === 0) {
    doc.setFontSize(9);
    doc.setTextColor(...C.muted);
    doc.text(l ? 'Aucun résultat dans cette session.' : 'No results in this session.', margin, y + 5);
  } else {
    const headers = [
      l ? 'Dist (m)' : 'Range (m)',
      'Drop (mm)',
      l ? 'Clics élév.' : 'Elev. clicks',
      l ? 'Vit. (m/s)' : 'Vel. (m/s)',
      l ? 'Énergie (J)' : 'Energy (J)',
      l ? 'Dérive (mm)' : 'Drift (mm)',
      l ? 'Clics vent' : 'Wind clicks',
      'TOF (s)',
    ];
    const tableX = margin;
    const cw = (W - 2 * margin) / headers.length;
    const rowH = 4.2;

    // Header
    doc.setFillColor(...C.accent);
    doc.rect(tableX, y, W - 2 * margin, rowH + 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(...C.white);
    headers.forEach((h, i) => {
      doc.text(h, tableX + i * cw + cw / 2, y + 3.2, { align: 'center' });
    });
    y += rowH + 1;

    // Data rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    rows.forEach((r, ri) => {
      if (ri % 2 === 0) {
        doc.setFillColor(...C.headerBg);
        doc.rect(tableX, y, W - 2 * margin, rowH, 'F');
      }
      doc.setTextColor(...C.primary);
      const vals = [
        String(r.range),
        fmt(r.drop),
        r.clicksElevation != null ? fmt(r.clicksElevation, 1) : '—',
        fmt(r.velocity, 0),
        fmt(r.energy, 1),
        fmt(r.windDrift, 1),
        r.clicksWindage != null ? fmt(r.clicksWindage, 1) : '—',
        fmt(r.tof, 3),
      ];
      vals.forEach((v, i) => {
        doc.text(v, tableX + i * cw + cw / 2, y + 3, { align: 'center' });
      });
      y += rowH;
    });
  }

  /* ── PBR section (if space) ────────────────────────── */
  // Lightweight: just import and compute inline to keep it simple
  if (session.results.length > 1 && y < H - 20) {
    try {
      const { computePointBlankRange } = await import('@/lib/pbr');
      const pbr = computePointBlankRange(session.results);
      if (pbr.startDistance > 0 && pbr.endDistance > 0) {
        y += 3;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...C.accent);
        doc.text(l ? 'PORTÉE BALISTIQUE PRATIQUE (PBR)' : 'POINT BLANK RANGE (PBR)', margin, y);
        y += 4;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(...C.primary);
        doc.text(`${pbr.startDistance} m → ${pbr.endDistance} m  |  ${l ? 'Zone vitale' : 'Kill zone'}: ±${pbr.vitalZoneMm} mm`, margin, y);
        y += 3;
      }
    } catch { /* PBR unavailable — skip silently */ }
  }

  /* ── FOOTER ────────────────────────────────────────── */
  doc.setDrawColor(...C.line);
  doc.line(margin, H - 12, W - margin, H - 12);
  doc.setFontSize(6);
  doc.setTextColor(...C.muted);
  doc.text(
    `${l ? 'Généré par' : 'Generated by'} AirBallistik — ${new Date().toLocaleString()}`,
    margin,
    H - 8,
  );

  // AI warning if engine metadata suggests inferred data
  if (session.metadataInferred) {
    doc.setTextColor(...C.warn);
    doc.text(
      l ? '⚠ Données IA — confidence C — vérifier avant utilisation'
        : '⚠ AI data — confidence C — verify before use',
      margin,
      H - 5,
    );
  }

  /* ── Save ──────────────────────────────────────────── */
  const filename = `DOPE_${sanitizeName(session.name)}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}