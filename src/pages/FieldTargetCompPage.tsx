/**
 * G4 — Competition Field Target Preparation.
 * Define lanes with distances and kill zones, auto-calculate corrections per lane,
 * generate a printable course card.
 */
import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Plus, Trash2, Download, Target, ChevronRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { sessionStore } from '@/lib/storage';
import { calculateTrajectory } from '@/lib/ballistics';
import { generateDopeCardPDF } from '@/lib/dope-card-pdf';
import { CompetitionPrepAdvisorButton } from '@/components/ai/agents/CompetitionPrepAdvisorButton';

interface Lane {
  id: string;
  number: number;
  distance: number; // m
  killZoneMm: number; // mm
  angleUp?: number; // degrees (uphill)
  notes?: string;
}

interface LaneResult {
  lane: Lane;
  holdoverMRAD: number;
  holdoverMOA: number;
  clicksElev: number;
  windDriftMm: number;
  clicksWind: number;
  drop: number;
  energy: number;
  velocity: number;
}

const DEFAULT_KILL_ZONES = [15, 20, 25, 30, 35, 40];

export default function FieldTargetCompPage() {
  const { t, locale } = useI18n();
  const sessions = useMemo(() => sessionStore.getAll(), []);
  const [selectedSessionId, setSelectedSessionId] = useState(
    sessions.length > 0 ? sessions[sessions.length - 1].id : '',
  );
  const [lanes, setLanes] = useState<Lane[]>([
    { id: crypto.randomUUID(), number: 1, distance: 15, killZoneMm: 40 },
    { id: crypto.randomUUID(), number: 2, distance: 25, killZoneMm: 25 },
    { id: crypto.randomUUID(), number: 3, distance: 35, killZoneMm: 20 },
    { id: crypto.randomUUID(), number: 4, distance: 45, killZoneMm: 15 },
    { id: crypto.randomUUID(), number: 5, distance: 50, killZoneMm: 15 },
  ]);

  const session = useMemo(
    () => (selectedSessionId ? sessionStore.getById(selectedSessionId) ?? null : null),
    [selectedSessionId],
  );

  // Calculate corrections for each lane
  const laneResults = useMemo<LaneResult[]>(() => {
    if (!session) return [];
    return lanes.map((lane) => {
      try {
        const results = calculateTrajectory({
          ...session.input,
          maxRange: lane.distance + 10,
        });
        const row = results.reduce((closest, r) =>
          Math.abs(r.range - lane.distance) < Math.abs(closest.range - lane.distance) ? r : closest,
          results[0],
        );
        return {
          lane,
          holdoverMRAD: row.holdoverMRAD,
          holdoverMOA: row.holdover,
          clicksElev: row.clicksElevation ?? 0,
          windDriftMm: row.windDrift,
          clicksWind: row.clicksWindage ?? 0,
          drop: row.drop,
          energy: row.energy,
          velocity: row.velocity,
        };
      } catch {
        return {
          lane,
          holdoverMRAD: 0,
          holdoverMOA: 0,
          clicksElev: 0,
          windDriftMm: 0,
          clicksWind: 0,
          drop: 0,
          energy: 0,
          velocity: 0,
        };
      }
    });
  }, [session, lanes]);

  const addLane = useCallback(() => {
    setLanes((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        number: prev.length + 1,
        distance: 30,
        killZoneMm: 25,
      },
    ]);
  }, []);

  const removeLane = useCallback((id: string) => {
    setLanes((prev) => prev.filter((l) => l.id !== id).map((l, i) => ({ ...l, number: i + 1 })));
  }, []);

  const updateLane = useCallback((id: string, updates: Partial<Lane>) => {
    setLanes((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));
  }, []);

  const clickUnit = session?.input.clickUnit ?? 'MRAD';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-heading font-bold">{t('nav.fieldTargetComp' as any) || 'Field Target — Parcours'}</h1>
      </div>

      {/* AI competition prep advisor (merged from former /competition-prep page) */}
      <div className="surface-card p-4">
        <CompetitionPrepAdvisorButton />
      </div>

      {/* Session selector */}
      <select
        value={selectedSessionId}
        onChange={(e) => setSelectedSessionId(e.target.value)}
        className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
      >
        {sessions.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>

      {/* Lanes table */}
      <div className="surface-elevated rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/40 text-muted-foreground">
                <th className="py-2 px-2 text-left font-medium">#</th>
                <th className="py-2 px-2 text-center font-medium">Dist. (m)</th>
                <th className="py-2 px-2 text-center font-medium">KZ (mm)</th>
                <th className="py-2 px-2 text-center font-medium">Clics ↕</th>
                <th className="py-2 px-2 text-center font-medium">{clickUnit}</th>
                <th className="py-2 px-2 text-center font-medium">Chute</th>
                <th className="py-2 px-2 text-center font-medium">Énergie</th>
                <th className="py-2 px-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {laneResults.map((lr, i) => (
                <tr key={lr.lane.id} className={`border-b border-border/20 ${i % 2 === 0 ? 'bg-muted/20' : ''}`}>
                  <td className="py-2 px-2 font-mono font-bold text-primary">{lr.lane.number}</td>
                  <td className="py-1 px-1 text-center">
                    <input
                      type="number"
                      value={lr.lane.distance}
                      onChange={(e) => updateLane(lr.lane.id, { distance: Math.max(5, parseInt(e.target.value) || 10) })}
                      className="w-14 bg-muted/50 border border-border/30 rounded px-1 py-0.5 text-center font-mono text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </td>
                  <td className="py-1 px-1 text-center">
                    <select
                      value={lr.lane.killZoneMm}
                      onChange={(e) => updateLane(lr.lane.id, { killZoneMm: parseInt(e.target.value) })}
                      className="bg-muted/50 border border-border/30 rounded px-1 py-0.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                    >
                      {DEFAULT_KILL_ZONES.map((kz) => (
                        <option key={kz} value={kz}>{kz}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-2 text-center font-mono font-semibold">
                    <span className={lr.clicksElev > 0 ? 'text-green-500' : lr.clicksElev < 0 ? 'text-red-500' : ''}>
                      {lr.clicksElev > 0 ? '+' : ''}{lr.clicksElev}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-center font-mono text-muted-foreground">
                    {(clickUnit === 'MRAD' ? lr.holdoverMRAD : lr.holdoverMOA).toFixed(2)}
                  </td>
                  <td className="py-2 px-2 text-center font-mono text-muted-foreground">
                    {lr.drop.toFixed(1)}mm
                  </td>
                  <td className="py-2 px-2 text-center font-mono text-muted-foreground">
                    {lr.energy.toFixed(1)}J
                  </td>
                  <td className="py-2 px-1">
                    <button onClick={() => removeLane(lr.lane.id)} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add lane */}
      <button
        onClick={addLane}
        className="w-full py-2.5 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Ajouter une lane
      </button>

      {/* Summary */}
      {laneResults.length > 0 && (
        <div className="surface-elevated rounded-xl p-4 space-y-2">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Résumé du parcours</div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-2xl font-mono font-bold text-primary">{lanes.length}</div>
              <div className="text-[9px] text-muted-foreground uppercase">Lanes</div>
            </div>
            <div>
              <div className="text-2xl font-mono font-bold text-foreground">
                {Math.min(...lanes.map(l => l.distance))}–{Math.max(...lanes.map(l => l.distance))}
              </div>
              <div className="text-[9px] text-muted-foreground uppercase">Portée (m)</div>
            </div>
            <div>
              <div className="text-2xl font-mono font-bold text-amber-500">
                {Math.min(...lanes.map(l => l.killZoneMm))}mm
              </div>
              <div className="text-[9px] text-muted-foreground uppercase">Plus petit KZ</div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
