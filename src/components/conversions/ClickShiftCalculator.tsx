import React, { useState, useMemo } from 'react';
import { Crosshair } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { calculateClickShift, reverseClickShift, type ClickUnit } from '@/lib/click-shift';

/* ── Validation ── */
function vClickValue(raw: string): string | null {
  const v = parseFloat(raw);
  if (isNaN(v) || v < 0.001) return 'clickCalc.err.clickValueMin';
  if (v > 10) return 'clickCalc.err.clickValueMax';
  return null;
}
function vClicks(raw: string): string | null {
  if (raw !== '' && raw.includes('.')) return 'clickCalc.err.clicksInteger';
  const v = parseInt(raw, 10);
  if (isNaN(v) || v < 1) return 'clickCalc.err.clicksMin';
  if (v > 200) return 'clickCalc.err.clicksMax';
  return null;
}
function vDist(raw: string): string | null {
  const v = parseFloat(raw);
  if (isNaN(v) || v < 1) return 'clickCalc.err.distMin';
  if (v > 2000) return 'clickCalc.err.distMax';
  return null;
}
function vInvMm(raw: string): string | null {
  if (raw === '') return null;
  const v = parseFloat(raw);
  if (isNaN(v) || v <= 0) return 'clickCalc.err.invMmMin';
  if (v > 100_000) return 'clickCalc.err.invMmMax';
  return null;
}

const UNIT_OPTIONS: { value: ClickUnit; tKey: string; hintKey: string }[] = [
  { value: 'MOA',        tKey: 'clickCalc.unit.moa',       hintKey: 'clickCalc.hint.moa' },
  { value: 'MRAD',       tKey: 'clickCalc.unit.mrad',      hintKey: 'clickCalc.hint.mrad' },
  { value: 'CM_100M',    tKey: 'clickCalc.unit.cm100m',    hintKey: 'clickCalc.hint.cm100m' },
  { value: 'INCH_100YD', tKey: 'clickCalc.unit.inch100yd', hintKey: 'clickCalc.hint.inch100yd' },
];

const PRESETS: Record<ClickUnit, number[]> = {
  MOA:        [0.125, 0.25, 0.5],
  MRAD:       [0.05, 0.1, 0.2],
  CM_100M:    [0.5, 1, 2],
  INCH_100YD: [0.125, 0.25, 0.5],
};

const PRESET_LABELS: Record<string, string> = {
  '0.125': '⅛', '0.25': '¼', '0.5': '½',
};

const CLICK_PRESETS = [1, 4, 8, 16, 20];
const DIST_PRESETS  = [25, 50, 100, 150, 200, 300];
const REF_DISTANCES = [25, 50, 100, 150, 200, 300];
const REF_CLICKS    = [1, 4, 8];

const fmt = (n: number, d = 2) => {
  if (Math.abs(n) >= 1e5) return n.toExponential(2);
  return n.toFixed(d).replace(/\.?0+$/, '');
};

