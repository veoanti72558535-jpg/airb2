import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftRight, Wind, Search, X, History, Trash2, RotateCcw, Star, Copy, Check, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';
import {
  convertVelocity, convertDistance, convertWeight, convertEnergy,
  convertPressure, convertTemperature, convertAngle, convertArea,
  convertVolume, convertForce, convertPower,
  VelocityUnit, DistanceUnit, WeightUnit, EnergyUnit, PressureUnit,
  TemperatureUnit, AngleUnit, AreaUnit, VolumeUnit, ForceUnit, PowerUnit,
  calcMuzzleEnergy,
} from '@/lib/conversions';
import { unitCategories, UnitOption } from '@/lib/units';
import { motion } from 'framer-motion';
import { useConversionHistory, ConversionHistoryEntry } from '@/hooks/use-conversion-history';
import { useConversionFavorites } from '@/hooks/use-conversion-favorites';
import ClickShiftCalculator from '@/components/conversions/ClickShiftCalculator';

// ── Map category key → converter fn ──
const convertFns: Record<string, (v: number, f: string, t: string) => number> = {
  velocity: (v, f, t) => convertVelocity(v, f as VelocityUnit, t as VelocityUnit),
  energy: (v, f, t) => convertEnergy(v, f as EnergyUnit, t as EnergyUnit),
  power: (v, f, t) => convertPower(v, f as PowerUnit, t as PowerUnit),
  force: (v, f, t) => convertForce(v, f as ForceUnit, t as ForceUnit),
  pressure: (v, f, t) => convertPressure(v, f as PressureUnit, t as PressureUnit),
  distance: (v, f, t) => convertDistance(v, f as DistanceUnit, t as DistanceUnit),
  length: (v, f, t) => convertDistance(v, f as DistanceUnit, t as DistanceUnit),
  area: (v, f, t) => convertArea(v, f as AreaUnit, t as AreaUnit),
  volume: (v, f, t) => convertVolume(v, f as VolumeUnit, t as VolumeUnit),
  weight: (v, f, t) => convertWeight(v, f as WeightUnit, t as WeightUnit),
  temperature: (v, f, t) => convertTemperature(v, f as TemperatureUnit, t as TemperatureUnit),
  correction: (v, f, t) => convertAngle(v, f as AngleUnit, t as AngleUnit),
};

const categoryIcons: Record<string, string> = {
  velocity: '⚡', energy: '💥', power: '🔋', force: '💪',
  pressure: '🔧', distance: '📏', length: '📐', area: '⬛',
  volume: '🧪', weight: '⚖️', temperature: '🌡', correction: '🎯',
};

/** Format a unit option label, avoiding "m/s — m/s" duplicates. */
function formatOptionLabel(o: UnitOption, locale: string): string {
  const name = locale === 'fr' ? o.labelFr : o.labelEn;
  if (!name || name === o.symbol) return o.symbol;
  return `${o.symbol} — ${name}`;
}

