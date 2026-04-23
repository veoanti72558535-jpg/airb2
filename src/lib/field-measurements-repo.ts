/**
 * P-5f — Dual-write field measurements to Supabase.
 *
 * Fire-and-forget: errors are logged via console.error and never
 * surface to the user or break the app.
 */
import { supabase } from '@/integrations/supabase/client';

export interface FieldMeasurement {
  id?: string;
  sessionId: string;
  distanceM: number;
  measuredDropMm?: number;
  measuredVelocityMs?: number;
  measuredWindageMm?: number;
  notes?: string;
  conditions?: Record<string, unknown>;
  measuredAt?: string;
  createdAt?: string;
}

export async function saveFieldMeasurement(
  measurement: FieldMeasurement,
  userId: string,
): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('field_measurements').insert({
      user_id: userId,
      session_id: measurement.sessionId,
      distance_m: measurement.distanceM,
      measured_drop_mm: measurement.measuredDropMm ?? null,
      measured_velocity_ms: measurement.measuredVelocityMs ?? null,
      measured_windage_mm: measurement.measuredWindageMm ?? null,
      notes: measurement.notes ?? null,
      conditions: measurement.conditions ?? null,
      measured_at: measurement.measuredAt ?? new Date().toISOString(),
    });
    if (error) console.error('[field-measurements] save error:', error.message);
  } catch (err) {
    console.error('[field-measurements] save exception:', err);
  }
}

export async function getFieldMeasurements(
  sessionId: string,
  _userId: string,
): Promise<FieldMeasurement[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('field_measurements')
      .select('*')
      .eq('session_id', sessionId)
      .order('measured_at', { ascending: false });
    if (error) {
      console.error('[field-measurements] fetch error:', error.message);
      return [];
    }
    return (data ?? []).map((row: any) => ({
      id: row.id,
      sessionId: row.session_id,
      distanceM: Number(row.distance_m),
      measuredDropMm: row.measured_drop_mm != null ? Number(row.measured_drop_mm) : undefined,
      measuredVelocityMs: row.measured_velocity_ms != null ? Number(row.measured_velocity_ms) : undefined,
      measuredWindageMm: row.measured_windage_mm != null ? Number(row.measured_windage_mm) : undefined,
      notes: row.notes ?? undefined,
      conditions: row.conditions ?? undefined,
      measuredAt: row.measured_at,
      createdAt: row.created_at,
    }));
  } catch (err) {
    console.error('[field-measurements] fetch exception:', err);
    return [];
  }
}

export async function deleteFieldMeasurement(id: string): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('field_measurements')
      .delete()
      .eq('id', id);
    if (error) console.error('[field-measurements] delete error:', error.message);
  } catch (err) {
    console.error('[field-measurements] delete exception:', err);
  }
}