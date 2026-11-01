import { useImperativeHandle, useRef, forwardRef, useMemo, useCallback } from 'react';
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { EditorView } from '@codemirror/view';
import { hoshinoteDarkTheme } from './theme';

export interface NoteEditorHandle {
  scrollToRatio: (ratio: number) => void;
  insertFormat: (prefix: string, suffix?: string, defaultText?: string) => void;
  focus: () => void;
}

export interface NoteEditorProps {
  value: string;
  onChange: (value: string) => void;
  onScroll?: (ratio: number) => void;
  placeholder?: string;
  className?: string;
}

export const NoteEditor = forwardRef<NoteEditorHandle, NoteEditorProps>(
  ({ value, onChange, onScroll, placeholder = 'Start writing markdown with [[wikilinks]] and $math$...', className = '' }, ref) => {
    const cmRef = useRef<ReactCodeMirrorRef>(null);
    const isProgrammaticScrollRef = useRef(false);

    const extensions = useMemo(() => {
      return [
        markdown({
          base: markdownLanguage,
          codeLanguages: languages,
          addKeymap: true,
        }),
        EditorView.lineWrapping,
        hoshinoteDarkTheme,
      ];
    }, []);

    // Scroll listener on CodeMirror scrollDOM
    const handleScroll = useCallback(() => {
      if (isProgrammaticScrollRef.current) {
        isProgrammaticScrollRef.current = false;
        return;
      }
      const view = cmRef.current?.view;
      if (!view || !onScroll) return;

      const scrollDOM = view.scrollDOM;
      const maxScroll = scrollDOM.scrollHeight - scrollDOM.clientHeight;
      if (maxScroll > 0) {
        const ratio = scrollDOM.scrollTop / maxScroll;
        onScroll(ratio);
      }
    }, [onScroll]);

    // Expose imperative handle methods
    useImperativeHandle(
      ref,
      () => ({
        scrollToRatio: (ratio: number) => {
          const view = cmRef.current?.view;
          if (!view) return;
          const scrollDOM = view.scrollDOM;
          const maxScroll = scrollDOM.scrollHeight - scrollDOM.clientHeight;
          if (maxScroll > 0) {
            isProgrammaticScrollRef.current = true;
            scrollDOM.scrollTop = ratio * maxScroll;
          }
        },
        insertFormat: (prefix: string, suffix: string = '', defaultText: string = '') => {
          const view = cmRef.current?.view;
          if (!view) return;

          const selection = view.state.selection.main;
          const selectedText = view.state.sliceDoc(selection.from, selection.to) || defaultText;
          const replacement = `${prefix}${selectedText}${suffix}`;

          view.dispatch({
            changes: {
              from: selection.from,
              to: selection.to,
              insert: replacement,
            },
            selection: {
              anchor: selection.from + prefix.length,
              head: selection.from + prefix.length + selectedText.length,
            },
          });
          view.focus();
        },
        focus: () => {
          cmRef.current?.view?.focus();
        },
      }),
      []
    );

    return (
      <div
        className={`h-full w-full overflow-hidden flex flex-col bg-[#090d16] ${className}`}
        onScrollCapture={handleScroll}
      >
        <CodeMirror
          ref={cmRef}
          value={value}
          onChange={onChange}
          extensions={extensions}
          placeholder={placeholder}
          theme="none"
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightSpecialChars: true,
            history: true,
            foldGutter: true,
            drawSelection: true,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            rectangularSelection: true,
            crosshairCursor: true,
            highlightActiveLine: true,
            highlightSelectionMatches: true,
            closeBracketsKeymap: true,
            searchKeymap: true,
            foldKeymap: true,
            completionKeymap: true,
            lintKeymap: true,
          }}
          className="h-full w-full text-slate-100"
        />
      </div>
    );
  }
);

NoteEditor.displayName = 'NoteEditor';
