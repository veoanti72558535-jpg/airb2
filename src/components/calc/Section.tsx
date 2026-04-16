import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface SectionProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}

/** Reusable section card for the QuickCalc page. */
export function Section({ icon: Icon, title, description, action, children }: SectionProps) {
  return (
    <section className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-4 space-y-3">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="mt-0.5 p-1.5 rounded-md bg-primary/10 text-primary shrink-0">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-heading font-semibold leading-tight">{title}</h3>
            {description && (
              <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
        </div>
        {action}
      </header>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}
