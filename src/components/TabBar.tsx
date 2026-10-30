import type { LucideIcon } from 'lucide-react';
import { cn } from '../utils/format';

export interface TabSpec<Id extends string> {
  id: Id;
  label: string;
  icon: LucideIcon;
}

interface TabBarProps<Id extends string> {
  tabs: Array<TabSpec<Id>>;
  active: Id;
  onChange: (id: Id) => void;
}

/** Floating pill navigation — safe-area aware, gold active state. */
export function TabBar<Id extends string>({ tabs, active, onChange }: TabBarProps<Id>) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+10px)]">
      <nav
        className="pointer-events-auto mx-auto flex max-w-md items-stretch rounded-[26px] border border-outline-soft bg-surface/90 p-1.5 shadow-[0_18px_50px_-12px_rgb(0_0_0/0.65)] backdrop-blur-xl"
        aria-label="Primary"
      >
        <ul className="flex w-full items-stretch">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === active;
            return (
              <li key={tab.id} className="flex-1">
                <button
                  type="button"
                  onClick={() => onChange(tab.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'relative flex w-full flex-col items-center gap-0.5 rounded-[20px] px-1 py-2 transition-all duration-200 active:scale-95',
                    isActive
                      ? 'bg-gradient-to-b from-sky-400/25 to-sky-500/10'
                      : 'hover:bg-white/[0.03]',
                  )}
                >
                  <Icon
                    className={cn(
                      'h-[22px] w-[22px] transition-colors',
                      isActive ? 'text-sky-400' : 'text-text-muted',
                    )}
                    strokeWidth={isActive ? 2.2 : 1.7}
                  />
                  <span
                    className={cn(
                      'text-[10px] font-semibold tracking-tight transition-colors',
                      isActive ? 'text-sky-300' : 'text-text-muted',
                    )}
                  >
                    {tab.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
