interface ToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}

/** Touch-friendly settings toggle. */
export function Toggle({ label, description, checked, onChange, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-2xl px-1 py-3 text-left transition active:scale-[0.99] disabled:opacity-40"
      aria-pressed={checked}
    >
      <span className="min-w-0">
        <span className="block text-[15px] font-medium text-text">{label}</span>
        {description && (
          <span className="mt-0.5 block text-xs text-text-muted">{description}</span>
        )}
      </span>
      <span
        className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors duration-200 ${
          checked
            ? 'border-sky-400/70 bg-sky-500/80'
            : 'border-outline bg-surface-2'
        }`}
      >
        <span
          className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow transition-all duration-200 ${
            checked ? 'left-6' : 'left-1'
          }`}
        />
      </span>
    </button>
  );
}
