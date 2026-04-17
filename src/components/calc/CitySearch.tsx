import { useEffect, useRef, useState } from 'react';
import { Search, Loader2, AlertCircle, MapPin } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { geocodeCity, GeocodeResult } from '@/lib/weather';
import { cn } from '@/lib/utils';

interface Props {
  /** Called when a city is picked. Provides coords + display label. */
  onPick: (city: GeocodeResult, label: string) => void;
  /** Disable input/results (e.g. during weather fetch). */
  disabled?: boolean;
  className?: string;
}

/**
 * Debounced city autocomplete using Open-Meteo's free Geocoding API.
 * - 250 ms debounce keeps requests low without feeling laggy
 * - In-flight request is aborted when the query changes
 * - Shows top 8 matches with country + admin region for disambiguation
 */
export function CitySearch({ onPick, disabled, className }: Props) {
  const { t, locale } = useI18n();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    abortRef.current?.abort();
    abortRef.current = ctrl;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await geocodeCity(query, { language: locale, signal: ctrl.signal });
        if (!ctrl.signal.aborted) {
          setResults(list);
          setOpen(true);
        }
      } catch (e) {
        if (ctrl.signal.aborted) return;
        setError(e instanceof Error ? e.message : 'failed');
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query, locale]);

  const formatLabel = (c: GeocodeResult): string => {
    const parts = [c.name];
    if (c.admin1 && c.admin1 !== c.name) parts.push(c.admin1);
    if (c.countryCode) parts.push(c.countryCode);
    else if (c.country) parts.push(c.country);
    return parts.join(', ');
  };

  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="space-y-1 block">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-mono">
          {t('weather.citySearch')}
        </span>
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            disabled={disabled}
            placeholder={t('weather.citySearchPlaceholder')}
            className="w-full pl-7 pr-7 py-1.5 text-xs rounded-md bg-background border border-border focus:border-primary focus:outline-none disabled:opacity-60"
            aria-autocomplete="list"
            aria-expanded={open}
          />
          {loading && (
            <Loader2 className="h-3.5 w-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" />
          )}
        </div>
      </label>

      {error && (
        <div className="flex items-start gap-1.5 text-[10px] text-destructive">
          <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
          <span>{t('weather.errGeocode')}</span>
        </div>
      )}

      {open && results.length > 0 && (
        <ul
          role="listbox"
          className="rounded-md border border-border bg-popover shadow-lg overflow-hidden divide-y divide-border max-h-64 overflow-y-auto"
        >
          {results.map((c, i) => {
            const label = formatLabel(c);
            return (
              <li key={`${c.latitude}-${c.longitude}-${i}`}>
                <button
                  type="button"
                  onClick={() => {
                    onPick(c, label);
                    setOpen(false);
                    setQuery(label);
                  }}
                  className="w-full flex items-start gap-2 px-2.5 py-1.5 text-left hover:bg-muted/60 transition-colors"
                >
                  <MapPin className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium truncate">{label}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      {c.latitude.toFixed(4)}, {c.longitude.toFixed(4)}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {open && !loading && !error && query.trim().length >= 2 && results.length === 0 && (
        <div className="text-[10px] text-muted-foreground italic px-1">
          {t('weather.noCityFound')}
        </div>
      )}
    </div>
  );
}
