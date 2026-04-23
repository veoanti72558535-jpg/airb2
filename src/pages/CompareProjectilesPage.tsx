import { useState, useMemo, useCallback } from 'react';
import { useI18n } from '@/lib/i18n';
import { projectileStore } from '@/lib/storage';
import { calculateTrajectory } from '@/lib/ballistics';
import type { Projectile, BallisticInput, BallisticResult, WeatherSnapshot } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Play, Loader2 } from 'lucide-react';
import { ProjectileComparisonTable, type ComparisonEntry } from '@/components/compare/ProjectileComparisonTable';
import { ProjectileComparisonChart } from '@/components/compare/ProjectileComparisonChart';
import { motion } from 'framer-motion';

const DEFAULT_WEATHER: WeatherSnapshot = {
  temperature: 20,
  humidity: 50,
  pressure: 1013,
  altitude: 0,
  windSpeed: 2,
  windAngle: 90,
  source: 'manual',
  timestamp: new Date().toISOString(),
};

export default function CompareProjectilesPage() {
  const { t } = useI18n();
  const allProjectiles = useMemo(() => projectileStore.getAll(), []);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [muzzleVelocity, setMuzzleVelocity] = useState(280);
  const [sightHeight, setSightHeight] = useState(40);
  const [zeroRange, setZeroRange] = useState(30);
  const [maxRange, setMaxRange] = useState(80);
  const [weather, setWeather] = useState(DEFAULT_WEATHER);
  const [compareDistance, setCompareDistance] = useState(50);
  const [results, setResults] = useState<ComparisonEntry[]>([]);
  const [computing, setComputing] = useState(false);

  const selected = useMemo(
    () => selectedIds.map(id => allProjectiles.find(p => p.id === id)).filter(Boolean) as Projectile[],
    [selectedIds, allProjectiles],
  );

  const addProjectile = useCallback((id: string) => {
    if (id && !selectedIds.includes(id) && selectedIds.length < 5) {
      setSelectedIds(prev => [...prev, id]);
    }
  }, [selectedIds]);

  const removeProjectile = useCallback((id: string) => {
    setSelectedIds(prev => prev.filter(x => x !== id));
    setResults(prev => prev.filter(r => r.projectile.id !== id));
  }, []);

  const handleCompare = useCallback(() => {
    if (selected.length < 2) return;
    setComputing(true);
    // Defer to next tick so UI updates spinner
    setTimeout(() => {
      const entries: ComparisonEntry[] = selected.map(p => {
        const input: BallisticInput = {
          muzzleVelocity,
          bc: p.bc,
          projectileWeight: p.weight,
          sightHeight,
          zeroRange,
          maxRange,
          rangeStep: 5,
          weather,
          dragModel: p.bcModel ?? 'G1',
          customDragTable: p.customDragTable,
        };
        const trajectory = calculateTrajectory(input);
        return { projectile: p, trajectory };
      });
      setResults(entries);
      setComputing(false);
    }, 10);
  }, [selected, muzzleVelocity, sightHeight, zeroRange, maxRange, weather]);

  const available = allProjectiles.filter(p => !selectedIds.includes(p.id));

  const wField = (key: keyof WeatherSnapshot, label: string, val: number) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        value={val}
        onChange={e => setWeather(w => ({ ...w, [key]: parseFloat(e.target.value) || 0 }))}
        className="h-8 text-sm font-mono"
      />
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <h1 className="text-2xl font-heading font-bold">
        {t('compareProjectiles.title' as any) || 'Projectile comparison'}
      </h1>

      {/* ── Section 1: Projectile selection ─────────────────── */}
      <div className="surface-elevated p-4 space-y-3">
        <Label className="text-sm font-semibold">
          {t('compareProjectiles.selectProjectiles' as any) || 'Select projectiles'}
          <span className="text-muted-foreground font-normal ml-2 text-xs">
            ({t('compareProjectiles.minMax' as any) || '2 to 5 projectiles'})
          </span>
        </Label>

        {selectedIds.length < 5 && available.length > 0 && (
          <Select onValueChange={addProjectile} value="">
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('compareProjectiles.selectProjectiles' as any) || 'Add projectile...'} />
            </SelectTrigger>
            <SelectContent>
              {available.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.brand} {p.model} — {p.weight}gr · BC {p.bc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="flex flex-wrap gap-2">
          {selected.map(p => (
            <Badge key={p.id} variant="secondary" className="gap-1.5 pr-1">
              <span className="text-xs">{p.brand} {p.model} ({p.weight}gr)</span>
              <button
                type="button"
                onClick={() => removeProjectile(p.id)}
                className="p-0.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      {/* ── Section 2: Common conditions ────────────────────── */}
      <div className="surface-elevated p-4 space-y-3">
        <Label className="text-sm font-semibold">
          {t('compareProjectiles.commonConditions' as any) || 'Common conditions'}
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">{t('compareProjectiles.muzzleVelocity' as any) || 'MV (m/s)'}</Label>
            <Input type="number" value={muzzleVelocity} onChange={e => setMuzzleVelocity(+e.target.value || 0)} className="h-8 text-sm font-mono" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Sight height (mm)</Label>
            <Input type="number" value={sightHeight} onChange={e => setSightHeight(+e.target.value || 0)} className="h-8 text-sm font-mono" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Zero (m)</Label>
            <Input type="number" value={zeroRange} onChange={e => setZeroRange(+e.target.value || 0)} className="h-8 text-sm font-mono" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Max (m)</Label>
            <Input type="number" value={maxRange} onChange={e => setMaxRange(+e.target.value || 0)} className="h-8 text-sm font-mono" />
          </div>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {wField('temperature', 'T°C', weather.temperature)}
          {wField('pressure', 'hPa', weather.pressure)}
          {wField('altitude', 'Alt (m)', weather.altitude)}
          {wField('humidity', '%HR', weather.humidity)}
          {wField('windSpeed', `${t('chrono.velocity')} (m/s)`, weather.windSpeed)}
          {wField('windAngle', 'Angle°', weather.windAngle)}
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t('compareProjectiles.atDistance' as any, { d: '' }) || 'Compare at distance'} (m)</Label>
          <Input type="number" value={compareDistance} onChange={e => setCompareDistance(+e.target.value || 0)} className="h-8 w-28 text-sm font-mono" />
        </div>
      </div>

      {/* ── Section 3: Compare button ───────────────────────── */}
      <Button onClick={handleCompare} disabled={selected.length < 2 || computing} data-testid="compare-btn">
        {computing
          ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          : <Play className="h-4 w-4 mr-2" />
        }
        {t('compareProjectiles.compare' as any) || 'Compare'} ({selected.length})
      </Button>

      {selected.length < 2 && selected.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {t('compareProjectiles.noProjectiles' as any) || 'Select at least 2 projectiles'}
        </p>
      )}

      {/* ── Results ─────────────────────────────────────────── */}
      {results.length >= 2 && (
        <div className="space-y-6">
          <ProjectileComparisonTable results={results} compareDistance={compareDistance} />
          <ProjectileComparisonChart results={results} />
        </div>
      )}
    </motion.div>
  );
}