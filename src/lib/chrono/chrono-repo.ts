/**
 * Chrono measurements — Supabase repository (fire-and-forget).
 */
import { supabase } from '@/integrations/supabase/client';

export interface ChronoMeasurement {
  id?: string;
  userId?: string;
  sessionId?: string;
  source: 'ble' | 'manual';
  velocityMs: number;
  shotNumber?: number;
  notes?: string;
  measuredAt?: string;
  createdAt?: string;
}

export function chronoStats(measurements: ChronoMeasurement[]) {
  if (measurements.length === 0) return { avg: 0, es: 0, sd: 0 };
  const vs = measurements.map(m => m.velocityMs);
  const avg = vs.reduce((a, b) => a + b, 0) / vs.length;
  const min = Math.min(...vs);
  const max = Math.max(...vs);
  const es = max - min;
  const sd = Math.sqrt(vs.reduce((s, v) => s + (v - avg) ** 2, 0) / vs.length);
  return { avg: +avg.toFixed(2), es: +es.toFixed(2), sd: +sd.toFixed(2) };
}

export async function saveChronoMeasurements(
  measurements: ChronoMeasurement[],
  userId: string,
  sessionId?: string,
): Promise<void> {
  if (!supabase) return;
  try {
    const rows = measurements.map((m, i) => ({
      user_id: userId,
      session_id: sessionId ?? m.sessionId ?? null,
      source: m.source,
      velocity_ms: m.velocityMs,
      shot_number: m.shotNumber ?? i + 1,
      notes: m.notes ?? null,
      measured_at: m.measuredAt ?? new Date().toISOString(),
    }));
    const { error } = await supabase.from('chrono_measurements').insert(rows);
    if (error) console.error('[chrono] save error:', error.message);
  } catch (err) {
    console.error('[chrono] save exception:', err);
  }
}

export async function getChronoMeasurements(
  userId: string,
  sessionId?: string,
): Promise<ChronoMeasurement[]> {
  if (!supabase) return [];
  try {
    let q = supabase
      .from('chrono_measurements')
      .select('*')
      .eq('user_id', userId)
      .order('measured_at', { ascending: true });
    if (sessionId) q = q.eq('session_id', sessionId);
    const { data, error } = await q;
    if (error) {
      console.error('[chrono] fetch error:', error.message);
      return [];
    }
    return (data ?? []).map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      sessionId: r.session_id,
      source: r.source as 'ble' | 'manual',
      velocityMs: Number(r.velocity_ms),
      shotNumber: r.shot_number,
      notes: r.notes,
      measuredAt: r.measured_at,
      createdAt: r.created_at,
    }));
  } catch (err) {
    console.error('[chrono] fetch exception:', err);
    return [];
  }
}