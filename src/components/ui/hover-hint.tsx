import * as React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface HoverHintProps {
  /** The text to show in the tooltip. When `undefined` or empty the wrapper is a no-op pass-through. */
  label?: React.ReactNode;
  /** Single child element — must accept a `ref` (use `asChild` semantics). */
  children: React.ReactElement;
  /** Tooltip side — defaults to `top`. */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Tooltip alignment — defaults to `center`. */
  align?: 'start' | 'center' | 'end';
  /** Open delay in ms — defaults to 250 (snappy but doesn't trigger on quick scans). */
  delayDuration?: number;
  /** Optional className for the content surface. */
  contentClassName?: string;
}

/**
 * Drop-in replacement for the native `title` attribute that uses shadcn/Radix
 * Tooltip for consistent theming, controlled delay, and proper z-index handling
 * inside dialogs / fullscreen modals.
 *
 * - When `label` is `undefined` or empty, returns the child directly so the DOM
 *   stays clean (no extra wrapper, no Radix machinery).
 * - Wraps the child via `asChild` so existing event handlers / refs are preserved.
 * - Relies on the global `<TooltipProvider>` mounted in `App.tsx`.
 */
export function HoverHint({
  label,
  children,
  side = 'top',
  align = 'center',
  delayDuration = 250,
  contentClassName,
}: HoverHintProps) {
  if (label === undefined || label === null || label === '') return children;
  return (
    <Tooltip delayDuration={delayDuration}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} align={align} className={contentClassName}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
