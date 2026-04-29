import React, { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Single source of truth for the desktop sidebar's icon-rail items.
 *
 * Why this exists
 * ──────────────
 * Before this refactor the same set of utility classes lived in three places
 * (sidebar `Link`s, the admin `Link`s, the "More" `<button>`) and a few
 * adjacent footer controls (locale, theme, avatar). Drift between them caused
 * sub-pixel shifts on hover and inconsistent focus rings. `RailItem`
 * mutualises every visual concern — geometry, transitions, hover, active,
 * focus, the active-indicator bar, the icon stroke ramp and the label — so
 * Link variants and button variants are pixel-perfect peers.
 *
 * Three flavours, one component
 * ─────────────────────────────
 *   • <RailItem to="/x" …>           → renders a <Link>
 *   • <RailItem onClick={…} …>       → renders a <button>
 *   • <RailItem variant="footer" …>  → compact footer chip (locale/theme/avatar)
 *
 * Both flavours share the same `railItemClass`, so any future style tweak
 * lands on every item at once.
 */

type Variant = 'rail' | 'footer';

interface BaseProps {
  /** Active route / pressed state — drives accent bar, ring, icon weight. */
  active?: boolean;
  /**
   * Icon component (lucide-react). Optional for footer chips with custom
   * content. Typed as the full `LucideIcon` so every SVG/lucide prop
   * (`size`, `color`, `strokeWidth`, `absoluteStrokeWidth`, refs, …) is
   * accepted without the previous narrowed signature mismatch.
   */
  icon?: LucideIcon;
  /** Visible label under the icon (rail variant). Footer variant uses children. */
  label?: string;
  /** Tooltip / aria-label fallback. */
  title?: string;
  /** Footer variant tweaks geometry (no full-width box, no label slot by default). */
  variant?: Variant;
  /** Additional class names appended to the shared base. */
  className?: string;
  /** Free-form content (footer variant). */
  children?: React.ReactNode;
}

type LinkProps = BaseProps & { to: string; onClick?: never };
type ButtonProps = BaseProps & {
  to?: never;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  ariaLabel?: string;
  ariaExpanded?: boolean;
  /**
   * Optional id of the region this button controls (e.g. a panel/dialog).
   * Surfaces `aria-controls` for screen-reader users so the relationship
   * between trigger and disclosed region is announced.
   */
  ariaControls?: string;
  /**
   * When true, the button toggles a *disclosable* surface and `aria-pressed`
   * is suppressed (Tab-and-toggle ambiguity). Use with `ariaExpanded` only.
   */
  isDisclosure?: boolean;
};

/**
 * Optional callbacks shared by both flavours so consumers can surface
 * additional state to assistive tech (e.g. emit a live-region update when
 * an item is hovered while the sidebar is collapsed and labels are hidden).
 */
type SharedExtras = {
  /** Suffix appended to `aria-label` for nav links — typically "(actif)" / "(active)". */
  activeLabelSuffix?: string;
  /** Hint announced when the rail is collapsed (e.g. "barre réduite"). */
  collapsedHint?: string;
};

export type RailItemProps = (LinkProps | ButtonProps) & SharedExtras;

/**
 * Shared base classes — exported so adjacent components (e.g. mobile bottom
 * nav) can opt into the same focus/transition contract without reimplementing.
 */
export const railItemBase = cn(
  // Cheap transitions: only color/background interpolated; no layout/shadow churn.
  'transition-[color,background-color] duration-100 ease-out motion-reduce:transition-none',
  // Visible & consistent keyboard focus across every rail item.
  // Inset ring so the halo never gets clipped by the sidebar border, the
  // footer divider, or by sibling rail items sitting edge-to-edge. Inset
  // also removes the need for ring-offset (which would bleed outside the
  // rounded box and look truncated against the card surface).
  'outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary'
);

export function railItemClass(active: boolean, variant: Variant = 'rail'): string {
  if (variant === 'footer') {
    return cn(
      'flex items-center justify-center rounded-lg',
      railItemBase,
      active
        ? 'text-primary bg-primary/[0.08]'
        : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
    );
  }
  return cn(
    // Tightened rail item: fixed 64×52 footprint kills any reflow when labels
    // change locale (FR labels run ~30% longer than EN). gap-[3px] keeps the
    // icon-to-label rhythm crisp without stealing vertical space.
    'group/rail relative flex flex-col items-center justify-center gap-[3px] w-16 h-[52px] rounded-xl',
    railItemBase,
    active
      ? 'text-primary bg-primary/[0.08] ring-1 ring-inset ring-primary/15'
      : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
  );
}

function railLabelClass(active: boolean): string {
  return cn(
    // leading-none + fixed 9px size locks the label box height regardless of
    // descenders; truncate guards the longest FR strings ("Conversions",
    // "Bibliothèque"…). max-w-full ensures the container width clamps the text.
    'text-[9px] leading-none text-center truncate max-w-full px-1 tracking-wide',
    active ? 'font-semibold' : 'font-medium'
  );
}

/**
 * Active-state accent bar (left edge). Extracted so geometry stays in one
 * place — height, width, gradient and offset are tuned together.
 */
function ActiveBar() {
  return (
    <span
      aria-hidden
      className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[2px] rounded-r-full bg-primary"
    />
  );
}

const RailItemInner = forwardRef<HTMLElement, RailItemProps>(function RailItemInner(
  props,
  ref
) {
  const {
    active = false,
    icon: Icon,
    label,
    title,
    variant = 'rail',
    className,
    children,
  } = props;
  const { activeLabelSuffix, collapsedHint } = props;

  const cls = cn(railItemClass(active, variant), className);

  // Rail variant content (icon + label + active bar). Footer variant just
  // forwards children — locale chip / theme button / avatar each have their
  // own composition rules but share the base classes via railItemClass.
  const content =
    variant === 'footer' ? (
      <>{children}</>
    ) : (
      <>
        {active && <ActiveBar />}
        {Icon && <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.1 : 1.85} />}
        {label && <span className={railLabelClass(active)}>{label}</span>}
      </>
    );

  if ('to' in props && props.to !== undefined) {
    // Announce active route + (optionally) the collapsed-rail context so
    // screen-reader users get the same hierarchy sighted users see when
    // the visible label is hidden in the icon-only sidebar.
    const baseLabel = title ?? label;
    const labelParts = [baseLabel];
    if (active && activeLabelSuffix) labelParts.push(`(${activeLabelSuffix})`);
    if (collapsedHint) labelParts.push(`— ${collapsedHint}`);
    const linkAriaLabel = baseLabel ? labelParts.filter(Boolean).join(' ') : undefined;
    return (
      <Link
        ref={ref as React.Ref<HTMLAnchorElement>}
        to={props.to}
        title={title}
        aria-current={active ? 'page' : undefined}
        aria-label={linkAriaLabel}
        data-state={active ? 'active' : 'inactive'}
        data-collapsed={!label || undefined}
        className={cls}
      >
        {content}
      </Link>
    );
  }

  const btnProps = props as ButtonProps;
  const isDisclosure = btnProps.isDisclosure ?? btnProps.ariaExpanded !== undefined;
  const baseBtnLabel = btnProps.ariaLabel ?? title ?? label;
  const btnLabelParts = [baseBtnLabel];
  if (active && activeLabelSuffix && !isDisclosure) btnLabelParts.push(`(${activeLabelSuffix})`);
  if (collapsedHint) btnLabelParts.push(`— ${collapsedHint}`);
  const btnAriaLabel = baseBtnLabel ? btnLabelParts.filter(Boolean).join(' ') : undefined;
  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      type="button"
      onClick={btnProps.onClick}
      title={title}
      aria-label={btnAriaLabel}
      aria-expanded={btnProps.ariaExpanded}
      aria-controls={btnProps.ariaControls}
      // For disclosure buttons (those owning a panel via aria-expanded),
      // skip aria-pressed: the two states would conflict semantically.
      // For plain toggles/segmented controls, expose pressed state.
      aria-pressed={isDisclosure ? undefined : (active || undefined)}
      data-state={active ? 'active' : 'inactive'}
      data-collapsed={!label || undefined}
      className={cls}
    >
      {content}
    </button>
  );
});

export const RailItem = RailItemInner as <T extends RailItemProps>(
  props: T & { ref?: React.Ref<HTMLElement> }
) => React.ReactElement;