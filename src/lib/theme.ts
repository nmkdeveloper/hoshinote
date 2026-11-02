import type { ThemeConfig, BuiltinThemeId } from '../types/theme';

export const BUILTIN_THEMES: Record<BuiltinThemeId, ThemeConfig> = {
  dark: {
    id: 'dark',
    name: 'Midnight Slate (Dark)',
    isDark: true,
    colors: {
      bgPrimary: '#090d16',
      bgSecondary: '#0f172a',
      bgTertiary: '#1e293b',
      bgEditor: '#090d16',
      border: '#1e293b',
      textPrimary: '#f8fafc',
      textSecondary: '#94a3b8',
      textBold: '#ffffff',
      accent: '#38bdf8',
      accentHover: '#0ea5e9',
      codeBg: '#050811',
      codeText: '#7dd3fc',
    },
  },
  light: {
    id: 'light',
    name: 'Soft Paper (Light)',
    isDark: false,
    colors: {
      bgPrimary: '#f8fafc',
      bgSecondary: '#f1f5f9',
      bgTertiary: '#e2e8f0',
      bgEditor: '#ffffff',
      border: '#cbd5e1',
      textPrimary: '#0f172a',
      textSecondary: '#475569',
      textBold: '#020617',
      accent: '#0284c7',
      accentHover: '#0369a1',
      codeBg: '#f1f5f9',
      codeText: '#0369a1',
    },
  },
  cute: {
    id: 'cute',
    name: 'Pastel Mochi (Cute)',
    isDark: false,
    colors: {
      bgPrimary: '#faf5f8',
      bgSecondary: '#fdf2f7',
      bgTertiary: '#fae8f2',
      bgEditor: '#ffffff',
      border: '#f5d0e3',
      textPrimary: '#4a3246',
      textSecondary: '#85617f',
      textBold: '#30182d',
      accent: '#ec4899',
      accentHover: '#db2777',
      codeBg: '#fff1f7',
      codeText: '#be185d',
    },
  },
};

const THEME_STORAGE_KEY = 'hoshinote_current_theme';
const CUSTOM_THEMES_STORAGE_KEY = 'hoshinote_custom_themes';

/**
 * Applies theme CSS variables to the document root (:root)
 */
export function applyTheme(theme: ThemeConfig): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const { colors } = theme;

  root.style.setProperty('--color-bg-primary', colors.bgPrimary);
  root.style.setProperty('--color-bg-secondary', colors.bgSecondary);
  root.style.setProperty('--color-bg-tertiary', colors.bgTertiary);
  root.style.setProperty('--color-bg-editor', colors.bgEditor);
  root.style.setProperty('--color-border', colors.border);
  root.style.setProperty('--color-text-primary', colors.textPrimary);
  root.style.setProperty('--color-text-secondary', colors.textSecondary);
  root.style.setProperty('--color-text-bold', colors.textBold);
  root.style.setProperty('--color-accent', colors.accent);
  root.style.setProperty('--color-accent-hover', colors.accentHover);
  root.style.setProperty('--color-code-bg', colors.codeBg);
  root.style.setProperty('--color-code-text', colors.codeText);

  if (theme.isDark) {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
  }

  // Persist current theme ID
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
    } catch (e) {
      console.warn('Failed to save theme in localStorage:', e);
    }
  }
}

/**
 * Retrieves the currently saved theme or defaults to 'dark'
 */
export function getSavedTheme(): ThemeConfig {
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(THEME_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ThemeConfig;
        if (parsed && parsed.id && parsed.colors) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse theme from localStorage:', e);
    }
  }
  return BUILTIN_THEMES.dark;
}

/**
 * Exports a theme as a downloadable JSON file
 */
export function exportThemeToFile(theme: ThemeConfig): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(theme, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `${theme.id}-theme.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Loads and validates a custom theme JSON file
 */
export async function loadThemeFromFile(file: File): Promise<ThemeConfig> {
  const text = await file.text();
  const parsed = JSON.parse(text) as Partial<ThemeConfig>;

  if (!parsed.id || !parsed.name || !parsed.colors) {
    throw new Error('Invalid theme file format: missing id, name, or colors');
  }

  const requiredColors = [
    'bgPrimary',
    'bgSecondary',
    'border',
    'textPrimary',
    'textSecondary',
    'accent',
  ];
  const colorMap = parsed.colors as unknown as Record<string, string>;
  for (const c of requiredColors) {
    if (!(c in colorMap)) {
      throw new Error(`Invalid theme file: missing color "${c}"`);
    }
  }

  const validTheme: ThemeConfig = {
    id: String(parsed.id),
    name: String(parsed.name),
    isDark: Boolean(parsed.isDark),
    colors: {
      bgPrimary: parsed.colors.bgPrimary || '#090d16',
      bgSecondary: parsed.colors.bgSecondary || '#0f172a',
      bgTertiary: parsed.colors.bgTertiary || '#1e293b',
      bgEditor: parsed.colors.bgEditor || '#090d16',
      border: parsed.colors.border || '#1e293b',
      textPrimary: parsed.colors.textPrimary || '#f8fafc',
      textSecondary: parsed.colors.textSecondary || '#94a3b8',
      textBold: parsed.colors.textBold || '#ffffff',
      accent: parsed.colors.accent || '#38bdf8',
      accentHover: parsed.colors.accentHover || '#0ea5e9',
      codeBg: parsed.colors.codeBg || '#050811',
      codeText: parsed.colors.codeText || '#7dd3fc',
    },
  };

  // Save to custom themes list
  try {
    const rawList = localStorage.getItem(CUSTOM_THEMES_STORAGE_KEY);
    const list: ThemeConfig[] = rawList ? JSON.parse(rawList) : [];
    const filtered = list.filter((t) => t.id !== validTheme.id);
    filtered.push(validTheme);
    localStorage.setItem(CUSTOM_THEMES_STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn('Failed to save custom theme in localStorage:', e);
  }

  return validTheme;
}
