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

/** Fixed bottom navigation, safe-area aware, 6 primary destinations. */
export function TabBar<Id extends string>({ tabs, active, onChange }: TabBarProps<Id>) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-outline-soft bg-surface/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
      aria-label="Primary"
    >
      <ul className="mx-auto flex max-w-lg items-stretch">
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
                  'flex w-full flex-col items-center gap-1 px-1 pt-2.5 pb-2 transition-colors',
                  isActive ? 'text-sky-400' : 'text-text-muted hover:text-text',
                )}
              >
                <span
                  className={cn(
                    'rounded-full px-4 py-1 transition-all',
                    isActive && 'bg-sky-500/15',
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2.4 : 1.8} />
                </span>
                <span className="text-[10px] font-semibold tracking-tight">{tab.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
