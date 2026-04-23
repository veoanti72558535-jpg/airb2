import React from 'react';
import { cn } from '@/lib/utils';

interface BallisticValueProps {
  label: string;
  value: string | number;
  unit?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

const sizeMap = {
  sm: { label: 'text-[10px]', value: 'text-base' },
  md: { label: 'text-[11px]', value: 'text-xl' },
  lg: { label: 'text-[11px]', value: 'text-2xl' },
};

export function BallisticValue({ label, value, unit, size = 'md', color, className }: BallisticValueProps) {
  const s = sizeMap[size];
  return (
    <div className={cn('flex flex-col', className)}>
      <span className={cn(s.label, 'uppercase tracking-wider text-muted-foreground font-medium')}>{label}</span>
      <span className={cn(s.value, 'font-mono font-medium', color || 'text-primary')}>
        {value}
        {unit && <span className="text-muted-foreground text-xs ml-1">{unit}</span>}
      </span>
    </div>
  );
}