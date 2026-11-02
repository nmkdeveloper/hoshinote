import type { ThemeConfig, BuiltinThemeId } from '../types/theme';

export const BUILTIN_THEMES: Record<BuiltinThemeId, ThemeConfig> = {
  dark: {
    id: 'dark',
    name: 'Monochrome Dark (Dark)',
    isDark: true,
    colors: {
      bgPrimary: '#0a0a0a',
      bgSecondary: '#121212',
      bgTertiary: '#1f1f1f',
      bgEditor: '#0a0a0a',
      border: '#2e2e2e',
      textPrimary: '#ffffff',
      textSecondary: '#888888',
      textBold: '#ffffff',
      accent: '#e5e5e5',
      accentHover: '#ffffff',
      codeBg: '#171717',
      codeText: '#cccccc',
    },
  },
  light: {
    id: 'light',
    name: 'Monochrome Light (Light)',
    isDark: false,
    colors: {
      bgPrimary: '#ffffff',
      bgSecondary: '#f8f8f8',
      bgTertiary: '#f0f0f0',
      bgEditor: '#ffffff',
      border: '#d0d0d0',
      textPrimary: '#000000',
      textSecondary: '#666666',
      textBold: '#000000',
      accent: '#171717',
      accentHover: '#000000',
      codeBg: '#f0f0f0',
      codeText: '#222222',
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
      bgPrimary: parsed.colors.bgPrimary || '#0a0a0a',
      bgSecondary: parsed.colors.bgSecondary || '#121212',
      bgTertiary: parsed.colors.bgTertiary || '#1f1f1f',
      bgEditor: parsed.colors.bgEditor || '#0a0a0a',
      border: parsed.colors.border || '#2e2e2e',
      textPrimary: parsed.colors.textPrimary || '#ffffff',
      textSecondary: parsed.colors.textSecondary || '#888888',
      textBold: parsed.colors.textBold || '#ffffff',
      accent: parsed.colors.accent || '#e5e5e5',
      accentHover: parsed.colors.accentHover || '#ffffff',
      codeBg: parsed.colors.codeBg || '#171717',
      codeText: parsed.colors.codeText || '#cccccc',
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

/**
 * Retrieves list of user-imported custom themes from localStorage
 */
export function getCustomThemes(): ThemeConfig[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const rawList = localStorage.getItem(CUSTOM_THEMES_STORAGE_KEY);
    return rawList ? JSON.parse(rawList) : [];
  } catch {
    return [];
  }
}
