/**
 * src/features/player/utils.ts
 */

export function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatDelta(seconds: number): string {
  const sign = seconds < 0 ? '-' : '+';
  const abs = Math.abs(Math.round(seconds));
  const mins = Math.floor(abs / 60);
  const secs = abs % 60;
  if (mins > 0) {
    return `${sign}${mins}:${secs.toString().padStart(2, '0')}`;
  }
  return `${sign}${secs}s`;
}

export function formatSleepTimer(seconds: number): string {
  if (seconds === -1) return '⏸';
  if (seconds <= 0) return `${seconds}s`;
  const mins = Math.ceil(seconds / 60);
  return `${mins}m`;
}

export function isColorLight(hex: string): boolean {
  const color = hex.replace('#', '');
  if (color.length !== 6) return true;
  const r = parseInt(color.substr(0, 2), 16);
  const g = parseInt(color.substr(2, 2), 16);
  const b = parseInt(color.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const color = hex.replace('#', '');
  if (color.length !== 6) return null;
  return {
    r: parseInt(color.substr(0, 2), 16),
    g: parseInt(color.substr(2, 2), 16),
    b: parseInt(color.substr(4, 2), 16),
  };
}

export function getColorSaturation(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const { r, g, b } = rgb;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
}

export function pickMostSaturated(colors: (string | undefined)[]): string | null {
  let best: string | null = null;
  let bestSat = -1;
  for (const c of colors) {
    if (!c) continue;
    const sat = getColorSaturation(c);
    if (sat > bestSat) {
      bestSat = sat;
      best = c;
    }
  }
  return best;
}

export function getTitleFontSize(title: string): { fontSize: number; lineHeight: number } {
  if (title.length > 40) return { fontSize: 18, lineHeight: 22 };
  if (title.length > 25) return { fontSize: 20, lineHeight: 24 };
  return { fontSize: 24, lineHeight: 28 };
}
