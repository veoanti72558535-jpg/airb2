import React from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'muted';

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-primary/15 text-primary',
  warning: 'bg-warning/15 text-warning',
  error: 'bg-destructive/15 text-destructive',
  info: 'bg-info/15 text-info',
  muted: 'bg-muted text-muted-foreground',
};

interface StatusBadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function StatusBadge({ variant, children, className }: StatusBadgeProps) {
  return (
    <span className={cn('inline-flex items-center text-xs font-medium px-2 py-0.5 rounded', variantClasses[variant], className)}>
      {children}
    </span>
  );
}