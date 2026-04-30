/**
 * A1 — Dashboard Widget system with drag-and-drop reordering.
 * Uses @dnd-kit (already installed) for widget repositioning.
 * Widgets: Last Session, Quick Stats, Weather, AI Quota, Favorites, Progression.
 */
import { useState, useMemo, useCallback } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Star, Clock, Zap, Cloud, Brain, TrendingUp, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';
import { sessionStore, airgunStore, projectileStore, opticStore, getSettings } from '@/lib/storage';
import { getSortedFavorites, formatLastUsed, getLastSession } from '@/lib/session-favorites';

const WIDGET_ORDER_KEY = 'airballistik-widget-order';

type WidgetId = 'lastSession' | 'quickStats' | 'favorites' | 'weather' | 'progression' | 'aiStatus' | 'quickActions';

const DEFAULT_ORDER: WidgetId[] = ['quickActions', 'lastSession', 'quickStats', 'favorites', 'weather', 'progression', 'aiStatus'];

function loadOrder(): WidgetId[] {
  try {
    const raw = localStorage.getItem(WIDGET_ORDER_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_ORDER;
}

function saveOrder(order: WidgetId[]) {
  localStorage.setItem(WIDGET_ORDER_KEY, JSON.stringify(order));
}

/** Sortable wrapper for each widget card */
function SortableWidget({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 0,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <button
        {...attributes}
        {...listeners}
        className="absolute right-2 top-2 p-1 rounded opacity-0 group-hover:opacity-60 hover:!opacity-100 text-muted-foreground cursor-grab active:cursor-grabbing transition-opacity z-10"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      {children}
    </div>
  );
}

// ── Widget: Quick Actions ──
function QuickActionsWidget() {
  const navigate = useNavigate();
  const { t } = useI18n();
  return (
    <div className="surface-elevated p-4 space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {[
          { path: '/calc', icon: Target, label: 'QuickCalc', color: 'text-primary' },
          { path: '/field-mode', icon: Zap, label: 'Terrain', color: 'text-amber-500' },
          { path: '/range-simulator', icon: Target, label: 'Simulateur', color: 'text-blue-500' },
        ].map(({ path, icon: Icon, label, color }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
          >
            <Icon className={`h-5 w-5 ${color}`} />
            <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Widget: Last Session ──
function LastSessionWidget() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  // Use the shared "last used" helper (most recent updatedAt) so the
  // dashboard, the Preferences "Reprendre" shortcut and any future
  // surface always agree on which session is "the last one".
  const last = getLastSession(sessionStore.getAll());

  if (!last) {
    return (
      <div className="surface-elevated p-4">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1 mb-2">
          <Clock className="h-3 w-3" /> Dernière session
        </div>
        <p className="text-xs text-muted-foreground italic">Aucune session. Allez dans QuickCalc !</p>
      </div>
    );
  }

  const lastRow = last.results?.[last.results.length - 1];
  return (
    <button onClick={() => navigate(`/sessions/${last.id}`)} className="surface-elevated p-4 text-left w-full hover:border-primary/30 transition-colors">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1 mb-2">
        <Clock className="h-3 w-3" /> Dernière session
      </div>
      <div className="text-sm font-semibold truncate">{last.name}</div>
      <div className="text-[10px] text-muted-foreground font-mono">{new Date(last.createdAt).toLocaleDateString(locale)}</div>
      {lastRow && (
        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
          <span>MV {last.input.muzzleVelocity} m/s</span>
          <span>BC {last.input.bc}</span>
          <span>{lastRow.energy.toFixed(0)}J @ {lastRow.range}m</span>
        </div>
      )}
    </button>
  );
}

// ── Widget: Quick Stats ──
function QuickStatsWidget() {
  const sessions = sessionStore.getAll();
  const airguns = airgunStore.getAll();
  const projectiles = projectileStore.getAll();
  const optics = opticStore.getAll();

  const stats = [
    { label: 'Sessions', value: sessions.length, color: 'text-primary' },
    { label: 'Armes', value: airguns.length, color: 'text-amber-500' },
    { label: 'Projectiles', value: projectiles.length, color: 'text-blue-500' },
    { label: 'Optiques', value: optics.length, color: 'text-purple-500' },
  ];

  return (
    <div className="surface-elevated p-4">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1 mb-3">
        <TrendingUp className="h-3 w-3" /> Bibliothèque
      </div>
      <div className="grid grid-cols-4 gap-2">
        {stats.map(({ label, value, color }) => (
          <div key={label} className="text-center">
            <div className={`text-xl font-mono font-bold ${color}`}>{value}</div>
            <div className="text-[8px] text-muted-foreground uppercase">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Widget: Favorites ──
function FavoritesWidget() {
  const navigate = useNavigate();
  const { locale } = useI18n();
  const favSessions = getSortedFavorites(sessionStore.getAll());

  return (
    <div className="surface-elevated p-4">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1 mb-2">
        <Star className="h-3 w-3" /> Favoris
      </div>
      {favSessions.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Aucun favori</p>
      ) : (
        <div className="space-y-1">
          {favSessions.slice(0, 3).map(s => (
            <button
              key={s.id}
              onClick={() => navigate(`/sessions/${s.id}`)}
              className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors"
            >
              <Star className="h-3 w-3 text-primary fill-primary shrink-0" />
              <span className="text-xs truncate">{s.name}</span>
              <span className="text-[10px] text-muted-foreground ml-auto font-mono shrink-0">
                {formatLastUsed(s.updatedAt, locale)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Widget: Weather ──
function WeatherWidget() {
  const sessions = sessionStore.getAll();
  const last = sessions.length > 0 ? sessions[sessions.length - 1] : null;
  const weather = last?.input.weather;

  return (
    <div className="surface-elevated p-4">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1 mb-2">
        <Cloud className="h-3 w-3" /> Conditions
      </div>
      {weather ? (
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-lg font-mono font-bold">{weather.temperature}°</div>
            <div className="text-[8px] text-muted-foreground uppercase">Temp</div>
          </div>
          <div>
            <div className="text-lg font-mono font-bold">{weather.pressure}</div>
            <div className="text-[8px] text-muted-foreground uppercase">hPa</div>
          </div>
          <div>
            <div className="text-lg font-mono font-bold">{weather.windSpeed}</div>
            <div className="text-[8px] text-muted-foreground uppercase">m/s</div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">Aucune donnée météo</p>
      )}
    </div>
  );
}

// ── Widget: Progression ──
function ProgressionWidget() {
  const sessions = sessionStore.getAll();
  const recent = sessions.slice(-7);

  return (
    <div className="surface-elevated p-4">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1 mb-2">
        <TrendingUp className="h-3 w-3" /> Activité (7 dernières)
      </div>
      {recent.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Aucune activité</p>
      ) : (
        <div className="flex items-end gap-1 h-12">
          {recent.map((s, i) => {
            const maxE = Math.max(...recent.map(r => r.results?.[r.results.length - 1]?.energy ?? 1));
            const e = s.results?.[s.results.length - 1]?.energy ?? 0;
            const h = Math.max(4, (e / maxE) * 48);
            return (
              <div key={s.id} className="flex-1 flex flex-col items-center justify-end gap-0.5">
                <div className="w-full bg-primary/30 rounded-t" style={{ height: `${h}px` }} />
                <div className="text-[6px] text-muted-foreground">{i + 1}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Widget: AI Status ──
function AiStatusWidget() {
  const settings = getSettings();
  return (
    <div className="surface-elevated p-4">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1 mb-2">
        <Brain className="h-3 w-3" /> IA
      </div>
      <div className="flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${settings.featureFlags.ai ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-xs">{settings.featureFlags.ai ? 'Agents IA activés' : 'IA désactivée'}</span>
      </div>
    </div>
  );
}

const WIDGET_MAP: Record<WidgetId, React.ComponentType> = {
  quickActions: QuickActionsWidget,
  lastSession: LastSessionWidget,
  quickStats: QuickStatsWidget,
  favorites: FavoritesWidget,
  weather: WeatherWidget,
  progression: ProgressionWidget,
  aiStatus: AiStatusWidget,
};

export function DashboardWidgets() {
  const [order, setOrder] = useState<WidgetId[]>(() => loadOrder());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setOrder((items) => {
        const oldIndex = items.indexOf(active.id as WidgetId);
        const newIndex = items.indexOf(over.id as WidgetId);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        saveOrder(newOrder);
        return newOrder;
      });
    }
  }, []);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {order.map((widgetId) => {
            const Widget = WIDGET_MAP[widgetId];
            if (!Widget) return null;
            return (
              <SortableWidget key={widgetId} id={widgetId}>
                <Widget />
              </SortableWidget>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
