export interface ThemeColors {
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  bgEditor: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textBold: string;
  accent: string;
  accentHover: string;
  codeBg: string;
  codeText: string;
}

export type BuiltinThemeId = 'dark' | 'light' | 'cute';

export interface ThemeConfig {
  id: string;
  name: string;
  isDark: boolean;
  colors: ThemeColors;
}
