import { EditorView } from '@codemirror/view';
import { Extension } from '@codemirror/state';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import type { ThemeConfig } from '../../types/theme';

export function createEditorTheme(theme?: ThemeConfig): Extension {
  const isDark = theme ? theme.isDark : true;
  const colors = theme?.colors || {
    bgEditor: '#0a0a0a',
    border: '#2e2e2e',
    textPrimary: '#ffffff',
    textSecondary: '#888888',
    textBold: '#ffffff',
    accent: '#e5e5e5',
    accentHover: '#ffffff',
    codeBg: '#171717',
    codeText: '#cccccc',
  };

  const themeView = EditorView.theme(
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
    },
    { dark: isDark }
  );

  const themeHighlight = syntaxHighlighting(
    HighlightStyle.define([
      { tag: tags.heading1, fontSize: '1.65em', fontWeight: '750', color: colors.accent },
      { tag: tags.heading2, fontSize: '1.38em', fontWeight: '700', color: colors.accent },
      { tag: tags.heading3, fontSize: '1.2em', fontWeight: '650', color: colors.textBold },
      { tag: tags.heading4, fontSize: '1.08em', fontWeight: '600', color: colors.textBold },
      { tag: tags.heading5, fontSize: '0.98em', fontWeight: '600', color: colors.textBold },
      { tag: tags.heading6, fontSize: '0.9em', fontWeight: '600', color: colors.textSecondary },
      { tag: tags.strong, fontWeight: '750', color: colors.textBold },
      { tag: tags.emphasis, fontStyle: 'italic' },
      { tag: tags.keyword, color: colors.accent },
      { tag: tags.string, color: colors.codeText },
      { tag: tags.number, color: colors.codeText },
      { tag: tags.comment, color: colors.textSecondary, fontStyle: 'italic' },
      { tag: tags.link, color: colors.accent, textDecoration: 'underline' },
      { tag: tags.url, color: colors.accent },
      { tag: tags.monospace, color: colors.codeText, backgroundColor: colors.codeBg },
    ])
  );

  return [themeView, themeHighlight];
}

export const hoshinoteDarkTheme: Extension = createEditorTheme();
