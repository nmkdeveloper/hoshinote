import { EditorView } from '@codemirror/view';
import { Extension } from '@codemirror/state';
import type { ThemeConfig } from '../../types/theme';

export function createEditorTheme(theme?: ThemeConfig): Extension {
  const isDark = theme ? theme.isDark : true;
  const colors = theme?.colors || {
    bgEditor: '#090d16',
    border: '#1e293b',
    textPrimary: '#f1f5f9',
    textSecondary: '#94a3b8',
    textBold: '#ffffff',
    accent: '#38bdf8',
    accentHover: '#0ea5e9',
    codeBg: '#050811',
    codeText: '#7dd3fc',
  };

  return EditorView.theme(
    {
      '&': {
        color: colors.textPrimary,
        backgroundColor: colors.bgEditor,
        height: '100%',
        fontSize: '13.5px',
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "JetBrains Mono", monospace',
      },
      '.cm-content': {
        caretColor: colors.accent,
        lineHeight: '1.75',
        padding: '16px 20px',
      },
      '&.cm-focused .cm-cursor': {
        borderLeftColor: colors.accent,
        borderLeftWidth: '2px',
      },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
        backgroundColor: `${colors.accent}33 !important`,
      },
      '.cm-panels': {
        backgroundColor: colors.bgEditor,
        color: colors.textSecondary,
      },
      '.cm-panels.cm-panels-top': {
        borderBottom: `1px solid ${colors.border}`,
      },
      '.cm-panels.cm-panels-bottom': {
        borderTop: `1px solid ${colors.border}`,
      },
      '.cm-searchMatch': {
        backgroundColor: `${colors.accent}4d`,
        outline: `1px solid ${colors.accent}`,
      },
      '.cm-searchMatch.cm-searchMatch-selected': {
        backgroundColor: `${colors.accent}80`,
      },
      '.cm-activeLine': {
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)',
      },
      '.cm-selectionMatch': {
        backgroundColor: `${colors.accent}26`,
      },
      '&.cm-focused': {
        outline: 'none',
      },
      '.cm-gutters': {
        backgroundColor: colors.bgEditor,
        color: colors.textSecondary,
        borderRight: `1px solid ${colors.border}`,
        paddingRight: '6px',
      },
      '.cm-activeLineGutter': {
        backgroundColor: 'transparent',
        color: colors.accent,
        fontWeight: '600',
      },
      '.cm-foldPlaceholder': {
        backgroundColor: colors.border,
        border: 'none',
        color: colors.textSecondary,
      },
      '.cm-tooltip': {
        border: `1px solid ${colors.border}`,
        backgroundColor: colors.bgEditor,
        color: colors.textPrimary,
      },
      // Heading styling inside CodeMirror
      '.cm-header-1, .cm-formatting-header-1': {
        fontSize: '1.4em',
        fontWeight: '700',
        color: `${colors.accent} !important`,
      },
      '.cm-header-2, .cm-formatting-header-2': {
        fontSize: '1.22em',
        fontWeight: '700',
        color: `${colors.accent} !important`,
      },
      '.cm-header-3, .cm-formatting-header-3': {
        fontSize: '1.1em',
        fontWeight: '600',
        color: `${colors.textBold} !important`,
      },
      // Bold syntax inside CodeMirror
      '.cm-strong, .cm-formatting-strong': {
        fontWeight: '750 !important',
        color: `${colors.textBold} !important`,
      },
      '.cm-link, .cm-url': {
        color: colors.accent,
        textDecoration: 'underline',
      },
    },
    { dark: isDark }
  );
}

export const hoshinoteDarkTheme: Extension = createEditorTheme();
