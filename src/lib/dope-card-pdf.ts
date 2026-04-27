/**
 * G7 — Professional Dope Card PDF generator.
 * Generates a printable A5-format card with trajectory table, metadata,
 * weather conditions, and a mini trajectory chart.
 */
import jsPDF from 'jspdf';
import type { BallisticResult, BallisticInput, Session } from '@/lib/types';

interface DopeCardOptions {
  session: Session;
  results: BallisticResult[];
  locale: 'fr' | 'en';
}

const LABELS = {
  fr: {
    title: 'CARTE DE TIR',
    subtitle: 'AirBallistiK — Dope Card',
    range: 'Dist.',
    drop: 'Chute',
    holdover: 'Corr.',
    velocity: 'Vit.',
    energy: 'Énergie',
    windDrift: 'Dérive',
    clicks: 'Clics',
    tof: 'TdV',
    conditions: 'Conditions',
    temp: 'Temp.',
    humidity: 'Hum.',
    pressure: 'Press.',
    altitude: 'Alt.',
    wind: 'Vent',
    setup: 'Configuration',
    mv: 'V0',
    bc: 'BC',
    zero: 'Zéro',
    sightH: 'Haut. opt.',
    weight: 'Poids',
    dragModel: 'Modèle',
    generated: 'Généré le',
    page: 'Page',
    units: { m: 'm', mm: 'mm', ms: 'm/s', j: 'J', s: 's', gr: 'gr', hpa: 'hPa', pct: '%', degC: '°C' },
  },
  en: {
    title: 'DOPE CARD',
    subtitle: 'AirBallistiK — Dope Card',
    range: 'Range',
    drop: 'Drop',
    holdover: 'Hold.',
    velocity: 'Vel.',
    energy: 'Energy',
    windDrift: 'W.Drift',
    clicks: 'Clicks',
    tof: 'ToF',
    conditions: 'Conditions',
    temp: 'Temp.',
    humidity: 'Hum.',
    pressure: 'Press.',
    altitude: 'Alt.',
    wind: 'Wind',
    setup: 'Setup',
    mv: 'MV',
    bc: 'BC',
    zero: 'Zero',
    sightH: 'Sight H.',
    weight: 'Weight',
    dragModel: 'Model',
    generated: 'Generated',
    page: 'Page',
    units: { m: 'm', mm: 'mm', ms: 'm/s', j: 'J', s: 's', gr: 'gr', hpa: 'hPa', pct: '%', degC: '°C' },
  },
};

/**
 * Generate and download a professional Dope Card PDF.
 */
