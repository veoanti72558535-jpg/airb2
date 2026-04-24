/**
 * SessionPrintView — vue dédiée à l'impression PDF d'une SESSION.
 *
 * Cette vue est :
 *  - INVISIBLE à l'écran (`.print-only` masque tout sauf à l'impression) ;
 *  - statique : elle lit `session.results`, ne re-calcule rien, n'appelle
 *    aucun moteur balistique. Pure couche présentation.
 *  - composée de blocs textuels + un mini-SVG trajectoire pour rester
 *    fidèle à l'écran sans dépendre de Recharts (lourd à imprimer).
 *
 * Le PDF est produit via `window.print()` côté browser → "Enregistrer en
 * PDF" disponible nativement sur tous les navigateurs modernes. Pas de
 * dépendance npm ajoutée, pas de service backend.
 */
import type { Session } from '@/lib/types';
import { useI18n } from '@/lib/i18n';

function fmt(n: number | undefined, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toFixed(digits);
}

/** Mini chart SVG sans dépendance — drop (mm) vs range (m). */
function PrintTrajectorySvg({ session }: { session: Session }) {
  const rows = session.results;
  if (rows.length < 2) return null;
  const W = 720;
  const H = 220;
  const pad = { l: 48, r: 12, t: 14, b: 28 };
  const xs = rows.map(r => r.range);
  const ys = rows.map(r => r.drop);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(0, ...ys);
  const yMax = Math.max(0, ...ys);
  const sx = (x: number) =>
    pad.l + ((x - xMin) / Math.max(1e-6, xMax - xMin)) * (W - pad.l - pad.r);
  const sy = (y: number) =>
    H - pad.b - ((y - yMin) / Math.max(1e-6, yMax - yMin)) * (H - pad.t - pad.b);
  const path = rows
    .map((r, i) => `${i === 0 ? 'M' : 'L'}${sx(r.range).toFixed(1)},${sy(r.drop).toFixed(1)}`)
    .join(' ');
  const zeroY = sy(0);
  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: 'auto', border: '1px solid #ddd' }}
    >
      {/* Axes */}
      <line x1={pad.l} y1={pad.t} x2={pad.l} y2={H - pad.b} stroke="#888" strokeWidth={0.5} />
      <line x1={pad.l} y1={H - pad.b} x2={W - pad.r} y2={H - pad.b} stroke="#888" strokeWidth={0.5} />
      {/* Zéro */}
      <line
        x1={pad.l}
        y1={zeroY}
        x2={W - pad.r}
        y2={zeroY}
        stroke="#bbb"
        strokeDasharray="3 3"
        strokeWidth={0.5}
      />
      {/* Courbe drop */}
      <path d={path} fill="none" stroke="#000" strokeWidth={1.2} />
      {/* Labels axes */}
      <text x={pad.l} y={H - 6} fontSize={9} fill="#444">
        {xMin.toFixed(0)} m
      </text>
      <text x={W - pad.r} y={H - 6} fontSize={9} fill="#444" textAnchor="end">
        {xMax.toFixed(0)} m
      </text>
      <text x={6} y={pad.t + 8} fontSize={9} fill="#444">
        {yMin.toFixed(0)} mm
      </text>
      <text x={6} y={H - pad.b - 2} fontSize={9} fill="#444">
        {yMax.toFixed(0)} mm
      </text>
    </svg>
  );
}

