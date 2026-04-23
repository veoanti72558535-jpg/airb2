import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Target, ClipboardCheck } from 'lucide-react';
import type { Session, BallisticResult } from '@/lib/types';
import {
  type FieldMeasurement,
  saveFieldMeasurement,
  getFieldMeasurements,
  deleteFieldMeasurement,
} from '@/lib/field-measurements-repo';

// ── Badge logic ─────────────────────────────────────────────────────────

type AccuracyLevel = 'accurate' | 'moderate' | 'large';

function classifyAccuracy(
  predicted: BallisticResult,
  m: FieldMeasurement,
): AccuracyLevel {
  const dropDelta = m.measuredDropMm != null ? Math.abs(m.measuredDropMm - predicted.drop) : 0;
  const velDelta = m.measuredVelocityMs != null ? Math.abs(m.measuredVelocityMs - predicted.velocity) : 0;

  if (dropDelta < 5 && velDelta < 5) return 'accurate';
  if (dropDelta < 20 && velDelta < 15) return 'moderate';
  return 'large';
}

function AccuracyBadge({ level, t }: { level: AccuracyLevel; t: (k: string) => string }) {
  const map: Record<AccuracyLevel, { key: string; variant: 'default' | 'secondary' | 'destructive' }> = {
    accurate: { key: 'field.validation.accurate', variant: 'default' },
    moderate: { key: 'field.validation.moderateDelta', variant: 'secondary' },
    large: { key: 'field.validation.largeDelta', variant: 'destructive' },
  };
  const { key, variant } = map[level];
  return <Badge variant={variant}>{t(key)}</Badge>;
}

// ── Main component ──────────────────────────────────────────────────────

interface FieldValidationProps {
  session: Session;
}

