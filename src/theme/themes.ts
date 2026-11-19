export type ThemeId =
  | 'crimson-dusk'
  | 'ambedic-cyan'
  | 'marble-grave'
  | 'halice'
  | 'vamor'
  | 'bruma'
  | 'trumst';

export type ThemeShapeId = 'rounded' | 'sharp';
export type ThemeMode = 'dark' | 'light';
export type ThemeCategory = 'standard' | 'seasons';

export type ThemeColors = {
  bg: string;
  bgDeep: string;
  surface: string;
  surfaceHover: string;
  surfaceInset: string;
  surfaceInsetAlt: string;
  border: string;
  borderSubtle: string;
  borderStrong: string;
  text: string;
  textBright: string;
  textSecondary: string;
  textMuted: string;
  textFaint: string;
  headerBg: string;
  headerBorder: string;
  headerText: string;
  headerMuted: string;
  headerBtnBg: string;
  accent: string;
  accentHover: string;
  accentBorder: string;
  accentSoft: string;
  accentText: string;
  accentHighlight: string;
  accentOnFill: string;
  badgeWarnText: string;
  badgeSuccessText: string;
  modalBackdrop: string;
  // Sheet semantic & decorative letter tokens
  dropcap: string;
  tierAccent: string;
  tierText: string;
  tierBgTop: string;
  tierBgMid: string;
  infoText: string;
  posText: string;
  warnText: string;
  negText: string;
  arcaneText: string;
  attrGrt: string;
  attrRef: string;
  attrInt: string;
  attrPsy: string;
};

export type ThemeShapes = {
  radiusPanel: string;
  radiusCard: string;
  radiusControl: string;
  radiusModal: string;
  radiusBadge: string;
};

export type ThemePreset = {
  id: ThemeId;
  name: string;
  subtitle: string;
  category: ThemeCategory;
  mode: ThemeMode;
  shapeId: ThemeShapeId;
  colors: ThemeColors;
  shapes: ThemeShapes;
  swatches?: [string, string, string];
};

export const THEME_STORAGE_KEY = 'reverie-theme-id';
export const DEFAULT_THEME_ID: ThemeId = 'crimson-dusk';

const ROUNDED_SHAPES: ThemeShapes = {
  radiusPanel: '0.75rem',
  radiusCard: '0.5rem',
  radiusControl: '0.5rem',
  radiusModal: '0.875rem',
  radiusBadge: '0.25rem',
};