export function SessionPrintView({ session }: { session: Session }) {
  const { t, locale } = useI18n();
  const rows = session.results;
  // Plafonner la table à ~30 lignes pour rester sur 2-3 pages A4.
  const tableRows =
    rows.length > 30
      ? rows.filter((_, i) => i % Math.ceil(rows.length / 30) === 0)
      : rows;
  const zeroRow =
    rows.find(r => r.range === session.input.zeroRange) ??
    rows[Math.floor(rows.length / 2)];
  const lastRow = rows[rows.length - 1];
  const w = session.input.weather;
  const calcAt = session.calculatedAt
    ? new Date(session.calculatedAt).toLocaleString(locale)
    : '—';

  return (
    <div className="print-only" aria-hidden="true">
      <header>
        <h1>{session.name}</h1>
        <p className="meta-line">
          {t('sessionDetail.exportPdf')} · {new Date().toLocaleString(locale)} ·{' '}
          {t('sessions.calculated')}: {calcAt}
        </p>
        {session.tags.length > 0 && (
          <p className="meta-line">{t('sessions.tags')}: {session.tags.join(', ')}</p>
        )}
      </header>

      {/* KPIs */}
      <section>
        <h2>{t('common.summary' as never)}</h2>
        <table className="kpi-table">
          <tbody>
            <tr>
              <th>{t('calc.muzzleVelocity')}</th>
              <td>{fmt(session.input.muzzleVelocity, 1)} m/s</td>
              <th>BC</th>
              <td>{fmt(session.input.bc, 4)}</td>
            </tr>
            <tr>
              <th>{t('calc.zeroRange')}</th>
              <td>{session.input.zeroRange} m</td>
              <th>{t('calc.energy')}</th>
              <td>{zeroRow ? fmt(zeroRow.energy, 1) + ' J' : '—'}</td>
            </tr>
            <tr>
              <th>{t('calc.projectileWeight' as never)}</th>
              <td>{session.input.projectileWeight} gr</td>
              <th>{t('calc.maxRange')}</th>
              <td>{session.input.maxRange} m</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Météo */}
      <section>
        <h2>{t('calc.weather')}</h2>
        <table className="kpi-table">
          <tbody>
            <tr>
              <th>{t('weather.temperature')}</th>
              <td>{fmt(w.temperature, 1)} °C</td>
              <th>{t('weather.pressure')}</th>
              <td>{fmt(w.pressure, 0)} hPa</td>
            </tr>
            <tr>
              <th>{t('weather.humidity')}</th>
              <td>{fmt(w.humidity, 0)} %</td>
              <th>{t('weather.altitude')}</th>
              <td>{fmt(w.altitude, 0)} m</td>
            </tr>
            <tr>
              <th>{t('weather.windSpeed')}</th>
              <td>{fmt(w.windSpeed, 1)} m/s</td>
              <th>{t('weather.windAngle')}</th>
              <td>{fmt(w.windAngle, 0)}°</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Trajectoire */}
      {rows.length >= 2 && (
        <section>
          <h2>{t('sessionDetail.tabTrajectory')}</h2>
          <PrintTrajectorySvg session={session} />
        </section>
      )}

      {/* Tableau */}
      {tableRows.length > 0 && (
        <section>
          <h2>{t('sessionDetail.tabTable')}</h2>
          <table className="ballistic-table">
            <thead>
              <tr>
                <th>{t('table.range')}</th>
                <th>{t('table.drop')}</th>
                <th>{t('table.velocity' as never)}</th>
                <th>{t('table.energy' as never)}</th>
                <th>MRAD</th>
                <th>MOA</th>
                <th>{t('table.windDrift' as never)}</th>
                <th>{t('table.tof' as never)}</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map(r => (
                <tr key={r.range}>
                  <td>{r.range} m</td>
                  <td>{fmt(r.drop, 0)} mm</td>
                  <td>{fmt(r.velocity, 1)} m/s</td>
                  <td>{fmt(r.energy, 1)} J</td>
                  <td>{fmt(r.holdoverMRAD, 2)}</td>
                  <td>{fmt(r.holdover, 2)}</td>
                  <td>{fmt(r.windDrift, 0)} mm</td>
                  <td>{fmt(r.tof, 3)} s</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length !== tableRows.length && (
            <p className="footnote">
              {tableRows.length}/{rows.length} {t('table.rowsSampled' as never)}
            </p>
          )}
        </section>
      )}

      {/* Métadonnées moteur */}
      <section>
        <h2>{t('sessionDetail.tabMeta')}</h2>
        <table className="kpi-table">
          <tbody>
            <tr>
              <th>Engine v</th>
              <td>{session.engineVersion ?? 'legacy v0'}</td>
              <th>Profile</th>
              <td>{session.profileId ?? '—'}</td>
            </tr>
            <tr>
              <th>Drag law</th>
              <td>
                {session.dragLawEffective ?? '—'}
                {session.dragLawRequested && session.dragLawRequested !== session.dragLawEffective
                  ? ` (req. ${session.dragLawRequested})`
                  : ''}
              </td>
              <th>Cd src</th>
              <td>{session.cdProvenance ?? '—'}</td>
            </tr>
            {session.engineMetadata && (
              <tr>
                <th>Integrator</th>
                <td>{session.engineMetadata.integrator}</td>
                <th>dt</th>
                <td>{session.engineMetadata.dt} s</td>
              </tr>
            )}
            <tr>
              <th>Max range</th>
              <td>{lastRow?.range ?? '—'} m</td>
              <th>{t('sessions.created')}</th>
              <td>{new Date(session.createdAt).toLocaleString(locale)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Notes */}
      {session.notes && (
        <section>
          <h2>{t('sessionDetail.notes')}</h2>
          <p className="notes">{session.notes}</p>
        </section>
      )}
    </div>
  );
}