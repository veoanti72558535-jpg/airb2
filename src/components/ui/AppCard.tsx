import React from 'react';
import { cn } from '@/lib/utils';

interface AppCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'active' | 'ghost';
}

export function AppCard({ variant = 'default', className, children, ...props }: AppCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl p-4 transition-colors duration-150',
        variant === 'default' && 'bg-card border border-border',
        variant === 'active' && 'bg-card border border-primary/20',
        variant === 'ghost' && 'bg-transparent border border-border/50',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}