const DARK_LETTER_COLORS = {
  infoText: '#22d3ee',
  posText: '#4ade80',
  warnText: '#fbbf24',
  negText: '#f87171',
  arcaneText: '#c084fc',
  attrGrt: '#ef4444',
  attrRef: '#22c55e',
  attrInt: '#3b82f6',
  attrPsy: '#a855f7',
};

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'crimson-dusk',
    name: 'Crimson Dusk',
    subtitle: 'Default · Dark slate, crimson accents & crisp rounded cards',
    category: 'standard',
    mode: 'dark',
    shapeId: 'rounded',
    colors: {
      bg: '#111827',
      bgDeep: '#030712',
      surface: '#1f2937',
      surfaceHover: '#374151',
      surfaceInset: 'rgba(0, 0, 0, 0.34)',
      surfaceInsetAlt: 'rgba(0, 0, 0, 0.22)',
      border: '#374151',
      borderSubtle: 'rgba(55, 65, 81, 0.65)',
      borderStrong: '#4b5563',
      text: '#e5e7eb',
      textBright: '#f9fafb',
      textSecondary: '#d1d5db',
      textMuted: '#9ca3af',
      textFaint: '#6b7280',
      headerBg: '#450a0a',
      headerBorder: '#7f1d1d',
      headerText: '#ffffff',
      headerMuted: '#fecaca',
      headerBtnBg: 'rgba(127, 29, 29, 0.55)',
      accent: '#7f1d1d',
      accentHover: '#991b1b',
      accentBorder: '#b91c1c',
      accentSoft: 'rgba(69, 10, 10, 0.42)',
      accentText: '#fca5a5',
      accentHighlight: '#f87171',
      accentOnFill: '#ffffff',
      badgeWarnText: '#fbbf24',
      badgeSuccessText: '#34d399',
      modalBackdrop: 'rgba(0, 0, 0, 0.7)',
      dropcap: '#ef4444',
      tierAccent: '#ef4444',
      tierText: '#fca5a5',
      tierBgTop: '#231018',
      tierBgMid: '#110b12',
      ...DARK_LETTER_COLORS,
    },
    shapes: ROUNDED_SHAPES,
    swatches: ['#111827', '#7f1d1d', '#ef4444'],
  },
  {
    id: 'ambedic-cyan',
    name: 'Ambedic Cyan',
    subtitle: 'Pitch black obsidian, deep cyan chrome & luminous ice highlights',
    category: 'standard',
    mode: 'dark',
    shapeId: 'rounded',
    colors: {
      bg: '#06090d',
      bgDeep: '#020305',
      surface: '#0d141c',
      surfaceHover: '#15222f',
      surfaceInset: 'rgba(2, 5, 10, 0.68)',
      surfaceInsetAlt: 'rgba(6, 12, 20, 0.45)',
      border: '#173242',
      borderSubtle: 'rgba(23, 50, 66, 0.72)',
      borderStrong: '#1e4a63',
      text: '#e2eef4',
      textBright: '#f4fbff',
      textSecondary: '#bfd7e4',
      textMuted: '#7ea4b8',
      textFaint: '#527385',
      headerBg: '#062633',
      headerBorder: '#0e7490',
      headerText: '#ecfeff',
      headerMuted: '#a5f3fc',
      headerBtnBg: 'rgba(14, 116, 144, 0.48)',
      accent: '#0e7490',
      accentHover: '#0891b2',
      accentBorder: '#22d3ee',
      accentSoft: 'rgba(14, 116, 144, 0.28)',
      accentText: '#67e8f9',
      accentHighlight: '#22d3ee',
      accentOnFill: '#ffffff',
      badgeWarnText: '#fbbf24',
      badgeSuccessText: '#34d399',
      modalBackdrop: 'rgba(1, 4, 8, 0.82)',
      dropcap: '#22d3ee',
      tierAccent: '#22d3ee',
      tierText: '#a5f3fc',
      tierBgTop: '#0d2936',
      tierBgMid: '#06141d',
      ...DARK_LETTER_COLORS,
    },
    shapes: ROUNDED_SHAPES,
    swatches: ['#06090d', '#0e7490', '#22d3ee'],
  },
  {
    id: 'marble-grave',
    name: 'Marble Grave',
    subtitle: 'Carved black-grey granite, ash stone borders & pale marble bone',
    category: 'standard',
    mode: 'dark',
    shapeId: 'rounded',
    colors: {
      bg: '#0c0d10',
      bgDeep: '#050608',
      surface: '#16181d',
      surfaceHover: '#23262e',
      surfaceInset: 'rgba(5, 6, 8, 0.64)',
      surfaceInsetAlt: 'rgba(12, 13, 17, 0.46)',
      border: '#30343d',
      borderSubtle: 'rgba(48, 52, 61, 0.75)',
      borderStrong: '#525866',
      text: '#e6e8ec',
      textBright: '#f8fafc',
      textSecondary: '#cdd2da',
      textMuted: '#9299a6',
      textFaint: '#636975',
      headerBg: '#181a20',
      headerBorder: '#4b515e',
      headerText: '#f4f6f8',
      headerMuted: '#cbd5e1',
      headerBtnBg: 'rgba(65, 71, 82, 0.55)',
      accent: '#3b404c',
      accentHover: '#4d5463',
      accentBorder: '#7e8697',
      accentSoft: 'rgba(69, 75, 88, 0.34)',
      accentText: '#e5e7eb',
      accentHighlight: '#d1d5db',
      accentOnFill: '#f9fafb',
      badgeWarnText: '#fbbf24',
      badgeSuccessText: '#34d399',
      modalBackdrop: 'rgba(3, 3, 5, 0.84)',
      dropcap: '#d1d5db',
      tierAccent: '#cbd5e1',
      tierText: '#f1f5f9',
      tierBgTop: '#24272f',
      tierBgMid: '#121419',
      ...DARK_LETTER_COLORS,
    },
    shapes: ROUNDED_SHAPES,
    swatches: ['#0c0d10', '#3b404c', '#d1d5db'],
  },
  // --- SEASONS CATEGORY ---
  {
    id: 'halice',
    name: 'Halice',
    subtitle: 'Deep woodland moss green & regal amethyst purple',
    category: 'seasons',
    mode: 'dark',
    shapeId: 'rounded',
    colors: {
      bg: '#09120e',
      bgDeep: '#040906',
      surface: '#112019',
      surfaceHover: '#192e24',
      surfaceInset: 'rgba(4, 10, 7, 0.56)',
      surfaceInsetAlt: 'rgba(9, 18, 14, 0.42)',
      border: '#254235',
      borderSubtle: 'rgba(37, 66, 53, 0.72)',
      borderStrong: '#3a6350',
      text: '#e4ede8',
      textBright: '#f4faf6',
      textSecondary: '#c7d8cf',
      textMuted: '#8ea89b',
      textFaint: '#5f786c',
      headerBg: '#27133d',
      headerBorder: '#7e22ce',
      headerText: '#f5f3ff',
      headerMuted: '#e9d5ff',
      headerBtnBg: 'rgba(126, 34, 206, 0.4)',
      accent: '#6b21a8',
      accentHover: '#7e22ce',
      accentBorder: '#a855f7',
      accentSoft: 'rgba(107, 33, 168, 0.3)',
      accentText: '#d8b4fe',
      accentHighlight: '#c084fc',
      accentOnFill: '#faf5ff',
      badgeWarnText: '#fbbf24',
      badgeSuccessText: '#4ade80',
      modalBackdrop: 'rgba(4, 10, 7, 0.78)',
      dropcap: '#c084fc',
      tierAccent: '#a855f7',
      tierText: '#e9d5ff',
      tierBgTop: '#241439',
      tierBgMid: '#0f2018',
      ...DARK_LETTER_COLORS,
    },
    shapes: ROUNDED_SHAPES,
    swatches: ['#112019', '#6b21a8', '#c084fc'],
  },
  {
    id: 'vamor',
    name: 'Vamor',
    subtitle: 'Obsidian pitch black, vivid blood crimson & scarlet highlights',
    category: 'seasons',
    mode: 'dark',
    shapeId: 'rounded',
    colors: {
      bg: '#080405',
      bgDeep: '#020102',
      surface: '#110709',
      surfaceHover: '#1d0c10',
      surfaceInset: 'rgba(4, 1, 2, 0.7)',
      surfaceInsetAlt: 'rgba(10, 3, 5, 0.48)',
      border: '#451018',
      borderSubtle: 'rgba(69, 16, 24, 0.74)',
      borderStrong: '#731a27',
      text: '#f2e9ea',
      textBright: '#fffafa',
      textSecondary: '#dcc8cb',
      textMuted: '#b38b91',
      textFaint: '#7d585e',
      headerBg: '#2e040a',
      headerBorder: '#991b1b',
      headerText: '#fff5f5',
      headerMuted: '#fecaca',
      headerBtnBg: 'rgba(153, 27, 27, 0.48)',
      accent: '#8f111e',
      accentHover: '#b91c1c',
      accentBorder: '#ef4444',
      accentSoft: 'rgba(143, 17, 30, 0.34)',
      accentText: '#fca5a5',
      accentHighlight: '#ef4444',
      accentOnFill: '#ffffff',
      badgeWarnText: '#fbbf24',
      badgeSuccessText: '#34d399',
      modalBackdrop: 'rgba(2, 0, 1, 0.84)',
      dropcap: '#ef4444',
      tierAccent: '#ef4444',
      tierText: '#fecaca',
      tierBgTop: '#3b070e',
      tierBgMid: '#160407',
      ...DARK_LETTER_COLORS,
    },
    shapes: ROUNDED_SHAPES,
    swatches: ['#080405', '#8f111e', '#ef4444'],
  },
  {
    id: 'bruma',
    name: 'Bruma',
    subtitle: 'Roasted umber brown & warm autumn ember orange',
    category: 'seasons',
    mode: 'dark',
    shapeId: 'rounded',
    colors: {
      bg: '#17100b',
      bgDeep: '#0d0805',
      surface: '#241911',
      surfaceHover: '#332318',
      surfaceInset: 'rgba(12, 8, 4, 0.56)',
      surfaceInsetAlt: 'rgba(20, 13, 8, 0.42)',
      border: '#4f3727',
      borderSubtle: 'rgba(79, 55, 39, 0.72)',
      borderStrong: '#7c4e2d',
      text: '#efe5dc',
      textBright: '#faf5ef',
      textSecondary: '#d8c9bc',
      textMuted: '#ad9886',
      textFaint: '#7e6959',
      headerBg: '#462210',
      headerBorder: '#c2410c',
      headerText: '#fff7ed',
      headerMuted: '#fed7aa',
      headerBtnBg: 'rgba(194, 65, 12, 0.4)',
      accent: '#9a3412',
      accentHover: '#c2410c',
      accentBorder: '#ea580c',
      accentSoft: 'rgba(154, 52, 18, 0.32)',
      accentText: '#fdba74',
      accentHighlight: '#fb923c',
      accentOnFill: '#fff7ed',
      badgeWarnText: '#fbbf24',
      badgeSuccessText: '#4ade80',
      modalBackdrop: 'rgba(14, 9, 5, 0.78)',
      dropcap: '#fb923c',
      tierAccent: '#fb923c',
      tierText: '#fed7aa',
      tierBgTop: '#3e1e0e',
      tierBgMid: '#211209',
      ...DARK_LETTER_COLORS,
    },
    shapes: ROUNDED_SHAPES,
    swatches: ['#241911', '#9a3412', '#fb923c'],
  },
  {
    id: 'trumst',
    name: 'Trumst',
    subtitle: 'Midnight winter sapphire blue & forged frost silver',
    category: 'seasons',
    mode: 'dark',
    shapeId: 'rounded',
    colors: {
      bg: '#09101c',
      bgDeep: '#050911',
      surface: '#111c2e',
      surfaceHover: '#1a2a44',
      surfaceInset: 'rgba(4, 8, 16, 0.6)',
      surfaceInsetAlt: 'rgba(8, 14, 26, 0.44)',
      border: '#2c4160',
      borderSubtle: 'rgba(44, 65, 96, 0.72)',
      borderStrong: '#4b6b94',
      text: '#e4ecf5',
      textBright: '#f8fafc',
      textSecondary: '#cbd5e1',
      textMuted: '#94a3b8',
      textFaint: '#64748b',
      headerBg: '#0f254a',
      headerBorder: '#3b82f6',
      headerText: '#f8fafc',
      headerMuted: '#e2e8f0',
      headerBtnBg: 'rgba(37, 99, 235, 0.38)',
      accent: '#1e3a8a',
      accentHover: '#1d4ed8',
      accentBorder: '#94a3b8',
      accentSoft: 'rgba(30, 58, 138, 0.36)',
      accentText: '#e2e8f0',
      accentHighlight: '#60a5fa',
      accentOnFill: '#f8fafc',
      badgeWarnText: '#fbbf24',
      badgeSuccessText: '#34d399',
      modalBackdrop: 'rgba(4, 8, 15, 0.8)',
      dropcap: '#e2e8f0',
      tierAccent: '#60a5fa',
      tierText: '#e2e8f0',
      tierBgTop: '#162c54',
      tierBgMid: '#0c182e',
      ...DARK_LETTER_COLORS,
    },
    shapes: ROUNDED_SHAPES,
    swatches: ['#09101c', '#1e3a8a', '#cbd5e1'],
  },
];