interface ConverterProps {
  categoryKey: string;
  options: UnitOption[];
  defaultFrom: string;
  defaultTo: string;
  label: string;
  icon: string;
  locale: string;
  onRecord?: (entry: { categoryKey: string; from: string; to: string; value: string; result: number }) => void;
  prefill?: { from: string; to: string; value: string; nonce: number } | null;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

function ConverterCard({ categoryKey, options, defaultFrom, defaultTo, label, icon, locale, onRecord, prefill, isFavorite, onToggleFavorite }: ConverterProps) {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [value, setValue] = useState<string>('');

  // Apply prefill when it changes (nonce ensures repeated clicks re-trigger)
  const lastPrefillNonce = useRef<number | null>(null);
  useEffect(() => {
    if (prefill && prefill.nonce !== lastPrefillNonce.current) {
      lastPrefillNonce.current = prefill.nonce;
      setFrom(prefill.from);
      setTo(prefill.to);
      setValue(prefill.value);
    }
  }, [prefill]);

  const numValue = parseFloat(value) || 0;
  const result = useMemo(() => {
    try {
      const fn = convertFns[categoryKey];
      return fn ? fn(numValue, from, to) : 0;
    } catch { return 0; }
  }, [numValue, from, to, categoryKey]);

  // Debounced history recording — only when user has typed a non-empty, non-zero value
  useEffect(() => {
    if (!onRecord) return;
    if (!value || numValue === 0) return;
    const timer = setTimeout(() => {
      onRecord({ categoryKey, from, to, value, result });
    }, 800);
    return () => clearTimeout(timer);
  }, [value, from, to, result, numValue, categoryKey, onRecord]);

  const swap = () => { setFrom(to); setTo(from); };

  const fromOpt = options.find(o => o.value === from);
  const toOpt = options.find(o => o.value === to);

  const formatResult = (n: number) => {
    if (!value) return '—';
    if (Math.abs(n) >= 1e6 || (Math.abs(n) < 1e-3 && n !== 0)) {
      return n.toExponential(4);
    }
    return n.toFixed(6).replace(/\.?0+$/, '');
  };

  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value || numValue === 0) return;
    const text = formatResult(result);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(t('conv.copied'), {
        description: `${text} ${toOpt?.symbol ?? ''}`,
      });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Clipboard error');
    }
  };

  const selectClass = "w-full bg-muted border border-border rounded-md px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="surface-elevated p-4 space-y-3" data-category={categoryKey}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-heading font-semibold text-sm flex items-center gap-2 min-w-0">
          <span>{icon}</span>
          <span className="truncate">{label}</span>
        </h3>
        {onToggleFavorite && (
          <button
            onClick={onToggleFavorite}
            className={`p-1 rounded hover:bg-muted shrink-0 transition-colors ${
              isFavorite ? 'text-primary' : 'text-muted-foreground'
            }`}
            title={isFavorite ? '★' : '☆'}
            aria-label={isFavorite ? 'Unfavorite' : 'Favorite'}
            aria-pressed={isFavorite}
          >
            <Star className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
        )}
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
          <div className="space-y-1">
            <select className={selectClass} value={from} onChange={e => setFrom(e.target.value)}>
              {options.map(o => (
                <option key={o.value} value={o.value}>{formatOptionLabel(o, locale)}</option>
              ))}
            </select>
            <input
              type="number"
              inputMode="decimal"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="0"
              className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <button
            onClick={swap}
            className="p-2 rounded-md hover:bg-muted text-primary shrink-0"
            title="Swap"
            aria-label="Swap units"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-1">
          <select className={selectClass} value={to} onChange={e => setTo(e.target.value)}>
            {options.map(o => (
              <option key={o.value} value={o.value}>{formatOptionLabel(o, locale)}</option>
            ))}
          </select>
          <div className="bg-primary/5 border border-primary/20 rounded-md pl-3 pr-1 py-1 text-sm font-mono font-semibold text-primary min-h-[38px] flex items-center justify-between gap-2">
            <span className="truncate">{formatResult(result)}</span>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] text-muted-foreground">{toOpt?.symbol}</span>
              <button
                onClick={handleCopy}
                disabled={!value || numValue === 0}
                className="p-1.5 rounded hover:bg-primary/10 text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title={t('conv.copy')}
                aria-label={t('conv.copy')}
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {value && fromOpt && toOpt && (
          <div className="text-[10px] text-muted-foreground font-mono pt-1 border-t border-border/50">
            {numValue} {fromOpt.symbol} = {formatResult(result)} {toOpt.symbol}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ConversionsPage() {
  const { t, locale } = useI18n();
  const [query, setQuery] = useState('');
  const { entries: history, add: addHistory, clear: clearHistory, remove: removeHistory } = useConversionHistory();
  const { isFavorite, toggle: toggleFavorite, favorites } = useConversionFavorites();
  const [prefillByCategory, setPrefillByCategory] = useState<Record<string, { from: string; to: string; value: string; nonce: number }>>({});

  const normalizedQuery = query.trim().toLowerCase();

  const filteredCategories = useMemo(() => {
    const base = !normalizedQuery
      ? unitCategories
      : unitCategories.filter(cat => {
          const labelFr = cat.labelKeyFr.toLowerCase();
          const labelEn = cat.labelKeyEn.toLowerCase();
          const key = cat.key.toLowerCase();
          if (labelFr.includes(normalizedQuery) || labelEn.includes(normalizedQuery) || key.includes(normalizedQuery)) {
            return true;
          }
          return cat.options.some(o =>
            o.symbol.toLowerCase().includes(normalizedQuery) ||
            o.labelEn.toLowerCase().includes(normalizedQuery) ||
            o.labelFr.toLowerCase().includes(normalizedQuery) ||
            o.value.toLowerCase().includes(normalizedQuery)
          );
        });
    // Pin favorites to the top, preserving favorite-pin order then original order
    const favSet = new Set(favorites);
    const favs = favorites
      .map(key => base.find(c => c.key === key))
      .filter((c): c is typeof base[number] => Boolean(c));
    const rest = base.filter(c => !favSet.has(c.key));
    return [...favs, ...rest];
  }, [normalizedQuery, favorites]);

  const handleReuse = (entry: ConversionHistoryEntry) => {
    setPrefillByCategory(prev => ({
      ...prev,
      [entry.categoryKey]: {
        from: entry.from,
        to: entry.to,
        value: entry.value,
        nonce: Date.now(),
      },
    }));
    setQuery('');
    // Scroll to the matching card
    setTimeout(() => {
      const el = document.querySelector(`[data-category="${entry.categoryKey}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <ArrowLeftRight className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-heading font-bold">{t('conv.title')}</h1>
        </div>
        <p className="text-xs text-muted-foreground font-mono">{t('conv.subtitle')}</p>
      </div>

      {/* SI vs DSP doc shortcut — explains the unit contract to the user. */}
      <Link
        to="/docs/units"
        className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors px-3 py-2 text-xs"
      >
        <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="text-foreground">
          {locale === 'fr'
            ? 'Comprendre le contrat des unités (SI vs DSP)'
            : 'Understand the unit contract (SI vs DSP)'}
        </span>
        <span className="ml-auto text-primary font-mono">→</span>
      </Link>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('conv.searchPlaceholder')}
          className="w-full bg-muted border border-border rounded-md pl-9 pr-9 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          aria-label={t('conv.searchPlaceholder')}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-background text-muted-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* History panel */}
      {!normalizedQuery && (
        <HistoryPanel
          entries={history}
          locale={locale}
          onReuse={handleReuse}
          onClear={clearHistory}
          onRemove={removeHistory}
        />
      )}

      {/* Converter cards */}
      {filteredCategories.length === 0 ? (
        <div className="surface-elevated p-6 text-center text-sm text-muted-foreground">
          {t('conv.noResults')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredCategories.map(cat => (
            <ConverterCard
              key={cat.key}
              categoryKey={cat.key}
              options={cat.options}
              defaultFrom={cat.defaultMetric}
              defaultTo={cat.defaultImperial}
              label={locale === 'fr' ? cat.labelKeyFr : cat.labelKeyEn}
              icon={categoryIcons[cat.key] ?? '🔢'}
              locale={locale}
              onRecord={addHistory}
              prefill={prefillByCategory[cat.key] ?? null}
              isFavorite={isFavorite(cat.key)}
              onToggleFavorite={() => toggleFavorite(cat.key)}
            />
          ))}
        </div>
      )}

      {/* Quick energy calculator */}
      {!normalizedQuery && (
        <ClickShiftCalculator />
      )}

      {/* Quick energy calculator */}
      {!normalizedQuery && (
        <div className="surface-elevated p-4">
          <h3 className="font-heading font-semibold text-sm mb-3">⚡ {t('conv.muzzleEnergy')}</h3>
          <QuickEnergy />
        </div>
      )}

      {/* Wind speed converter */}
      {!normalizedQuery && (
        <div className="surface-elevated p-4">
          <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
            <Wind className="h-4 w-4 text-primary" />
            {t('conv.windSpeed')}
          </h3>
          <WindConverter />
        </div>
      )}
    </motion.div>
  );
}

function HistoryPanel({
  entries,
  locale,
  onReuse,
  onClear,
  onRemove,
}: {
  entries: ConversionHistoryEntry[];
  locale: string;
  onReuse: (e: ConversionHistoryEntry) => void;
  onClear: () => void;
  onRemove: (id: string) => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  const formatVal = (n: number) => {
    if (Math.abs(n) >= 1e6 || (Math.abs(n) < 1e-3 && n !== 0)) return n.toExponential(3);
    return Number(n.toFixed(6)).toString();
  };

  const findOpt = (categoryKey: string, value: string) => {
    const cat = unitCategories.find(c => c.key === categoryKey);
    return cat?.options.find(o => o.value === value);
  };

  const findCatLabel = (categoryKey: string) => {
    const cat = unitCategories.find(c => c.key === categoryKey);
    if (!cat) return categoryKey;
    return locale === 'fr' ? cat.labelKeyFr : cat.labelKeyEn;
  };

  return (
    <div className="surface-elevated p-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 text-sm font-heading font-semibold"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          {t('conv.history')}
          <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {entries.length}
          </span>
        </span>
        <span className="text-xs text-muted-foreground">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          {entries.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-3">
              {t('conv.historyEmpty')}
            </div>
          ) : (
            <>
              <ul className="space-y-1.5 max-h-64 overflow-y-auto">
                {entries.map(entry => {
                  const fromOpt = findOpt(entry.categoryKey, entry.from);
                  const toOpt = findOpt(entry.categoryKey, entry.to);
                  const icon = categoryIcons[entry.categoryKey] ?? '🔢';
                  return (
                    <li key={entry.id} className="flex items-center gap-2 text-xs">
                      <button
                        onClick={() => onReuse(entry)}
                        className="flex-1 flex items-center gap-2 bg-muted hover:bg-primary/10 border border-border rounded-md px-2 py-1.5 text-left transition-colors"
                        title={t('conv.historyReuse')}
                      >
                        <span className="text-sm">{icon}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0 hidden sm:inline">
                          {findCatLabel(entry.categoryKey)}
                        </span>
                        <span className="font-mono truncate flex-1">
                          <span className="text-foreground">{entry.value}</span>{' '}
                          <span className="text-muted-foreground">{fromOpt?.symbol}</span>
                          <span className="mx-1 text-muted-foreground">→</span>
                          <span className="text-primary font-semibold">{formatVal(entry.result)}</span>{' '}
                          <span className="text-muted-foreground">{toOpt?.symbol}</span>
                        </span>
                        <RotateCcw className="h-3 w-3 text-primary shrink-0" />
                      </button>
                      <button
                        onClick={() => onRemove(entry.id)}
                        className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive shrink-0"
                        aria-label="Remove entry"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </li>
                  );
                })}
              </ul>
              <button
                onClick={onClear}
                className="w-full flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground hover:text-destructive py-1.5 mt-1 border-t border-border/50"
              >
                <Trash2 className="h-3 w-3" />
                {t('conv.historyClear')}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function QuickEnergy() {
  const { t } = useI18n();
  const [vel, setVel] = useState('280');
  const [weight, setWeight] = useState('18');
  const v = parseFloat(vel) || 0;
  const w = parseFloat(weight) || 0;
  const e = calcMuzzleEnergy(v, w);
  const inputClass = "w-full bg-muted border border-border rounded-md px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-muted-foreground font-mono">{t('calc.muzzleVelocity')} (m/s)</label>
          <input type="number" inputMode="decimal" className={inputClass} value={vel} onChange={e => setVel(e.target.value)} />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground font-mono">{t('calc.projectileWeight')} (gr)</label>
          <input type="number" inputMode="decimal" className={inputClass} value={weight} onChange={e => setWeight(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-primary/5 border border-primary/20 rounded-md px-3 py-2 text-center">
          <div className="text-lg font-mono font-bold text-primary">{e.joules}</div>
          <div className="text-[10px] text-muted-foreground">Joules</div>
        </div>
        <div className="bg-primary/5 border border-primary/20 rounded-md px-3 py-2 text-center">
          <div className="text-lg font-mono font-bold text-primary">{e.ftlbs}</div>
          <div className="text-[10px] text-muted-foreground">ft·lbs</div>
        </div>
      </div>
    </div>
  );
}

function WindConverter() {
  const [kmh, setKmh] = useState<string>('');
  const numKmh = parseFloat(kmh) || 0;
  const ms = numKmh / 3.6;
  const mph = numKmh * 0.621371;
  const knot = numKmh * 0.539957;
  const inputClass = "w-full bg-muted border border-border rounded-md px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary";
  const resultClass = "bg-primary/5 border border-primary/20 rounded-md px-3 py-1.5 text-sm font-mono font-semibold text-primary min-h-[34px] flex items-center";

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div>
        <label className="text-[10px] text-muted-foreground font-mono">km/h</label>
        <input type="number" inputMode="decimal" className={inputClass} value={kmh} onChange={e => setKmh(e.target.value)} placeholder="0" />
      </div>
      <div>
        <label className="text-[10px] text-muted-foreground font-mono">m/s</label>
        <div className={resultClass}>{kmh ? ms.toFixed(2) : '—'}</div>
      </div>
      <div>
        <label className="text-[10px] text-muted-foreground font-mono">mph</label>
        <div className={resultClass}>{kmh ? mph.toFixed(2) : '—'}</div>
      </div>
      <div>
        <label className="text-[10px] text-muted-foreground font-mono">kn</label>
        <div className={resultClass}>{kmh ? knot.toFixed(2) : '—'}</div>
      </div>
    </div>
  );
}
