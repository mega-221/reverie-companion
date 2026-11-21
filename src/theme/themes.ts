export type ThemeId =
  | 'colorless-sky'
  | 'ambedic-cyan'
  | 'crimson-dusk'
  | 'halice'
  | 'vamor'
  | 'bruma'
  | 'trumst'
  | 'halice-2'
  | 'vamor-2'
  | 'bruma-2'
  | 'trumst-2'
  | 'eterion'
  | 'agmar'
  | 'vesperik'
  | 'duiber'
  | 'lior';

export type ThemeShapeId = 'rounded' | 'sharp';
export type ThemeMode = 'dark' | 'light';
export type ThemeCategory = 'standard' | 'seasons' | 'planes';

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
  healBorder?: string;
  quoteBorder?: string;
  statBoxBorder?: string;
  tabHoverBg?: string;
  tabHoverText?: string;
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
export const DEFAULT_THEME_ID: ThemeId = 'colorless-sky';

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
    id: 'colorless-sky',
    name: 'Colorless Sky',
    subtitle: 'All Souls will rest under the colorless sky, in intertwined coherence and null perception.',
    category: 'standard',
    mode: 'dark',
    shapeId: 'rounded',
    colors: {
      bg: '#080809',
      bgDeep: '#040405',
      surface: '#121111',
      surfaceHover: '#1c1917',
      surfaceInset: '#0b0a0a',
      surfaceInsetAlt: 'rgba(11, 10, 10, 0.78)',
      border: '#292524',
      borderSubtle: 'rgba(41, 37, 36, 0.85)',
      borderStrong: '#57534e',
      text: '#f5f5f4',
      textBright: '#f5f5f4',
      textSecondary: '#d6d3d1',
      textMuted: '#a8a29e',
      textFaint: '#78716c',
      headerBg: '#10181f',
      headerBorder: 'rgba(186, 230, 253, 0.42)',
      headerText: '#f5f5f4',
      headerMuted: '#cbd5e1',
      headerBtnBg: 'rgba(186, 230, 253, 0.12)',
      accent: '#15222e',
      accentHover: '#1c2d3d',
      accentBorder: 'rgba(186, 230, 253, 0.48)',
      accentSoft: 'rgba(186, 230, 253, 0.12)',
      accentText: '#bae6fd',
      accentHighlight: '#bae6fd',
      accentOnFill: '#f0f9ff',
      badgeWarnText: '#fbbf24',
      badgeSuccessText: '#34d399',
      modalBackdrop: 'rgba(2, 2, 3, 0.86)',
      dropcap: '#bae6fd',
      tierAccent: '#bae6fd',
      tierText: '#e0f2fe',
      tierBgTop: '#10181f',
      tierBgMid: '#0c0e11',
      healBorder: '#57534e',
      quoteBorder: '#44403c',
      statBoxBorder: '#292524',
      tabHoverBg: 'rgba(186, 230, 253, 0.06)',
      tabHoverText: '#bae6fd',
      ...DARK_LETTER_COLORS,
    },
    shapes: ROUNDED_SHAPES,
    swatches: ['#080809', '#d6d3d1', '#bae6fd'],
  },
  {
    id: 'ambedic-cyan',
    name: 'Ambedic Shard',
    subtitle: 'The etched cyan crystal glimmers from within, anchoring an utterly terrible being.',
    category: 'standard',
    mode: 'dark',
    shapeId: 'rounded',
    colors: {
      bg: '#060b0e',
      bgDeep: '#030608',
      surface: '#0b151b',
      surfaceHover: '#11212b',
      surfaceInset: '#060d11',
      surfaceInsetAlt: 'rgba(6, 13, 17, 0.72)',
      border: 'rgba(217, 119, 6, 0.34)',
      borderSubtle: 'rgba(217, 119, 6, 0.24)',
      borderStrong: 'rgba(245, 158, 11, 0.55)',
      text: '#e2eef4',
      textBright: '#f4fbff',
      textSecondary: '#bfd7e4',
      textMuted: '#7ea4b8',
      textFaint: '#527385',
      headerBg: '#231607',
      headerBorder: 'rgba(217, 119, 6, 0.52)',
      headerText: '#22d3ee',
      headerMuted: '#67e8f9',
      headerBtnBg: 'rgba(217, 119, 6, 0.22)',
      accent: '#0891b2',
      accentHover: '#06b6d4',
      accentBorder: '#22d3ee',
      accentSoft: 'rgba(6, 182, 212, 0.18)',
      accentText: '#67e8f9',
      accentHighlight: '#22d3ee',
      accentOnFill: '#ffffff',
      badgeWarnText: '#fbbf24',
      badgeSuccessText: '#34d399',
      modalBackdrop: 'rgba(1, 4, 8, 0.84)',
      dropcap: '#22d3ee',
      tierAccent: '#22d3ee',
      tierText: '#a5f3fc',
      tierBgTop: '#0c2733',
      tierBgMid: '#07141c',
      healBorder: 'rgba(251, 191, 36, 0.45)',
      quoteBorder: 'rgba(251, 191, 36, 0.45)',
      statBoxBorder: 'rgba(217, 119, 6, 0.32)',
      tabHoverBg: 'rgba(34, 211, 238, 0.08)',
      tabHoverText: '#67e8f9',
      ...DARK_LETTER_COLORS,
    },
    shapes: ROUNDED_SHAPES,
    swatches: ['#060b0e', '#22d3ee', '#d97706'],
  },
  {
    id: 'crimson-dusk',
    name: 'Blueprint',
    subtitle: 'An example for others to follow.',
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
  // --- SEASONS CATEGORY ---
  {
    id: 'halice',
    name: 'Halice',
    subtitle: '',
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
    subtitle: '',
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
    subtitle: '',
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
    subtitle: '',
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
  // --- EXPERIMENTAL V2 SEASONS ---
  {
    id: 'halice-2',
    name: 'Halice 2',
    subtitle: '',
    category: 'seasons',
    mode: 'dark',
    shapeId: 'rounded',
    colors: {
      bg: '#070908',
      bgDeep: '#030404',
      surface: '#0d110f',
      surfaceHover: '#151c18',
      surfaceInset: 'rgba(3, 5, 4, 0.72)',
      surfaceInsetAlt: 'rgba(7, 10, 8, 0.54)',
      border: 'rgba(16, 185, 129, 0.22)',
      borderSubtle: 'rgba(167, 243, 208, 0.18)',
      borderStrong: 'rgba(167, 243, 208, 0.5)',
      text: '#e6ede9',
      textBright: '#f4faf6',
      textSecondary: '#cbd5e1',
      textMuted: '#94a3b8',
      textFaint: '#64748b',
      headerBg: '#081410',
      headerBorder: 'rgba(16, 185, 129, 0.5)',
      headerText: '#f4faf6',
      headerMuted: '#d1fae5',
      headerBtnBg: 'rgba(5, 150, 105, 0.24)',
      accent: '#059669',
      accentHover: '#10b981',
      accentBorder: '#10b981',
      accentSoft: 'rgba(5, 150, 105, 0.22)',
      accentText: '#a7f3d0',
      accentHighlight: '#10b981',
      accentOnFill: '#ffffff',
      badgeWarnText: '#fbbf24',
      badgeSuccessText: '#4ade80',
      modalBackdrop: 'rgba(2, 4, 3, 0.84)',
      dropcap: '#10b981',
      tierAccent: '#10b981',
      tierText: '#d1fae5',
      tierBgTop: '#0a2018',
      tierBgMid: '#080e0b',
      healBorder: 'rgba(167, 243, 208, 0.55)',
      quoteBorder: 'rgba(203, 213, 225, 0.5)',
      statBoxBorder: 'rgba(16, 185, 129, 0.22)',
      tabHoverBg: 'rgba(167, 243, 208, 0.08)',
      tabHoverText: '#cbd5e1',
      ...DARK_LETTER_COLORS,
    },
    shapes: ROUNDED_SHAPES,
    swatches: ['#070908', '#10b981', '#a7f3d0'],
  },
  {
    id: 'vamor-2',
    name: 'Vamor 2',
    subtitle: '',
    category: 'seasons',
    mode: 'dark',
    shapeId: 'rounded',
    colors: {
      bg: '#080707',
      bgDeep: '#040303',
      surface: '#110d0d',
      surfaceHover: '#1c1515',
      surfaceInset: 'rgba(6, 4, 4, 0.72)',
      surfaceInsetAlt: 'rgba(12, 9, 9, 0.54)',
      border: 'rgba(220, 38, 38, 0.25)',
      borderSubtle: 'rgba(180, 83, 9, 0.34)',
      borderStrong: 'rgba(217, 119, 6, 0.52)',
      text: '#f0eaea',
      textBright: '#fffafa',
      textSecondary: '#d8cccc',
      textMuted: '#a89696',
      textFaint: '#756363',
      headerBg: '#190808',
      headerBorder: 'rgba(220, 38, 38, 0.55)',
      headerText: '#fff5f5',
      headerMuted: '#fecaca',
      headerBtnBg: 'rgba(185, 28, 28, 0.28)',
      accent: '#b91c1c',
      accentHover: '#dc2626',
      accentBorder: '#dc2626',
      accentSoft: 'rgba(185, 28, 28, 0.24)',
      accentText: '#fca5a5',
      accentHighlight: '#dc2626',
      accentOnFill: '#ffffff',
      badgeWarnText: '#fbbf24',
      badgeSuccessText: '#34d399',
      modalBackdrop: 'rgba(3, 2, 2, 0.85)',
      dropcap: '#dc2626',
      tierAccent: '#dc2626',
      tierText: '#fecaca',
      tierBgTop: '#240a0a',
      tierBgMid: '#0e0808',
      healBorder: 'rgba(217, 119, 6, 0.55)',
      quoteBorder: 'rgba(217, 119, 6, 0.48)',
      statBoxBorder: 'rgba(180, 83, 9, 0.34)',
      ...DARK_LETTER_COLORS,
    },
    shapes: ROUNDED_SHAPES,
    swatches: ['#080707', '#dc2626', '#d97706'],
  },
  {
    id: 'bruma-2',
    name: 'Bruma 2',
    subtitle: '',
    category: 'seasons',
    mode: 'dark',
    shapeId: 'rounded',
    colors: {
      bg: '#080807',
      bgDeep: '#040403',
      surface: '#110f0d',
      surfaceHover: '#1c1814',
      surfaceInset: 'rgba(6, 5, 4, 0.72)',
      surfaceInsetAlt: 'rgba(12, 10, 8, 0.54)',
      border: 'rgba(245, 158, 11, 0.24)',
      borderSubtle: 'rgba(168, 162, 158, 0.26)',
      borderStrong: 'rgba(214, 207, 199, 0.48)',
      text: '#ede7e0',
      textBright: '#faf6f1',
      textSecondary: '#d6cfc7',
      textMuted: '#a8a29e',
      textFaint: '#78716c',
      headerBg: '#181107',
      headerBorder: 'rgba(245, 158, 11, 0.52)',
      headerText: '#fffbeb',
      headerMuted: '#fde68a',
      headerBtnBg: 'rgba(217, 119, 6, 0.26)',
      accent: '#d97706',
      accentHover: '#f59e0b',
      accentBorder: '#f59e0b',
      accentSoft: 'rgba(217, 119, 6, 0.22)',
      accentText: '#fcd34d',
      accentHighlight: '#f59e0b',
      accentOnFill: '#fffbeb',
      badgeWarnText: '#fbbf24',
      badgeSuccessText: '#4ade80',
      modalBackdrop: 'rgba(4, 3, 2, 0.84)',
      dropcap: '#f59e0b',
      tierAccent: '#f59e0b',
      tierText: '#fde68a',
      tierBgTop: '#241809',
      tierBgMid: '#0e0c09',
      healBorder: 'rgba(214, 207, 199, 0.52)',
      quoteBorder: 'rgba(214, 207, 199, 0.52)',
      statBoxBorder: 'rgba(168, 162, 158, 0.26)',
      ...DARK_LETTER_COLORS,
    },
    shapes: ROUNDED_SHAPES,
    swatches: ['#080807', '#f59e0b', '#d6cfc7'],
  },
  {
    id: 'trumst-2',
    name: 'Trumst 2',
    subtitle: '',
    category: 'seasons',
    mode: 'dark',
    shapeId: 'rounded',
    colors: {
      bg: '#06070a',
      bgDeep: '#030406',
      surface: '#0b0d12',
      surfaceHover: '#131722',
      surfaceInset: 'rgba(4, 5, 9, 0.72)',
      surfaceInsetAlt: 'rgba(8, 10, 16, 0.54)',
      border: 'rgba(59, 130, 246, 0.25)',
      borderSubtle: 'rgba(100, 116, 139, 0.3)',
      borderStrong: 'rgba(56, 189, 248, 0.52)',
      text: '#e6edf6',
      textBright: '#f8fafc',
      textSecondary: '#cbd5e1',
      textMuted: '#94a3b8',
      textFaint: '#64748b',
      headerBg: '#091224',
      headerBorder: 'rgba(59, 130, 246, 0.52)',
      headerText: '#f8fafc',
      headerMuted: '#dbeafe',
      headerBtnBg: 'rgba(37, 99, 235, 0.26)',
      accent: '#2563eb',
      accentHover: '#3b82f6',
      accentBorder: '#3b82f6',
      accentSoft: 'rgba(37, 99, 235, 0.22)',
      accentText: '#93c5fd',
      accentHighlight: '#38bdf8',
      accentOnFill: '#ffffff',
      badgeWarnText: '#fbbf24',
      badgeSuccessText: '#34d399',
      modalBackdrop: 'rgba(2, 3, 6, 0.85)',
      dropcap: '#3b82f6',
      tierAccent: '#3b82f6',
      tierText: '#dbeafe',
      tierBgTop: '#0d1933',
      tierBgMid: '#070a12',
      healBorder: 'rgba(56, 189, 248, 0.55)',
      quoteBorder: 'rgba(56, 189, 248, 0.45)',
      statBoxBorder: 'rgba(100, 116, 139, 0.3)',
      tabHoverBg: 'rgba(56, 189, 248, 0.08)',
      tabHoverText: '#bae6fd',
      ...DARK_LETTER_COLORS,
    },
    shapes: ROUNDED_SHAPES,
    swatches: ['#06070a', '#2563eb', '#38bdf8'],
  },
  // --- PLANES CATEGORY ---
  {
    id: 'eterion',
    name: 'Eterion',
    subtitle: '',
    category: 'planes',
    mode: 'dark',
    shapeId: 'rounded',
    colors: {
      bg: '#080c12',
      bgDeep: '#04060a',
      surface: '#191410',
      surfaceHover: '#241d17',
      surfaceInset: 'rgba(0, 0, 0, 0.34)',
      surfaceInsetAlt: 'rgba(0, 0, 0, 0.22)',
      border: 'rgba(217, 155, 82, 0.24)',
      borderSubtle: 'rgba(217, 155, 82, 0.18)',
      borderStrong: '#64748b',
      text: '#efe9e1',
      textBright: '#f8f4ee',
      textSecondary: '#d6cec4',
      textMuted: '#a39a90',
      textFaint: '#736b62',
      headerBg: '#251808',
      headerBorder: 'rgba(245, 158, 11, 0.55)',
      headerText: '#fffbeb',
      headerMuted: '#fde68a',
      headerBtnBg: 'rgba(217, 119, 6, 0.28)',
      accent: '#b45309',
      accentHover: '#d97706',
      accentBorder: '#f59e0b',
      accentSoft: 'rgba(245, 158, 11, 0.16)',
      accentText: '#fcd34d',
      accentHighlight: '#fbbf24',
      accentOnFill: '#fffbeb',
      badgeWarnText: '#fbbf24',
      badgeSuccessText: '#34d399',
      modalBackdrop: 'rgba(4, 6, 10, 0.86)',
      dropcap: '#fbbf24',
      tierAccent: '#fbbf24',
      tierText: '#fef3c7',
      tierBgTop: '#261b0e',
      tierBgMid: '#15110d',
      healBorder: 'rgba(148, 163, 184, 0.48)',
      quoteBorder: 'rgba(217, 155, 82, 0.4)',
      statBoxBorder: 'rgba(217, 155, 82, 0.2)',
      tabHoverBg: 'rgba(251, 191, 36, 0.08)',
      tabHoverText: '#fde68a',
      ...DARK_LETTER_COLORS,
    },
    shapes: ROUNDED_SHAPES,
    swatches: ['#080c12', '#191410', '#fbbf24'],
  },
  {
    id: 'agmar',
    name: 'Agmar',
    subtitle: '',
    category: 'planes',
    mode: 'dark',
    shapeId: 'rounded',
    colors: {
      bg: '#070810',
      bgDeep: '#04050a',
      surface: '#1a0f0e',
      surfaceHover: '#261614',
      surfaceInset: 'rgba(0, 0, 0, 0.34)',
      surfaceInsetAlt: 'rgba(0, 0, 0, 0.24)',
      border: 'rgba(194, 65, 12, 0.28)',
      borderSubtle: 'rgba(180, 83, 9, 0.24)',
      borderStrong: '#78350f',
      text: '#efe6e4',
      textBright: '#faf5f4',
      textSecondary: '#d6c4c0',
      textMuted: '#a38f8b',
      textFaint: '#735e5a',
      headerBg: '#151738',
      headerBorder: 'rgba(129, 140, 248, 0.55)',
      headerText: '#eef2ff',
      headerMuted: '#c7d2fe',
      headerBtnBg: 'rgba(99, 102, 241, 0.28)',
      accent: '#6366f1',
      accentHover: '#818cf8',
      accentBorder: '#a5b4fc',
      accentSoft: 'rgba(99, 102, 241, 0.2)',
      accentText: '#c7d2fe',
      accentHighlight: '#818cf8',
      accentOnFill: '#ffffff',
      badgeWarnText: '#fbbf24',
      badgeSuccessText: '#34d399',
      modalBackdrop: 'rgba(4, 5, 10, 0.86)',
      dropcap: '#c2410c',
      tierAccent: '#818cf8',
      tierText: '#e0e7ff',
      tierBgTop: '#161838',
      tierBgMid: '#0e0c18',
      healBorder: 'rgba(194, 65, 12, 0.48)',
      quoteBorder: 'rgba(194, 65, 12, 0.45)',
      statBoxBorder: 'rgba(194, 65, 12, 0.24)',
      tabHoverBg: 'rgba(129, 140, 248, 0.1)',
      tabHoverText: '#e0e7ff',
      ...DARK_LETTER_COLORS,
    },
    shapes: ROUNDED_SHAPES,
    swatches: ['#070810', '#c2410c', '#6366f1'],
  },
  {
    id: 'vesperik',
    name: 'Vesperik',
    subtitle: '',
    category: 'planes',
    mode: 'dark',
    shapeId: 'rounded',
    colors: {
      bg: '#04070d',
      bgDeep: '#020408',
      surface: '#08110c',
      surfaceHover: '#0f1d15',
      surfaceInset: 'rgba(0, 0, 0, 0.35)',
      surfaceInsetAlt: 'rgba(0, 0, 0, 0.25)',
      border: 'rgba(52, 92, 71, 0.34)',
      borderSubtle: 'rgba(52, 92, 71, 0.24)',
      borderStrong: '#94a3b8',
      text: '#e4ece7',
      textBright: '#f4faf6',
      textSecondary: '#cbd5e1',
      textMuted: '#8fa399',
      textFaint: '#5d7067',
      headerBg: '#291207',
      headerBorder: 'rgba(249, 115, 22, 0.54)',
      headerText: '#fff7ed',
      headerMuted: '#fed7aa',
      headerBtnBg: 'rgba(234, 88, 12, 0.28)',
      accent: '#c2410c',
      accentHover: '#ea580c',
      accentBorder: '#f97316',
      accentSoft: 'rgba(249, 115, 22, 0.16)',
      accentText: '#fdba74',
      accentHighlight: '#fb923c',
      accentOnFill: '#fff7ed',
      badgeWarnText: '#fbbf24',
      badgeSuccessText: '#34d399',
      modalBackdrop: 'rgba(2, 4, 8, 0.88)',
      dropcap: '#e2e8f0',
      tierAccent: '#f97316',
      tierText: '#fed7aa',
      tierBgTop: '#241207',
      tierBgMid: '#09100c',
      healBorder: 'rgba(203, 213, 225, 0.45)',
      quoteBorder: 'rgba(203, 213, 225, 0.36)',
      statBoxBorder: 'rgba(52, 92, 71, 0.3)',
      tabHoverBg: 'rgba(249, 115, 22, 0.08)',
      tabHoverText: '#fdba74',
      ...DARK_LETTER_COLORS,
    },
    shapes: ROUNDED_SHAPES,
    swatches: ['#04070d', '#08110c', '#f97316'],
  },
  {
    id: 'duiber',
    name: 'Duiber',
    subtitle: '',
    category: 'planes',
    mode: 'dark',
    shapeId: 'rounded',
    colors: {
      bg: '#060c14',
      bgDeep: '#03060b',
      surface: '#091d19',
      surfaceHover: '#0f2b25',
      surfaceInset: 'rgba(0, 0, 0, 0.32)',
      surfaceInsetAlt: 'rgba(0, 0, 0, 0.22)',
      border: 'rgba(16, 185, 129, 0.28)',
      borderSubtle: 'rgba(17, 94, 89, 0.45)',
      borderStrong: '#64748b',
      text: '#e4f0ed',
      textBright: '#f0f9ff',
      textSecondary: '#cbe0db',
      textMuted: '#89a8a2',
      textFaint: '#597570',
      headerBg: '#0b2436',
      headerBorder: 'rgba(56, 189, 248, 0.52)',
      headerText: '#f0f9ff',
      headerMuted: '#bae6fd',
      headerBtnBg: 'rgba(2, 132, 199, 0.3)',
      accent: '#0284c7',
      accentHover: '#0ea5e9',
      accentBorder: '#38bdf8',
      accentSoft: 'rgba(56, 189, 248, 0.16)',
      accentText: '#bae6fd',
      accentHighlight: '#7dd3fc',
      accentOnFill: '#f0f9ff',
      badgeWarnText: '#fbbf24',
      badgeSuccessText: '#34d399',
      modalBackdrop: 'rgba(3, 6, 11, 0.87)',
      dropcap: '#f0f9ff',
      tierAccent: '#38bdf8',
      tierText: '#e0f2fe',
      tierBgTop: '#0c2738',
      tierBgMid: '#081716',
      healBorder: 'rgba(148, 163, 184, 0.48)',
      quoteBorder: 'rgba(16, 185, 129, 0.42)',
      statBoxBorder: 'rgba(16, 185, 129, 0.26)',
      tabHoverBg: 'rgba(56, 189, 248, 0.1)',
      tabHoverText: '#bae6fd',
      ...DARK_LETTER_COLORS,
    },
    shapes: ROUNDED_SHAPES,
    swatches: ['#060c14', '#091d19', '#38bdf8'],
  },
  {
    id: 'lior',
    name: 'Lior',
    subtitle: '',
    category: 'planes',
    mode: 'dark',
    shapeId: 'rounded',
    colors: {
      bg: '#1c0b0e',
      bgDeep: '#120608',
      surface: '#231913',
      surfaceHover: '#2e2119',
      surfaceInset: 'rgba(0, 0, 0, 0.36)',
      surfaceInsetAlt: 'rgba(0, 0, 0, 0.24)',
      border: 'rgba(212, 163, 89, 0.28)',
      borderSubtle: 'rgba(212, 163, 89, 0.2)',
      borderStrong: 'rgba(212, 163, 89, 0.46)',
      text: '#f5ede2',
      textBright: '#fdf8f0',
      textSecondary: '#e7d3b0',
      textMuted: '#bfa98a',
      textFaint: '#8c785d',
      headerBg: '#2b1808',
      headerBorder: 'rgba(245, 158, 11, 0.52)',
      headerText: '#fffbeb',
      headerMuted: '#e7d3b0',
      headerBtnBg: 'rgba(217, 119, 6, 0.26)',
      accent: '#d97706',
      accentHover: '#f59e0b',
      accentBorder: '#f59e0b',
      accentSoft: 'rgba(217, 119, 6, 0.2)',
      accentText: '#fcd34d',
      accentHighlight: '#f59e0b',
      accentOnFill: '#fffbeb',
      badgeWarnText: '#fbbf24',
      badgeSuccessText: '#34d399',
      modalBackdrop: 'rgba(14, 5, 7, 0.86)',
      dropcap: '#f59e0b',
      tierAccent: '#f59e0b',
      tierText: '#fef3c7',
      tierBgTop: '#2b1808',
      tierBgMid: '#1d140f',
      healBorder: 'rgba(136, 19, 55, 0.9)',
      quoteBorder: 'rgba(212, 163, 89, 0.44)',
      statBoxBorder: 'rgba(212, 163, 89, 0.24)',
      tabHoverBg: 'rgba(245, 158, 11, 0.08)',
      tabHoverText: '#fcd34d',
      ...DARK_LETTER_COLORS,
    },
    shapes: ROUNDED_SHAPES,
    swatches: ['#1c0b0e', '#231913', '#f59e0b'],
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

  root.style.setProperty('--rev-heal-border', colors.healBorder ?? colors.accentBorder);
  root.style.setProperty('--rev-quote-border', colors.quoteBorder ?? colors.borderStrong);
  root.style.setProperty('--rev-stat-box-border', colors.statBoxBorder ?? colors.border);
  root.style.setProperty('--rev-tab-hover-bg', colors.tabHoverBg ?? colors.surfaceHover);
  root.style.setProperty('--rev-tab-hover-text', colors.tabHoverText ?? colors.textBright);
}
