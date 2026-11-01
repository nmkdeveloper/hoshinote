import { EditorView } from '@codemirror/view';
import { Extension } from '@codemirror/state';

export const hoshinoteDarkTheme: Extension = EditorView.theme(
  {
    '&': {
      color: '#f1f5f9',
      backgroundColor: '#090d16',
      height: '100%',
      fontSize: '13.5px',
      fontFamily:
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "JetBrains Mono", monospace',
    },
    '.cm-content': {
      caretColor: '#38bdf8',
      lineHeight: '1.7',
      padding: '16px 20px',
    },
    '&.cm-focused .cm-cursor': {
      borderLeftColor: '#38bdf8',
      borderLeftWidth: '2px',
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: '#0284c740 !important',
    },
    '.cm-panels': {
      backgroundColor: '#0b1120',
      color: '#94a3b8',
    },
    '.cm-panels.cm-panels-top': {
      borderBottom: '1px solid #1e293b',
    },
    '.cm-panels.cm-panels-bottom': {
      borderTop: '1px solid #1e293b',
    },
    '.cm-searchMatch': {
      backgroundColor: '#0284c760',
      outline: '1px solid #38bdf8',
    },
    '.cm-searchMatch.cm-searchMatch-selected': {
      backgroundColor: '#0284c7a0',
    },
    '.cm-activeLine': {
      backgroundColor: '#0f172a70',
    },
    '.cm-selectionMatch': {
      backgroundColor: '#0369a140',
    },
    '&.cm-focused': {
      outline: 'none',
    },
    '.cm-gutters': {
      backgroundColor: '#090d16',
      color: '#475569',
      borderRight: '1px solid #1e293b80',
      paddingRight: '6px',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'transparent',
      color: '#38bdf8',
      fontWeight: '600',
    },
    '.cm-foldPlaceholder': {
      backgroundColor: '#1e293b',
      border: 'none',
      color: '#94a3b8',
    },
    '.cm-tooltip': {
      border: '1px solid #1e293b',
      backgroundColor: '#0b1120',
      color: '#f1f5f9',
    },
  },
  { dark: true }
);
