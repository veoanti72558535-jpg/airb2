/**
 * ScopeViewPage — ChairGun Elite scope viewer page.
 *
 * Full-page scope view with sidebar controls for:
 *   - Reticle selection (from ChairGun reticles catalog in Supabase)
 *   - Target range slider
 *   - Magnification slider
 *   - Target type selection
 *   - Ballistic parameters (MV, BC, zero, weight)
 *   - Profile selector (legacy/mero/chairgun/strelok)
 *   - Wind controls
 *
 * Runs the ballistic engine live and feeds the trajectory to the
 * ChairGunScopeView canvas component.
 */
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ChairGunScopeView, { TARGETS, type TargetDef } from '@/components/reticles/ChairGunScopeView';
import { calculateTrajectory } from '@/lib/ballistics/engine';
import { resolveProfile } from '@/lib/ballistics/profiles';
import { getChairgunReticles, type ChairgunReticle } from '@/lib/chairgun-reticles-repo';
import type { BallisticInput, WeatherSnapshot } from '@/lib/types';
import type { ProfileId } from '@/lib/ballistics/types';
import { ArrowLeft, Crosshair, Settings } from 'lucide-react';

// ── Defaults ────────────────────────────────────────────────────────
const DEFAULT_WEATHER: WeatherSnapshot = {
  temperature: 15,
  humidity: 50,
  pressure: 1013.25,
  altitude: 0,
  windSpeed: 0,
  windAngle: 90,
  source: 'manual',
  timestamp: new Date().toISOString(),
};

const PROFILE_OPTIONS: { id: ProfileId; label: string }[] = [
  { id: 'legacy', label: 'Legacy' },
  { id: 'mero', label: 'MERO' },
  { id: 'chairgun', label: 'ChairGun' },
  { id: 'strelok', label: 'Strelok' },
];

