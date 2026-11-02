import { useImperativeHandle, useRef, forwardRef, useMemo, useCallback } from 'react';
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { EditorView } from '@codemirror/view';
import { createEditorTheme } from './theme';
import type { ThemeConfig } from '../../types/theme';

export interface NoteEditorHandle {
  scrollToRatio: (ratio: number) => void;
  insertFormat: (prefix: string, suffix?: string, defaultText?: string) => void;
  insertImage: (file: File) => Promise<void>;
  insertText: (text: string) => void;
  focus: () => void;
}

export interface NoteEditorProps {
  value: string;
  onChange: (value: string) => void;
  onScroll?: (ratio: number) => void;
  placeholder?: string;
  className?: string;
  theme?: ThemeConfig;
}

export const NoteEditor = forwardRef<NoteEditorHandle, NoteEditorProps>(
  (
    {
      value,
      onChange,
      onScroll,
      placeholder = 'Start writing markdown with [[wikilinks]] and $math$...',
      className = '',
      theme,
    },
    ref
  ) => {
    const cmRef = useRef<ReactCodeMirrorRef>(null);
    const isProgrammaticScrollRef = useRef(false);

    const editorThemeExtension = useMemo(() => {
      return createEditorTheme(theme);
    }, [theme]);

    const extensions = useMemo(() => {
      return [
        markdown({
          base: markdownLanguage,
          codeLanguages: languages,
          addKeymap: true,
        }),
        EditorView.lineWrapping,
        editorThemeExtension,
      ];
    }, [editorThemeExtension]);

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

    // Insert text at current cursor
    const handleInsertText = useCallback((textToInsert: string) => {
      const view = cmRef.current?.view;
      if (!view) return;

      const selection = view.state.selection.main;
      view.dispatch({
        changes: {
          from: selection.from,
          to: selection.to,
          insert: textToInsert,
        },
        selection: {
          anchor: selection.from + textToInsert.length,
          head: selection.from + textToInsert.length,
        },
      });
      view.focus();
    }, []);

    // Insert image as markdown
    const handleInsertImage = useCallback(
      async (file: File) => {
        return new Promise<void>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            if (dataUrl) {
              const cleanName = file.name.replace(/[[\]]/g, '');
              const markdownImg = `\n![${cleanName}](${dataUrl})\n`;
              handleInsertText(markdownImg);
              resolve();
            } else {
              reject(new Error('Failed to read image data'));
            }
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });
      },
      [handleInsertText]
    );

    // Paste handler for clipboard images
    const handlePaste = useCallback(
      (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) {
              e.preventDefault();
              handleInsertImage(file).catch((err) => {
                console.error('Failed to paste image:', err);
              });
              break;
            }
          }
        }
      },
      [handleInsertImage]
    );

    // Drop handler for dragging images into the editor
    const handleDrop = useCallback(
      (e: React.DragEvent) => {
        const files = e.dataTransfer?.files;
        if (!files || files.length === 0) return;

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (file.type.startsWith('image/')) {
            e.preventDefault();
            handleInsertImage(file).catch((err) => {
              console.error('Failed to drop image:', err);
            });
            break;
          }
        }
      },
      [handleInsertImage]
    );

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
        insertImage: handleInsertImage,
        insertText: handleInsertText,
        focus: () => {
          cmRef.current?.view?.focus();
        },
      }),
      [handleInsertImage, handleInsertText]
    );

    return (
      <div
        className={`h-full w-full overflow-hidden flex flex-col ${className}`}
        style={{ backgroundColor: theme?.colors.bgEditor || 'var(--color-bg-editor)' }}
        onScrollCapture={handleScroll}
        onPaste={handlePaste}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
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
          className="h-full w-full"
        />
      </div>
    );
  }
);

NoteEditor.displayName = 'NoteEditor';
