// File: src/features/player/utils/colorUtils.ts

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  if (!hex) return null;
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h, s, l };
}

export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

export function darkenColor(hex: string, factor: number = 0.2): string {
  if (!hex) return '#1A1A2E';
  const rgb = hexToRgb(hex);
  if (!rgb) return '#1A1A2E';
  return rgbToHex(
    rgb.r * (1 - factor),
    rgb.g * (1 - factor),
    rgb.b * (1 - factor)
  );
}

export function lightenColor(hex: string, factor: number = 0.2): string {
  if (!hex) return '#FFFFFF';
  const rgb = hexToRgb(hex);
  if (!rgb) return '#FFFFFF';
  return rgbToHex(
    rgb.r + (255 - rgb.r) * factor,
    rgb.g + (255 - rgb.g) * factor,
    rgb.b + (255 - rgb.b) * factor
  );
}

export function isLightColor(hex: string): boolean {
  if (!hex) return false;
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5;
}

// Get brighter version of same color with high saturation and minimum 65% lightness
export function getHighContrastAccent(hex: string): string {
  if (!hex) return '#FF6B6B';
  const rgb = hexToRgb(hex);
  if (!rgb) return '#FF6B6B';
  
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  
  // Keep same hue
  const newH = hsl.h;
  
  // High saturation (80%)
  const newS = 0.8;
  
  // Minimum 65% lightness to ensure visibility
  const newL = 0.65;
  
  const newRgb = hslToRgb(newH, newS, newL);
  return rgbToHex(newRgb.r, newRgb.g, newRgb.b);
}

export function getAccentColor(hex: string): string {
  if (!hex) return '#FF6B6B';
  const rgb = hexToRgb(hex);
  if (!rgb) return '#FF6B6B';
  
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  
  if (d !== 0) {
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  h = (h + 0.5) % 1;
  const newS = Math.min(1, s + 0.3);
  const newV = Math.min(1, v + 0.2);
  
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = newV * (1 - newS);
  const q = newV * (1 - f * newS);
  const t = newV * (1 - (1 - f) * newS);
  
  let newR = 0, newG = 0, newB = 0;
  switch (i % 6) {
    case 0: newR = newV; newG = t; newB = p; break;
    case 1: newR = q; newG = newV; newB = p; break;
    case 2: newR = p; newG = newV; newB = t; break;
    case 3: newR = p; newG = q; newB = newV; break;
    case 4: newR = t; newG = p; newB = newV; break;
    case 5: newR = newV; newG = p; newB = q; break;
  }
  
  return rgbToHex(newR * 255, newG * 255, newB * 255);
}

export function pickGradientColors(colors: string[]): { dark: string; light: string } {
  if (!colors || colors.length === 0) {
    return { dark: '#1A1A2E', light: '#2D2D44' };
  }

  const colorInfo = colors
    .map(hex => {
      const rgb = hexToRgb(hex);
      if (!rgb) return null;
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      return { hex, ...hsl };
    })
    .filter((c): c is { hex: string; h: number; s: number; l: number } => {
      if (!c) return false;
      return c.l > 0.08 && c.l < 0.92;
    });

  if (colorInfo.length === 0) {
    return { dark: '#1A1A2E', light: '#2D2D44' };
  }

  colorInfo.sort((a, b) => b.s - a.s);
  const baseColor = colorInfo[0];
  
  const darkRgb = hslToRgb(baseColor.h, Math.min(baseColor.s, 0.5), 0.18);
  const dark = rgbToHex(darkRgb.r, darkRgb.g, darkRgb.b);

  const lightRgb = hslToRgb(baseColor.h, Math.min(baseColor.s, 0.4), 0.32);
  const light = rgbToHex(lightRgb.r, lightRgb.g, lightRgb.b);

  return { dark, light };
}

const FALLBACK_PALETTES = [
  { bg: '#1A1A2E', accent: '#E94560' },
  { bg: '#16213E', accent: '#0F3460' },
  { bg: '#1B262C', accent: '#3282B8' },
  { bg: '#2C3333', accent: '#395B64' },
  { bg: '#222831', accent: '#00ADB5' },
  { bg: '#352F44', accent: '#5C5470' },
  { bg: '#1A1A2E', accent: '#E94560' },
  { bg: '#0F0E17', accent: '#FF8906' },
  { bg: '#232946', accent: '#EEBBC3' },
  { bg: '#121212', accent: '#BB86FC' },
  { bg: '#1F1B24', accent: '#03DAC6' },
  { bg: '#2D2D2D', accent: '#FF7597' },
];

export function getFallbackColors(bookId: string): { bg: string; accent: string } {
  if (!bookId) return FALLBACK_PALETTES[0];
  let hash = 0;
  for (let i = 0; i < bookId.length; i++) {
    hash = ((hash << 5) - hash) + bookId.charCodeAt(i);
    hash = hash & hash;
  }
  const index = Math.abs(hash) % FALLBACK_PALETTES.length;
  return FALLBACK_PALETTES[index];
}