export function generateDopeCardPDF({ session, results, locale }: DopeCardOptions): void {
  const L = LABELS[locale] ?? LABELS.fr;
  const input = session.input;
  const clickUnit = input.clickUnit ?? 'MOA';

  // A5 landscape for field use
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a5' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // ── Background ──
  doc.setFillColor(17, 17, 17);
  doc.rect(0, 0, W, H, 'F');

  // ── Header ──
  doc.setTextColor(34, 197, 94); // #22C55E
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(L.title, 8, 10);

  doc.setFontSize(7);
  doc.setTextColor(160, 160, 160);
  doc.text(L.subtitle, 8, 14);

  // Session name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text(session.name || '—', 8, 20);

  // Date
  doc.setFontSize(6);
  doc.setTextColor(120, 120, 120);
  doc.text(`${L.generated} ${new Date().toLocaleDateString(locale)}`, W - 8, 10, { align: 'right' });

  // ── Setup box ──
  const boxY = 24;
  doc.setFillColor(30, 30, 30);
  doc.roundedRect(8, boxY, W / 2 - 12, 18, 2, 2, 'F');
  doc.setTextColor(34, 197, 94);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text(L.setup, 11, boxY + 4);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 200, 200);
  const setupLines = [
    `${L.mv}: ${input.muzzleVelocity} ${L.units.ms}  |  ${L.bc}: ${input.bc}  |  ${L.dragModel}: ${input.dragModel ?? 'G1'}`,
    `${L.zero}: ${input.zeroRange} ${L.units.m}  |  ${L.sightH}: ${input.sightHeight} ${L.units.mm}  |  ${L.weight}: ${input.projectileWeight} ${L.units.gr}`,
  ];
  doc.setFontSize(5.5);
  setupLines.forEach((line, i) => doc.text(line, 11, boxY + 8 + i * 4));

  // ── Conditions box ──
  doc.setFillColor(30, 30, 30);
  doc.roundedRect(W / 2 + 4, boxY, W / 2 - 12, 18, 2, 2, 'F');
  doc.setTextColor(34, 197, 94);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text(L.conditions, W / 2 + 7, boxY + 4);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 200, 200);
  const weather = input.weather;
  const condLines = [
    `${L.temp}: ${weather.temperature}${L.units.degC}  |  ${L.humidity}: ${weather.humidity}${L.units.pct}  |  ${L.pressure}: ${weather.pressure} ${L.units.hpa}`,
    `${L.altitude}: ${weather.altitude} ${L.units.m}  |  ${L.wind}: ${weather.windSpeed} ${L.units.ms} @ ${weather.windAngle}°`,
  ];
  doc.setFontSize(5.5);
  condLines.forEach((line, i) => doc.text(line, W / 2 + 7, boxY + 8 + i * 4));

  // ── Table ──
  const tableY = boxY + 22;
  const cols = [
    { key: 'range', label: `${L.range}\n(${L.units.m})`, w: 14 },
    { key: 'drop', label: `${L.drop}\n(${L.units.mm})`, w: 16 },
    { key: 'holdover', label: `${L.holdover}\n(${clickUnit})`, w: 16 },
    { key: 'velocity', label: `${L.velocity}\n(${L.units.ms})`, w: 16 },
    { key: 'energy', label: `${L.energy}\n(${L.units.j})`, w: 16 },
    { key: 'windDrift', label: `${L.windDrift}\n(${L.units.mm})`, w: 16 },
    { key: 'clicks', label: `${L.clicks}\n(elev)`, w: 14 },
    { key: 'tof', label: `${L.tof}\n(${L.units.s})`, w: 14 },
  ];

  const colStartX = 8;
  const rowH = 4.5;
  const headerH = 7;

  // Header row
  doc.setFillColor(34, 197, 94);
  doc.rect(colStartX, tableY, cols.reduce((s, c) => s + c.w, 0), headerH, 'F');
  doc.setTextColor(17, 17, 17);
  doc.setFontSize(5);
  doc.setFont('helvetica', 'bold');

  let cx = colStartX;
  cols.forEach((col) => {
    const lines = col.label.split('\n');
    doc.text(lines[0], cx + col.w / 2, tableY + 3, { align: 'center' });
    if (lines[1]) {
      doc.setFontSize(4);
      doc.text(lines[1], cx + col.w / 2, tableY + 5.5, { align: 'center' });
      doc.setFontSize(5);
    }
    cx += col.w;
  });

  // Data rows
  doc.setFont('courier', 'normal');
  doc.setFontSize(5);
  const filteredResults = results.filter((r) => r.range > 0);
  const maxRows = Math.min(filteredResults.length, Math.floor((H - tableY - headerH - 8) / rowH));

  for (let i = 0; i < maxRows; i++) {
    const r = filteredResults[i];
    const ry = tableY + headerH + i * rowH;

    // Alternating row colors
    doc.setFillColor(i % 2 === 0 ? 25 : 30, i % 2 === 0 ? 25 : 30, i % 2 === 0 ? 25 : 30);
    doc.rect(colStartX, ry, cols.reduce((s, c) => s + c.w, 0), rowH, 'F');

    // Zero line highlight
    if (r.range === input.zeroRange) {
      doc.setFillColor(34, 197, 94, 0.15);
      doc.rect(colStartX, ry, cols.reduce((s, c) => s + c.w, 0), rowH, 'F');
    }

    doc.setTextColor(200, 200, 200);
    cx = colStartX;
    const holdVal = clickUnit === 'MRAD' ? r.holdoverMRAD : r.holdover;
    const values = [
      r.range.toString(),
      r.drop.toFixed(1),
      holdVal.toFixed(2),
      Math.round(r.velocity).toString(),
      r.energy.toFixed(1),
      r.windDrift.toFixed(1),
      (r.clicksElevation ?? 0).toFixed(1),
      r.tof.toFixed(3),
    ];

    values.forEach((val, j) => {
      doc.text(val, cx + cols[j].w / 2, ry + 3.2, { align: 'center' });
      cx += cols[j].w;
    });
  }

  // ── Footer ──
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(4.5);
  doc.setFont('helvetica', 'italic');
  doc.text('AirBallistiK v1.0.0 — Les données IA portent la mention "confidence C" et nécessitent une vérification terrain.', 8, H - 4);
  doc.text(`${L.page} 1/1`, W - 8, H - 4, { align: 'right' });

  // ── Download ──
  const filename = `dopecard_${session.name?.replace(/\s+/g, '_') || session.id.slice(0, 8)}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
