import { useState } from 'react';
import { cn } from '../utils/format';

interface DrinkImageProps {
  /** Site path (`drinks/<id>.jpg`) or an uploaded photo (`data:` URL). */
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

  const isAbsolute = src.startsWith('data:') || src.startsWith('http');

  return (
    <img
      src={isAbsolute ? src : `${import.meta.env.BASE_URL}${src}`}
      alt={alt}
      loading={isAbsolute ? undefined : 'lazy'}
      onError={() => setFailed(true)}
      className={cn('object-cover', className)}
    />
  );
}