const SEASON_TO_THEME_ID: Record<string, ThemeId> = {
  halice: 'halice',
  vamor: 'vamor',
  bruma: 'bruma',
  trumst: 'trumst',
};

/**
 * Resolves a character's dynamic seasonal theme when enabled.
 * Uses the highest-ranked named Conviction with rank >= 3;
 * ties are broken by the leftmost (lowest array index) Conviction.
 */
export function resolveDynamicConvictionThemeId(
  convictions?: Array<{ season?: string; name?: string; rank?: number }>
): ThemeId | null {
  if (!Array.isArray(convictions) || convictions.length === 0) return null;
  let bestRank = 2;
  let bestTheme: ThemeId | null = null;

  for (const conv of convictions) {
    if (!conv || !conv.name || !conv.name.trim()) continue;
    const rank = Number(conv.rank ?? 0);
    if (rank < 3) continue;
    const normalizedSeason = String(conv.season || '').trim().toLowerCase();
    const mapped = SEASON_TO_THEME_ID[normalizedSeason];
    if (!mapped) continue;

    if (rank > bestRank) {
      bestRank = rank;
      bestTheme = mapped;
    }
  }

  return bestTheme;
}

export function getThemeById(id?: string | null): ThemePreset {
  return THEME_PRESETS.find(t => t.id === id) || THEME_PRESETS[0];
}

