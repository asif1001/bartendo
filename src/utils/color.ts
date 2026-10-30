/** Colour helpers shared by the picker, presets and previews. */

export type RGB = [number, number, number];

/** `#rrggbb` from triple. */
export function rgbToHex(rgb: RGB): string {
  const [r, g, b] = rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b
    .toString(16)
    .padStart(2, '0')}`.toUpperCase();
}

/** Parse `#rgb` or `#rrggbb`; returns null when invalid. */
export function parseHex(hex: string): RGB | null {
  const clean = hex.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{6}$/.test(clean)) {
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16),
    ];
  }
  if (/^[0-9a-fA-F]{3}$/.test(clean)) {
    const [r, g, b] = clean
      .split('')
      .map((c) => parseInt(c + c, 16));
    return [r, g, b];
  }
  return null;
}

/** Perceived luminance 0–255 for contrast decisions. */
export function luminance(rgb: RGB): number {
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

/** Soft fade/dim of a hex colour by factor (0-1). */
export function dim(hex: string, factor: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  return rgbToHex(rgb.map((v) => Math.round(v * factor)) as RGB);
}