export function FieldValidation({ session }: FieldValidationProps) {
  const { t } = useI18n();
  const { user } = useAuth();

  // Available distances from session results (skip 0)
  const distances = useMemo(
    () => session.results.filter(r => r.range > 0).map(r => r.range),
    [session.results],
  );

  // Form state
  const [distanceM, setDistanceM] = useState<number | ''>('');
  const [dropMm, setDropMm] = useState('');
  const [velocityMs, setVelocityMs] = useState('');
  const [windageMm, setWindageMm] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // History
  const [measurements, setMeasurements] = useState<FieldMeasurement[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const data = await getFieldMeasurements(session.id, user.id);
    setMeasurements(data);
    setLoading(false);
  }, [session.id, user]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const predicted = useMemo(
    () => (distanceM ? session.results.find(r => r.range === distanceM) : undefined),
    [distanceM, session.results],
  );

  const currentMeasurement = useMemo<FieldMeasurement | null>(() => {
    if (!distanceM) return null;
    const m: FieldMeasurement = {
      sessionId: session.id,
      distanceM,
      measuredDropMm: dropMm !== '' ? parseFloat(dropMm) : undefined,
      measuredVelocityMs: velocityMs !== '' ? parseFloat(velocityMs) : undefined,
      measuredWindageMm: windageMm !== '' ? parseFloat(windageMm) : undefined,
      notes: notes || undefined,
    };
    return m;
  }, [distanceM, dropMm, velocityMs, windageMm, notes, session.id]);

  const accuracy = useMemo(() => {
    if (!predicted || !currentMeasurement) return null;
    if (currentMeasurement.measuredDropMm == null && currentMeasurement.measuredVelocityMs == null) return null;
    return classifyAccuracy(predicted, currentMeasurement);
  }, [predicted, currentMeasurement]);

  const handleSave = async () => {
    if (!user || !currentMeasurement) return;
    setSaving(true);
    await saveFieldMeasurement(currentMeasurement, user.id);
    // Reset form
    setDropMm('');
    setVelocityMs('');
    setWindageMm('');
    setNotes('');
    await fetchHistory();
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await deleteFieldMeasurement(id);
    await fetchHistory();
  };

  const hasAnyInput = dropMm !== '' || velocityMs !== '' || windageMm !== '';

  if (!user) return null;

  return (
    <div className="surface-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">{t('field.validation.title')}</h3>
      </div>

      {/* Distance selector */}
      <Select
        value={distanceM !== '' ? String(distanceM) : ''}
        onValueChange={v => setDistanceM(Number(v))}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={t('field.validation.selectDistance')} />
        </SelectTrigger>
        <SelectContent>
          {distances.map(d => (
            <SelectItem key={d} value={String(d)}>
              {d}m
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Input fields */}
      {distanceM !== '' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              {t('field.validation.measuredDrop')}
            </label>
            <Input
              type="number"
              inputMode="decimal"
              value={dropMm}
              onChange={e => setDropMm(e.target.value)}
              placeholder="mm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              {t('field.validation.measuredVelocity')}
            </label>
            <Input
              type="number"
              inputMode="decimal"
              value={velocityMs}
              onChange={e => setVelocityMs(e.target.value)}
              placeholder="m/s"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              {t('field.validation.measuredWindage')}
            </label>
            <Input
              type="number"
              inputMode="decimal"
              value={windageMm}
              onChange={e => setWindageMm(e.target.value)}
              placeholder="mm"
            />
          </div>
        </div>
      )}

      {/* Comparison readout */}
      {predicted && hasAnyInput && (
        <div className="bg-muted/40 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{distanceM}m</span>
            {accuracy && <AccuracyBadge level={accuracy} t={t} />}
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
            <div>
              <div className="text-muted-foreground text-[10px]">{t('field.validation.predicted')}</div>
              <div>{predicted.drop.toFixed(1)} mm</div>
              <div>{predicted.velocity.toFixed(1)} m/s</div>
            </div>
            <div>
              <div className="text-muted-foreground text-[10px]">{t('field.validation.measured')}</div>
              <div>{dropMm !== '' ? `${parseFloat(dropMm).toFixed(1)} mm` : '—'}</div>
              <div>{velocityMs !== '' ? `${parseFloat(velocityMs).toFixed(1)} m/s` : '—'}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-[10px]">{t('field.validation.delta')}</div>
              <div>{dropMm !== '' ? `${(parseFloat(dropMm) - predicted.drop).toFixed(1)} mm` : '—'}</div>
              <div>{velocityMs !== '' ? `${(parseFloat(velocityMs) - predicted.velocity).toFixed(1)} m/s` : '—'}</div>
            </div>
          </div>
          {accuracy === 'large' && (
            <p className="text-[10px] text-destructive mt-1">
              {t('field.validation.recalibrationHint')}
            </p>
          )}
        </div>
      )}

      {/* Notes */}
      {distanceM !== '' && (
        <Textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder={t('field.validation.notes') || 'Notes...'}
          rows={2}
          className="text-sm"
        />
      )}

      {/* Save */}
      {distanceM !== '' && (
        <Button
          onClick={handleSave}
          disabled={saving || !hasAnyInput}
          size="sm"
          className="w-full"
        >
          <ClipboardCheck className="h-3.5 w-3.5 mr-1.5" />
          {t('field.validation.save')}
        </Button>
      )}

      {/* History */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground">{t('field.validation.history')}</h4>
        {loading ? (
          <div className="text-xs text-muted-foreground">…</div>
        ) : measurements.length === 0 ? (
          <div className="text-xs text-muted-foreground">{t('field.validation.noMeasurements')}</div>
        ) : (
          <div className="space-y-1.5">
            {measurements.map(m => {
              const pred = session.results.find(r => r.range === m.distanceM);
              const level = pred ? classifyAccuracy(pred, m) : null;
              return (
                <div key={m.id} className="flex items-center justify-between gap-2 bg-muted/30 rounded px-3 py-2 text-xs font-mono">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="font-semibold">{m.distanceM}m</span>
                    {m.measuredDropMm != null && <span>{m.measuredDropMm.toFixed(1)}mm</span>}
                    {m.measuredVelocityMs != null && <span>{m.measuredVelocityMs.toFixed(1)}m/s</span>}
                    {level && <AccuracyBadge level={level} t={t} />}
                  </div>
                  <button
                    onClick={() => m.id && handleDelete(m.id)}
                    className="p-1 rounded hover:bg-destructive/10 text-destructive shrink-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}