export function getStoredThemeId(): ThemeId {
  if (typeof window === 'undefined') return DEFAULT_THEME_ID;
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    return getThemeById(raw).id;
  } catch {
    return DEFAULT_THEME_ID;
  }
}

export function storeThemeId(id: ThemeId): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, id);
  } catch {
    // ignore storage errors
  }
}

export function applyThemeToDocument(preset: ThemePreset): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.theme = preset.id;
  root.dataset.themeMode = preset.mode;
  root.dataset.themeShape = preset.shapeId;
  root.style.colorScheme = preset.mode;

  const { colors, shapes } = preset;
  root.style.setProperty('--rev-bg', colors.bg);
  root.style.setProperty('--rev-bg-deep', colors.bgDeep);
  root.style.setProperty('--rev-surface', colors.surface);
  root.style.setProperty('--rev-surface-hover', colors.surfaceHover);
  root.style.setProperty('--rev-surface-inset', colors.surfaceInset);
  root.style.setProperty('--rev-surface-inset-alt', colors.surfaceInsetAlt);
  root.style.setProperty('--rev-border', colors.border);
  root.style.setProperty('--rev-border-subtle', colors.borderSubtle);
  root.style.setProperty('--rev-border-strong', colors.borderStrong);
  root.style.setProperty('--rev-text', colors.text);
  root.style.setProperty('--rev-text-bright', colors.textBright);
  root.style.setProperty('--rev-text-secondary', colors.textSecondary);
  root.style.setProperty('--rev-text-muted', colors.textMuted);
  root.style.setProperty('--rev-text-faint', colors.textFaint);
  root.style.setProperty('--rev-header-bg', colors.headerBg);
  root.style.setProperty('--rev-header-border', colors.headerBorder);
  root.style.setProperty('--rev-header-text', colors.headerText);
  root.style.setProperty('--rev-header-muted', colors.headerMuted);
  root.style.setProperty('--rev-header-btn', colors.headerBtnBg);
  root.style.setProperty('--rev-accent', colors.accent);
  root.style.setProperty('--rev-accent-hover', colors.accentHover);
  root.style.setProperty('--rev-accent-border', colors.accentBorder);
  root.style.setProperty('--rev-accent-soft', colors.accentSoft);
  root.style.setProperty('--rev-accent-text', colors.accentText);
  root.style.setProperty('--rev-accent-highlight', colors.accentHighlight);
  root.style.setProperty('--rev-accent-on-fill', colors.accentOnFill);
  root.style.setProperty('--rev-badge-warn', colors.badgeWarnText);
  root.style.setProperty('--rev-badge-success', colors.badgeSuccessText);
  root.style.setProperty('--rev-modal-backdrop', colors.modalBackdrop);

  root.style.setProperty('--rev-dropcap', colors.dropcap);
  root.style.setProperty('--rev-tier-accent', colors.tierAccent);
  root.style.setProperty('--rev-tier-text', colors.tierText);
  root.style.setProperty('--rev-tier-bg-top', colors.tierBgTop);
  root.style.setProperty('--rev-tier-bg-mid', colors.tierBgMid);
  root.style.setProperty('--rev-info-text', colors.infoText);
  root.style.setProperty('--rev-pos-text', colors.posText);
  root.style.setProperty('--rev-warn-text', colors.warnText);
  root.style.setProperty('--rev-neg-text', colors.negText);
  root.style.setProperty('--rev-arcane-text', colors.arcaneText);
  root.style.setProperty('--rev-attr-grt', colors.attrGrt);
  root.style.setProperty('--rev-attr-ref', colors.attrRef);
  root.style.setProperty('--rev-attr-int', colors.attrInt);
  root.style.setProperty('--rev-attr-psy', colors.attrPsy);

  root.style.setProperty('--rev-radius-panel', shapes.radiusPanel);
  root.style.setProperty('--rev-radius-card', shapes.radiusCard);
  root.style.setProperty('--rev-radius-control', shapes.radiusControl);
  root.style.setProperty('--rev-radius-modal', shapes.radiusModal);
  root.style.setProperty('--rev-radius-badge', shapes.radiusBadge);
}
