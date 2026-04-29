/**
 * Shared "More" navigation definition.
 *
 * Extracted from `Layout.tsx` so the AccessibilityCard simulator can
 * preview the EXACT same item order as the real panel — without
 * importing the full Layout (which would pull router, theme, auth, …).
 * Layout re-imports from this module so there is only ONE source of
 * truth for the More panel's contents.
 */
import {
  Crosshair, Target, Eye, Camera, Trophy, Calendar,
  MessageCircle, FlaskConical, FileText, Search,
  Settings, Shield,
  type LucideIcon,
} from 'lucide-react';

export type MoreItem = { path: string; icon: LucideIcon; labelKey: string };
export type MoreSection = { titleKey: string; items: MoreItem[] };

export const moreSections: MoreSection[] = [
  {
    titleKey: 'nav.section.fieldTools',
    items: [
      { path: '/field-mode',      icon: Crosshair,    labelKey: 'nav.fieldMode' },
      { path: '/range-simulator', icon: Target,       labelKey: 'nav.rangeSimulator' },
      { path: '/scope-view',      icon: Eye,          labelKey: 'nav.scopeView' },
      { path: '/target-analysis', icon: Camera,       labelKey: 'nav.targetAnalysis' },
    ],
  },
  {
    titleKey: 'nav.section.competition',
    items: [
      { path: '/ft-competition', icon: Trophy,   labelKey: 'nav.ftCompetition' },
      { path: '/diary',          icon: Calendar, labelKey: 'nav.diary' },
    ],
  },
  {
    titleKey: 'nav.section.aiAndDocs',
    items: [
      { path: '/chat',             icon: MessageCircle, labelKey: 'nav.chat' },
      { path: '/cross-validation', icon: FlaskConical,  labelKey: 'nav.crossValidation' },
      { path: '/docs',             icon: FileText,      labelKey: 'nav.docs' },
      { path: '/search',           icon: Search,        labelKey: 'nav.search' },
    ],
  },
  {
    titleKey: 'nav.section.system',
    items: [
      { path: '/settings',          icon: Settings, labelKey: 'nav.settings' },
      { path: '/settings?tab=data', icon: Shield,   labelKey: 'nav.admin' },
    ],
  },
];

export const moreFlat: MoreItem[] = moreSections.flatMap((s) => s.items);