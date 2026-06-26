import type { NetworkTheme, NetworkThemeName } from './types';

type NetworkThemeColorKey =
  | 'backgroundColor'
  | 'nodeColor'
  | 'linkColor'
  | 'refLinkColor'
  | 'primaryColor'
  | 'accentColor'
  | 'textColor'
  | 'selectedColor'
  | 'neighborColor'
  | 'panelBackground';

const COLOR_KEYS: NetworkThemeColorKey[] = [
  'backgroundColor',
  'nodeColor',
  'linkColor',
  'refLinkColor',
  'primaryColor',
  'accentColor',
  'textColor',
  'selectedColor',
  'neighborColor',
  'panelBackground',
];

const OBSIDIAN_THEME: NetworkTheme = {
  name: 'obsidian',
  backgroundColor: '#11131a',
  nodeColor: '#8b5cf6',
  linkColor: '#455066',
  refLinkColor: '#64748b',
  primaryColor: '#8b5cf6',
  accentColor: '#60a5fa',
  textColor: '#d8dee9',
  selectedColor: '#f8fafc',
  neighborColor: '#60a5fa',
  mutedOpacity: 0.18,
  panelBackground: '#1b2030',
  clusterColors: ['#60a5fa', '#22c55e', '#f59e0b', '#ef4444', '#a78bfa', '#14b8a6'],
};

const LIGHT_THEME: NetworkTheme = {
  name: 'light',
  backgroundColor: '#f8fafc',
  nodeColor: '#2563eb',
  linkColor: '#cbd5e1',
  refLinkColor: '#94a3b8',
  primaryColor: '#2563eb',
  accentColor: '#db2777',
  textColor: '#0f172a',
  selectedColor: '#111827',
  neighborColor: '#2563eb',
  mutedOpacity: 0.22,
  panelBackground: '#ffffff',
  clusterColors: ['#2563eb', '#14b8a6', '#8b5cf6', '#f97316', '#10b981', '#db2777'],
};

const HEX_COLOR = /^#(?:[\da-f]{3}|[\da-f]{6})$/i;
const COLOR_NAME = /^[a-zA-Z]+$/;
const CSS_VAR = /^var\(\s*--[a-zA-Z0-9_-]+\s*\)$/;
const UNSAFE_CSS_VALUE = /javascript:|vbscript:|expression\s*\(|url\s*\(/i;

export function resolveNetworkTheme(input: Record<string, unknown>): NetworkTheme {
  const requestedTheme = themeNameValue(input.theme);
  let theme: NetworkTheme;

  if (requestedTheme === 'light') {
    theme = copyTheme(LIGHT_THEME);
  } else if (requestedTheme === 'auto') {
    theme = copyTheme(shouldUseLightTheme(input.backgroundColor) ? LIGHT_THEME : OBSIDIAN_THEME);
  } else if (requestedTheme === 'custom') {
    theme = {
      ...copyTheme(OBSIDIAN_THEME),
      name: 'custom',
    };
  } else {
    theme = copyTheme(OBSIDIAN_THEME);
  }

  return applyThemeOverrides(theme, input);
}

export function networkThemeStyle(theme: NetworkTheme): string {
  const clusterColors = theme.clusterColors.map((color) => safeStyleColor(color)).filter(Boolean);

  return [
    `--xcon-network-bg:${safeStyleColor(theme.backgroundColor)}`,
    `--xcon-network-node:${safeStyleColor(theme.nodeColor)}`,
    `--xcon-network-link:${safeStyleColor(theme.linkColor)}`,
    `--xcon-network-ref-link:${safeStyleColor(theme.refLinkColor)}`,
    `--xcon-network-primary:${safeStyleColor(theme.primaryColor)}`,
    `--xcon-network-accent:${safeStyleColor(theme.accentColor)}`,
    `--xcon-network-text:${safeStyleColor(theme.textColor)}`,
    `--xcon-network-selected:${safeStyleColor(theme.selectedColor)}`,
    `--xcon-network-neighbor:${safeStyleColor(theme.neighborColor)}`,
    `--xcon-network-muted-opacity:${clampOpacity(theme.mutedOpacity)}`,
    `--xcon-network-panel:${safeStyleColor(theme.panelBackground)}`,
    `--xcon-network-cluster-colors:${clusterColors.join(',')}`,
  ].join(';');
}

function applyThemeOverrides(theme: NetworkTheme, input: Record<string, unknown>): NetworkTheme {
  for (const key of COLOR_KEYS) {
    const value = safeColorValue(input[key]);
    if (value) theme[key] = value;
  }

  const clusterColors = clusterColorsValue(input.clusterColors);
  if (clusterColors.length > 0) theme.clusterColors = clusterColors;

  const mutedOpacity = numberValue(input.mutedOpacity);
  if (mutedOpacity !== undefined) theme.mutedOpacity = clampOpacity(mutedOpacity);

  return theme;
}

function copyTheme(theme: NetworkTheme): NetworkTheme {
  return {
    ...theme,
    clusterColors: [...theme.clusterColors],
  };
}

function themeNameValue(value: unknown): NetworkThemeName | undefined {
  const name = stringValue(value)?.toLowerCase();
  if (name === 'obsidian' || name === 'light' || name === 'auto' || name === 'custom') return name;
  return undefined;
}

function shouldUseLightTheme(backgroundColor: unknown): boolean {
  const color = safeColorValue(backgroundColor);
  if (!color || !HEX_COLOR.test(color)) return false;

  const { r, g, b } = hexToRgb(color);
  return relativeLuminance(r, g, b) > 0.5;
}

function safeStyleColor(value: string): string {
  return safeColorValue(value) ?? '';
}

function safeColorValue(value: unknown): string | undefined {
  const color = stringValue(value);
  if (!color || UNSAFE_CSS_VALUE.test(color)) return undefined;
  if (HEX_COLOR.test(color) || COLOR_NAME.test(color) || CSS_VAR.test(color)) return color;
  return undefined;
}

function clusterColorsValue(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const color = safeColorValue(item);
    return color ? [color] : [];
  });
}

function stringValue(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function clampOpacity(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function hexToRgb(hexColor: string): { r: number; g: number; b: number } {
  const hex = hexColor.slice(1);
  if (hex.length === 3) {
    return {
      r: Number.parseInt(hex[0] + hex[0], 16),
      g: Number.parseInt(hex[1] + hex[1], 16),
      b: Number.parseInt(hex[2] + hex[2], 16),
    };
  }

  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  };
}

function relativeLuminance(red: number, green: number, blue: number): number {
  const [r, g, b] = [red, green, blue].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
