import { useState } from 'react';
import { cn } from '../utils/format';

interface DrinkImageProps {
  /** Path from the drink record, e.g. `drinks/mojito.jpg`. */
  src?: string;
  alt: string;
  className?: string;
}

/** Local drink photo with an emoji fallback when offline/source missing. */
export function DrinkImage({ src, alt, className }: DrinkImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn(
          'flex items-center justify-center bg-gradient-to-br from-indigo-500/25 via-rose-500/20 to-sky-500/25 text-2xl',
          className,
        )}
      >
        🍹
      </div>
    );
  }

  return (
    <img
      src={`${import.meta.env.BASE_URL}${src}`}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn('object-cover', className)}
    />
  );
}