export default function ScopeViewPage() {
  const navigate = useNavigate();

  // Reticles from Supabase
  const [reticles, setReticles] = useState<ChairgunReticle[]>([]);
  const [reticlesLoading, setReticlesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await getChairgunReticles(
          { withGeometryOnly: true },
          1,
          100,
        );
        if (!cancelled) setReticles(data);
      } catch {
        // Supabase not configured or no data — show empty list
      } finally {
        if (!cancelled) setReticlesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Ballistic parameters
  const [muzzleVelocity, setMuzzleVelocity] = useState(280);
  const [bc, setBc] = useState(0.025);
  const [weight, setWeight] = useState(8.44);
  const [zeroRange, setZeroRange] = useState(30);
  const [sightHeight, setSightHeight] = useState(45);
  const [profileId, setProfileId] = useState<ProfileId>('chairgun');

  // View parameters
  const [magnification, setMagnification] = useState(10);
  const [targetRange, setTargetRange] = useState(30);
  const [selectedTarget, setSelectedTarget] = useState<TargetDef>(TARGETS[0]);
  const [selectedReticleId, setSelectedReticleId] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);

  // Wind
  const [windSpeed, setWindSpeed] = useState(0);
  const [windAngle, setWindAngle] = useState(90);

  // Selected reticle
  const selectedReticle = useMemo(
    () => reticles.find(r => String(r.reticle_id) === selectedReticleId) ?? null,
    [reticles, selectedReticleId],
  );

  const elements = useMemo(
    () => selectedReticle?.elements ?? [],
    [selectedReticle],
  );

  // Auto-select first reticle
  useEffect(() => {
    if (reticles.length > 0 && !selectedReticleId) {
      setSelectedReticleId(String(reticles[0].reticle_id));
    }
  }, [reticles, selectedReticleId]);

  // Run ballistic engine
  const trajectory = useMemo(() => {
    const profile = resolveProfile(profileId);
    const weather: WeatherSnapshot = {
      ...DEFAULT_WEATHER,
      windSpeed,
      windAngle,
    };

    const input: BallisticInput = {
      muzzleVelocity,
      bc,
      projectileWeight: weight,
      sightHeight,
      zeroRange,
      maxRange: Math.max(targetRange + 20, 100),
      rangeStep: 1,
      weather,
      dragModel: 'G1',
      engineConfig: profile.config,
    };

    try {
      return calculateTrajectory(input);
    } catch {
      return [];
    }
  }, [muzzleVelocity, bc, weight, sightHeight, zeroRange, targetRange, profileId, windSpeed, windAngle]);

  // Responsive size
  const [scopeSize, setScopeSize] = useState(560);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  useEffect(() => {
    const update = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      const availableW = mobile ? window.innerWidth - 32 : window.innerWidth - 380;
      const availableH = mobile ? window.innerHeight - 300 : window.innerHeight - 80;
      setScopeSize(Math.max(250, Math.min(800, availableW, availableH)));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      height: '100vh',
      background: '#0a0a0a',
      color: '#e2e8f0',
      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
      overflow: isMobile ? 'auto' : 'hidden',
    }}>
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside style={{
        width: isMobile ? '100%' : 340,
        background: 'linear-gradient(180deg, #111318 0%, #0d0f14 100%)',
        borderRight: isMobile ? 'none' : '1px solid #1e2330',
        borderBottom: isMobile ? '1px solid #1e2330' : 'none',
        display: 'flex',
        flexDirection: 'column',
        overflowY: isMobile ? 'visible' : 'auto',
        padding: '16px',
        gap: '12px',
        flexShrink: 0,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'none', border: 'none', color: '#64748b',
              cursor: 'pointer', padding: 4, display: 'flex',
            }}
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Crosshair size={20} color="#38bdf8" />
            <h1 style={{
              fontSize: 16, fontWeight: 700, margin: 0,
              background: 'linear-gradient(90deg, #38bdf8, #a78bfa)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              Scope View
            </h1>
          </div>
        </div>

        {/* Reticle Selector */}
        <ControlGroup label="Reticle">
          <select
            value={selectedReticleId}
            onChange={e => setSelectedReticleId(e.target.value)}
            style={selectStyle}
          >
            {reticlesLoading && <option value="">Loading...</option>}
            {!reticlesLoading && reticles.length === 0 && (
              <option value="">No reticles — connect Supabase</option>
            )}
            {reticles.map(r => (
              <option key={r.reticle_id} value={String(r.reticle_id)}>
                {r.name}
              </option>
            ))}
          </select>
        </ControlGroup>

        {/* Range Slider */}
        <ControlGroup label="Target Range" value={`${targetRange}m`}>
          <input
            type="range" min={5} max={200} step={1}
            value={targetRange}
            onChange={e => setTargetRange(Number(e.target.value))}
            style={sliderStyle}
          />
        </ControlGroup>

        {/* Magnification */}
        <ControlGroup label="Magnification" value={`${magnification.toFixed(1)}×`}>
          <input
            type="range" min={1} max={50} step={0.5}
            value={magnification}
            onChange={e => setMagnification(Number(e.target.value))}
            style={sliderStyle}
          />
        </ControlGroup>

        {/* Target Type */}
        <ControlGroup label="Target">
          <select
            value={selectedTarget.id}
            onChange={e => {
              const t = TARGETS.find(t => t.id === e.target.value);
              if (t) setSelectedTarget(t);
            }}
            style={selectStyle}
          >
            {TARGETS.map(t => (
              <option key={t.id} value={t.id}>{t.label} ({t.sizeCm}cm)</option>
            ))}
          </select>
        </ControlGroup>

        {/* Wind */}
        <ControlGroup label="Wind Speed" value={`${display('velocity', windSpeed).toFixed(1)} ${symbol('velocity')}`}>
          <input
            type="range" min={0} max={15} step={0.5}
            value={windSpeed}
            onChange={e => setWindSpeed(Number(e.target.value))}
            style={sliderStyle}
          />
        </ControlGroup>

        {windSpeed > 0 && (
          <ControlGroup label="Wind Angle" value={`${windAngle}°`}>
            <input
              type="range" min={0} max={360} step={5}
              value={windAngle}
              onChange={e => setWindAngle(Number(e.target.value))}
              style={sliderStyle}
            />
          </ControlGroup>
        )}

        {/* Settings toggle */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#161a24', border: '1px solid #1e2330',
            color: '#94a3b8', borderRadius: 6, padding: '8px 12px',
            cursor: 'pointer', fontSize: 13,
          }}
        >
          <Settings size={14} />
          Ballistic Settings {showSettings ? '▲' : '▼'}
        </button>

        {showSettings && (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 10,
            background: '#0d1017', borderRadius: 8, padding: 12,
            border: '1px solid #1e2330',
          }}>
            {/* Profile */}
            <ControlGroup label="Profile">
              <select
                value={profileId}
                onChange={e => setProfileId(e.target.value as ProfileId)}
                style={selectStyle}
              >
                {PROFILE_OPTIONS.map(p => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </ControlGroup>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <ControlGroup label="MV (m/s)">
                <input
                  type="number" value={muzzleVelocity} step={1}
                  onChange={e => setMuzzleVelocity(Number(e.target.value))}
                  style={inputStyle}
                />
              </ControlGroup>
              <ControlGroup label="BC">
                <input
                  type="number" value={bc} step={0.001} min={0.001}
                  onChange={e => setBc(Number(e.target.value))}
                  style={inputStyle}
                />
              </ControlGroup>
              <ControlGroup label="Weight (gr)">
                <input
                  type="number" value={weight} step={0.1}
                  onChange={e => setWeight(Number(e.target.value))}
                  style={inputStyle}
                />
              </ControlGroup>
              <ControlGroup label="Zero (m)">
                <input
                  type="number" value={zeroRange} step={1}
                  onChange={e => setZeroRange(Number(e.target.value))}
                  style={inputStyle}
                />
              </ControlGroup>
              <ControlGroup label="Sight H (mm)">
                <input
                  type="number" value={sightHeight} step={1}
                  onChange={e => setSightHeight(Number(e.target.value))}
                  style={inputStyle}
                />
              </ControlGroup>
            </div>
          </div>
        )}

        {/* Reticle info badge */}
        {selectedReticle && (
          <div style={{
            background: '#0d1017', borderRadius: 8, padding: 12,
            border: '1px solid #1e2330', fontSize: 12, color: '#64748b',
            borderLeft: '3px solid #38bdf8',
          }}>
            <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>
              {selectedReticle.name}
            </div>
            <div>FP: {selectedReticle.focal_plane ?? 'SFP'}</div>
            <div>Elements: {selectedReticle.element_count}</div>
            <div>Unit: {selectedReticle.unit ?? 'MIL'}</div>
            {selectedReticle.true_magnification && (
              <div>True Mag: {selectedReticle.true_magnification}×</div>
            )}
          </div>
        )}
      </aside>

      {/* ── Viewport ────────────────────────────────────────────── */}
      <main style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'radial-gradient(ellipse at center, #12151c 0%, #080a0e 100%)',
        position: 'relative',
      }}>
        <ChairGunScopeView
          size={scopeSize}
          reticle={selectedReticle ?? undefined}
          elements={elements}
          magnification={magnification}
          trajectory={trajectory}
          targetRange={targetRange}
          target={selectedTarget}
          zeroRange={zeroRange}
          muzzleVelocity={muzzleVelocity}
          windSpeed={windSpeed}
          windAngle={windAngle}
        />
      </main>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────
function ControlGroup({ label, value, children }: {
  label: string;
  value?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{
        fontSize: 12, color: '#64748b', fontWeight: 500,
        display: 'flex', justifyContent: 'space-between',
      }}>
        {label}
        {value && <span style={{ color: '#38bdf8', fontWeight: 600 }}>{value}</span>}
      </label>
      {children}
    </div>
  );
}

// ── Shared styles ───────────────────────────────────────────────────
const selectStyle: React.CSSProperties = {
  background: '#161a24',
  border: '1px solid #1e2330',
  color: '#e2e8f0',
  padding: '7px 10px',
  borderRadius: 6,
  fontSize: 13,
  width: '100%',
};

const inputStyle: React.CSSProperties = {
  background: '#161a24',
  border: '1px solid #1e2330',
  color: '#e2e8f0',
  padding: '7px 10px',
  borderRadius: 6,
  fontSize: 13,
  width: '100%',
};

const sliderStyle: React.CSSProperties = {
  width: '100%',
  accentColor: '#38bdf8',
};
