import type { ReactNode } from 'react';
import { cn } from '../utils/format';

interface CardProps {
  children: ReactNode;
  className?: string;
}

/** Glassy elevated container used across all screens. */
export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-3xl border border-outline-soft bg-surface/90 p-5 shadow-[0_10px_40px_-15px_rgb(var(--shadow-color)/0.4)] backdrop-blur',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-2 text-sm font-semibold tracking-wide text-text-muted uppercase">
      {icon}
      {children}
    </div>
  );
}
