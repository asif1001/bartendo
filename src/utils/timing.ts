/** Small timing helpers used by the control surfaces. */

export type DebouncedFn = (...args: never[]) => void;

/** Classic trailing debounce. */
export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  delayMs: number,
): (...args: A) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: A) => {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
}

/** Leading-edge throttle + trailing call, ideal for slider movement. */
export function throttleWithTrailing<A extends unknown[]>(
  fn: (...args: A) => void,
  intervalMs: number,
): (...args: A) => void {
  let lastCall = 0;
  let trailingTimer: ReturnType<typeof setTimeout> | undefined;
  let pendingArgs: A | null = null;

  return (...args: A) => {
    pendingArgs = args;
    const now = Date.now();
    const elapsed = now - lastCall;
    if (elapsed >= intervalMs) {
      lastCall = now;
      pendingArgs = null;
      fn(...args);
      if (trailingTimer !== undefined) {
        clearTimeout(trailingTimer);
        trailingTimer = undefined;
      }
    }
    if (trailingTimer === undefined) {
      trailingTimer = setTimeout(() => {
        trailingTimer = undefined;
        if (pendingArgs) {
          lastCall = Date.now();
          const finalArgs = pendingArgs;
          pendingArgs = null;
          fn(...finalArgs);
        }
      }, intervalMs - elapsed);
    }
  };
}
