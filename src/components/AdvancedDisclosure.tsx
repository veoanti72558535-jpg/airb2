import { useState, ReactNode } from 'react';
import { ChevronDown, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

/** Compact, accessible collapsible section for "advanced fields" inside library forms. */
export function AdvancedDisclosure({ title, description, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/20">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted/40 rounded-lg transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Settings2 className="h-3.5 w-3.5 text-primary shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-semibold">{title}</div>
            {description && (
              <div className="text-[10px] text-muted-foreground truncate">{description}</div>
            )}
          </div>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform shrink-0',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && <div className="px-3 pb-3 pt-1 space-y-3">{children}</div>}
    </div>
  );
}
