import { ReactNode, useState } from 'react';
import { LucideIcon, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectionProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  /** When true, the section can collapse. Defaults to true on mobile via CSS. */
  collapsible?: boolean;
  /** Default open state when collapsible. */
  defaultOpen?: boolean;
  /** Visual accent — used to mark advanced sections. */
  variant?: 'default' | 'advanced';
}

/** Reusable section card for the QuickCalc page. Supports collapse for advanced screens. */
export function Section({
  icon: Icon,
  title,
  description,
  action,
  children,
  collapsible = false,
  defaultOpen = true,
  variant = 'default',
}: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const isOpen = collapsible ? open : true;

  return (
    <section
      className={cn(
        'rounded-xl border bg-card/60 backdrop-blur-sm',
        variant === 'advanced'
          ? 'border-primary/25 bg-gradient-to-br from-card via-card/80 to-primary/5'
          : 'border-border',
      )}
    >
      <header
        className={cn(
          'flex items-start justify-between gap-3 p-4',
          isOpen ? 'pb-3' : '',
          collapsible && 'cursor-pointer select-none',
        )}
        onClick={collapsible ? () => setOpen(o => !o) : undefined}
      >
        <div className="flex items-start gap-2.5 min-w-0">
          <div
            className={cn(
              'mt-0.5 p-1.5 rounded-md shrink-0',
              variant === 'advanced'
                ? 'bg-primary/15 text-primary'
                : 'bg-primary/10 text-primary',
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-heading font-semibold leading-tight">{title}</h3>
            {description && (
              <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {action && <div onClick={e => e.stopPropagation()}>{action}</div>}
          {collapsible && (
            <ChevronDown
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform',
                isOpen && 'rotate-180',
              )}
              aria-hidden
            />
          )}
        </div>
      </header>
      {isOpen && <div className="px-4 pb-4 space-y-2.5">{children}</div>}
    </section>
  );
}