export default function ClickShiftCalculator() {
  const { t } = useI18n();

  // --- Optic data ---
  const [clickValue, setClickValue] = useState('0.25');
  const [clickUnit, setClickUnit]   = useState<ClickUnit>('MOA');
  const [numClicks, setNumClicks]   = useState('4');
  const [distance, setDistance]     = useState('100');

  // --- Inverse ---
  const [invMm, setInvMm]       = useState('');
  const [invDist, setInvDist]   = useState('100');
  const [invRound, setInvRound] = useState<'click' | 'exact'>('click');

  const cv = parseFloat(clickValue) || 0;
  const nc = parseInt(numClicks, 10) || 0;
  const dm = parseFloat(distance) || 0;

  const errCV = vClickValue(clickValue);
  const errNC = vClicks(numClicks);
  const errDist = vDist(distance);
  const errInvMm = vInvMm(invMm);
  const errInvDist = vDist(invDist);
  const hasMainError = !!(errCV || errNC || errDist);

  const result = useMemo(
    () => calculateClickShift({ clickValueNative: cv, clickUnit, numberOfClicks: nc, targetDistanceM: dm }),
    [cv, clickUnit, nc, dm],
  );

  const inverse = useMemo(() => {
    const mm = parseFloat(invMm) || 0;
    const d  = parseFloat(invDist) || 0;
    if (mm <= 0 || d <= 0 || cv <= 0) return null;
    return reverseClickShift(mm, cv, clickUnit, d);
  }, [invMm, invDist, cv, clickUnit]);

  const hint = UNIT_OPTIONS.find(u => u.value === clickUnit);

  const inputCls = (err?: string | null) =>
    `w-full bg-muted border rounded-md px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 ${
      err ? 'border-destructive focus:ring-destructive' : 'border-border focus:ring-primary'
    }`;
  const selectCls = "w-full bg-muted border border-border rounded-md px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary";
  const chipCls = (active: boolean) =>
    `px-2 py-1 rounded text-xs font-mono border transition-colors cursor-pointer ${
      active
        ? 'bg-primary/20 border-primary text-primary font-semibold'
        : 'bg-muted border-border text-muted-foreground hover:border-primary/50'
    }`;

  const errEl = (key: string | null) =>
    key ? <p className="text-[10px] text-destructive mt-0.5">{t(key as any)}</p> : null;

  return (
    <div className="surface-elevated p-4 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Crosshair className="h-5 w-5 text-primary" />
        <div>
          <h3 className="font-heading font-semibold text-sm">{t('clickCalc.title')}</h3>
          <p className="text-[10px] text-muted-foreground font-mono">{t('clickCalc.subtitle')}</p>
        </div>
      </div>

      {/* Section 1 — Optic data */}
      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('clickCalc.opticData')}</legend>

        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground font-mono">{t('clickCalc.clickUnit')}</label>
          <select className={selectCls} value={clickUnit} onChange={e => setClickUnit(e.target.value as ClickUnit)}>
            {UNIT_OPTIONS.map(u => (
              <option key={u.value} value={u.value}>{t(u.tKey as any)}</option>
            ))}
          </select>
          {hint && <p className="text-[10px] text-muted-foreground italic">{t(hint.hintKey as any)}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground font-mono">{t('clickCalc.clickValue')}</label>
          <input type="number" inputMode="decimal" step="0.001" min="0.001" max="10" className={inputCls(errCV)} value={clickValue} onChange={e => setClickValue(e.target.value)} />
          {errEl(errCV)}
          <div className="flex flex-wrap gap-1.5 mt-1">
            {PRESETS[clickUnit].map(p => (
              <button key={p} className={chipCls(cv === p)} onClick={() => setClickValue(String(p))}>
                {PRESET_LABELS[String(p)] ?? p}
              </button>
            ))}
          </div>
        </div>
      </fieldset>

      {/* Section 2 — Shooting conditions */}
      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('clickCalc.conditions')}</legend>

        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground font-mono">{t('clickCalc.numClicks')}</label>
          <input type="number" inputMode="numeric" min="1" max="200" step="1" className={inputCls(errNC)} value={numClicks} onChange={e => setNumClicks(e.target.value)} />
          {errEl(errNC)}
          <div className="flex flex-wrap gap-1.5 mt-1">
            {CLICK_PRESETS.map(p => (
              <button key={p} className={chipCls(nc === p)} onClick={() => setNumClicks(String(p))}>
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground font-mono">{t('clickCalc.targetDist')}</label>
          <input type="number" inputMode="numeric" min="1" max="2000" className={inputCls(errDist)} value={distance} onChange={e => setDistance(e.target.value)} />
          {errEl(errDist)}
          <div className="flex flex-wrap gap-1.5 mt-1">
            {DIST_PRESETS.map(p => (
              <button key={p} className={chipCls(dm === p)} onClick={() => setDistance(String(p))}>
                {p}m
              </button>
            ))}
          </div>
        </div>
      </fieldset>

      {/* Section 3 — Result */}
      {cv > 0 && nc > 0 && dm > 0 && !hasMainError && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('clickCalc.result')}</h4>
          <div className="bg-primary/5 border border-primary/20 rounded-md p-3 space-y-2">
            <p className="text-[11px] text-muted-foreground">
              À {dm}m, {nc} clic{nc > 1 ? 's' : ''} :
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-mono font-bold text-primary">🎯 {fmt(result.shiftMm)} mm</span>
            </div>
            <div className="text-sm font-mono text-foreground space-x-3">
              <span>{fmt(result.shiftCm)} cm</span>
              <span>{fmt(result.shiftInch)}"</span>
            </div>
            <div className="border-t border-border/50 pt-2 text-xs font-mono text-muted-foreground space-y-0.5">
              <p>{t('clickCalc.perClick')} : {fmt(result.perClickMm)} mm</p>
              <p>{t('clickCalc.totalAngle')} : {fmt(result.shiftMrad, 4)} MRAD = {fmt(result.shiftMoa, 4)} MOA</p>
            </div>
          </div>

          {/* Reference table */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t('clickCalc.refTable')}</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-1 px-2 text-muted-foreground">Distance</th>
                    {REF_CLICKS.map(c => (
                      <th key={c} className="text-right py-1 px-2 text-muted-foreground">{c} clic{c > 1 ? 's' : ''}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {REF_DISTANCES.map(d => {
                    const isActive = d === dm;
                    return (
                      <tr key={d} className={isActive ? 'bg-primary/10 font-semibold' : 'hover:bg-muted/50'}>
                        <td className="py-1 px-2">{d}m</td>
                        {REF_CLICKS.map(c => {
                          const s = calculateClickShift({ clickValueNative: cv, clickUnit, numberOfClicks: c, targetDistanceM: d });
                          return <td key={c} className="text-right py-1 px-2">{fmt(s.shiftMm)} mm</td>;
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Section 4 — Inverse */}
      <fieldset className="space-y-2 border-t border-border/50 pt-4">
        <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('clickCalc.inverse')}</legend>
        <p className="text-[11px] text-muted-foreground">{t('clickCalc.wantShift')}</p>

        {/* Rounding toggle */}
        <div className="flex gap-1.5">
          <button className={chipCls(invRound === 'click')} onClick={() => setInvRound('click')}>
            {t('clickCalc.inv.roundClick' as any)}
          </button>
          <button className={chipCls(invRound === 'exact')} onClick={() => setInvRound('exact')}>
            {t('clickCalc.inv.roundExact' as any)}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-muted-foreground font-mono">mm</label>
            <input type="number" inputMode="decimal" min="0" max="100000" className={inputCls(errInvMm)} value={invMm} onChange={e => setInvMm(e.target.value)} placeholder="0" />
            {errEl(errInvMm)}
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground font-mono">Distance (m)</label>
            <input type="number" inputMode="numeric" min="1" max="2000" className={inputCls(errInvDist)} value={invDist} onChange={e => setInvDist(e.target.value)} />
            {errEl(errInvDist)}
          </div>
        </div>
        {inverse && !errInvMm && !errInvDist && (
          (() => {
            const desiredMm = parseFloat(invMm) || 0;
            const displayClicks = invRound === 'click' ? inverse.rounded : inverse.exact;
            const displayMm = invRound === 'click' ? inverse.actualMm : desiredMm;
            const errMm = invRound === 'click' ? inverse.errorMm : 0;
            const errPct = invRound === 'click' ? inverse.errorPct : 0;
            const sign = errMm >= 0 ? '+' : '';
            return (
              <div className="bg-primary/5 border border-primary/20 rounded-md p-3 text-sm font-mono space-y-2">
                <p className="font-semibold text-primary">
                  {t('clickCalc.clicksNeeded')} :{' '}
                  {invRound === 'click' ? inverse.rounded : fmt(inverse.exact, 3)}
                  {invRound === 'click' && (
                    <span className="text-muted-foreground text-xs ml-2">
                      ({fmt(inverse.exact, 3)} {t('clickCalc.inv.exact' as any)})
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  = {fmt(displayMm)} mm
                </p>
                {invRound === 'click' && errMm !== 0 && (
                  <div className="border-t border-border/50 pt-1.5 text-xs space-y-0.5">
                    <p className={errMm > 0 ? 'text-amber-500' : 'text-blue-500'}>
                      {t('clickCalc.inv.error' as any)} : {sign}{fmt(errMm)} mm ({sign}{fmt(errPct, 1)}%)
                    </p>
                    <p className="text-muted-foreground text-[10px]">
                      {errMm > 0
                        ? t('clickCalc.inv.overshoot' as any)
                        : t('clickCalc.inv.undershoot' as any)}
                    </p>
                  </div>
                )}
                {invRound === 'click' && errMm === 0 && (
                  <p className="text-xs text-green-500">✓ {t('clickCalc.inv.perfect' as any)}</p>
                )}
              </div>
            );
          })()
        )}
      </fieldset>
    </div>
  );
}