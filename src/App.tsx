import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AppHeader } from './components/layout/AppHeader';
import { Sidebar } from './components/layout/Sidebar';
import { StatusBar } from './components/layout/StatusBar';
import { NoteEditor, NoteEditorHandle } from './components/editor/NoteEditor';
import { EditorToolbar, ViewMode } from './components/editor/EditorToolbar';
import { LiveViewEditor } from './components/editor/LiveViewEditor';
import { MarkdownPreview, MarkdownPreviewHandle } from './components/preview/MarkdownPreview';
import { BacklinksPanel } from './components/inspector/BacklinksPanel';
import { QuickSwitcherModal } from './components/search/QuickSwitcherModal';
import { UpdateModal } from './components/updater/UpdateModal';
import { useDebouncedAutosave } from './hooks/useDebouncedAutosave';
import * as api from './lib/api';
import type { NoteSummary, NoteWithDetails } from './types';
import type { ThemeConfig } from './types/theme';
import { getSavedTheme, applyTheme } from './lib/theme';
import { exportNoteToZip } from './lib/export';
import { FileEdit, BookOpen } from 'lucide-react';

export function App() {
  const [notes, setNotes] = useState<NoteSummary[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [activeNoteDetails, setActiveNoteDetails] = useState<NoteWithDetails | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [editorTitle, setEditorTitle] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [isQuickSwitcherOpen, setIsQuickSwitcherOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<ThemeConfig>(() => getSavedTheme());
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [appStatus, setAppStatus] = useState<string>('Initializing...');

  const editorRef = useRef<NoteEditorHandle>(null);
  const previewRef = useRef<MarkdownPreviewHandle>(null);
  const isSyncScrollingRef = useRef<'editor' | 'preview' | null>(null);

  const selectedNoteIdRef = useRef(selectedNoteId);
  selectedNoteIdRef.current = selectedNoteId;

  const editorContentRef = useRef(editorContent);
  editorContentRef.current = editorContent;

  const editorTitleRef = useRef(editorTitle);
  editorTitleRef.current = editorTitle;

  // Apply theme on mount and whenever changed
  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);

  // Load notes list
  const loadNotesList = useCallback(async () => {
    try {
      const list = await api.listNotes({ is_archived: false });
      setNotes(list);
      return list;
    } catch (err) {
      console.error('Failed to load notes list:', err);
      return [];
    }
  }, []);

  // Autosave hook (350ms debounce)
  const {
    status: saveStatus,
    triggerSave,
    flush: flushAutosave,
  } = useDebouncedAutosave<{ id: string; content?: string; title?: string }>({
    delay: 350,
    onSave: async (data) => {
      if (!data.id) return;
      const updated = await api.updateNote(data.id, {
        content: data.content,
        title: data.title,
      });
      // Only update activeNoteDetails if the saved note is still the active note
      if (selectedNoteIdRef.current === data.id) {
        setActiveNoteDetails(updated);
      }
      await loadNotesList();
    },
  });

  // Initial mount: load app status and notes
  useEffect(() => {
    let mounted = true;
    api.getAppStatus().then((status) => {
      if (mounted) setAppStatus(status);
    });

    loadNotesList().then((list) => {
      if (mounted && list.length > 0 && !selectedNoteId) {
        setSelectedNoteId(list[0].id);
      }
    });

    return () => {
      mounted = false;
    };
  }, [loadNotesList, selectedNoteId]);

  // Load active note details when selectedNoteId changes
  useEffect(() => {
    if (!selectedNoteId) {
      setActiveNoteDetails(null);
      setEditorContent('');
      setEditorTitle('');
      return;
    }

    let isCancelled = false;
    api
      .getNote(selectedNoteId)
      .then((details) => {
        if (!isCancelled) {
          setActiveNoteDetails(details);
          setEditorContent(details.note.content);
          setEditorTitle(details.note.title);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch note details:', err);
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedNoteId]);

  // Handle Note switching with immediate flush of pending changes
  const handleSelectNote = useCallback(
    async (newNoteId: string) => {
      if (newNoteId === selectedNoteId) return;
      await flushAutosave();
      setSelectedNoteId(newNoteId);
    },
    [selectedNoteId, flushAutosave]
  );

  // Content change handler
  const handleContentChange = useCallback(
    (newContent: string) => {
      setEditorContent(newContent);
      editorContentRef.current = newContent;
      if (selectedNoteId) {
        triggerSave({
          id: selectedNoteId,
          content: newContent,
          title: editorTitleRef.current,
        });
      }
    },
    [selectedNoteId, triggerSave]
  );

  // Title change handler
  const handleTitleChange = useCallback(
    (newTitle: string) => {
      setEditorTitle(newTitle);
      editorTitleRef.current = newTitle;
      if (selectedNoteId) {
        triggerSave({
          id: selectedNoteId,
          title: newTitle,
          content: editorContentRef.current,
        });
      }
    },
    [selectedNoteId, triggerSave]
  );

  // Create new note
  const handleCreateNote = useCallback(
    async (customTitle?: string) => {
      await flushAutosave();
      try {
        const title = customTitle || `Untitled ${new Date().toLocaleDateString()}`;
        const newNote = await api.createNote({
          title,
          content: `# ${title}\n\nStart writing with [[wikilinks]] and $math$...`,
        });
        await loadNotesList();
        setSelectedNoteId(newNote.note.id);
      } catch (err) {
        console.error('Failed to create note:', err);
      }
    },
    [flushAutosave, loadNotesList]
  );

  // Delete note
  const handleDeleteNote = useCallback(
    async (noteId: string) => {
      try {
        await api.deleteNote(noteId);
        const remaining = await loadNotesList();
        if (selectedNoteId === noteId) {
          setSelectedNoteId(remaining.length > 0 ? remaining[0].id : null);
        }
      } catch (err) {
        console.error('Failed to delete note:', err);
      }
    },
    [loadNotesList, selectedNoteId]
  );

  // Navigate to wikilink (resolve or prompt create)
  const handleNavigateWikilink = useCallback(
    async (targetTitle: string) => {
      await flushAutosave();
      try {
        const found = await api.getNoteByTitle(targetTitle);
        if (found) {
          setSelectedNoteId(found.note.id);
        } else {
          await handleCreateNote(targetTitle);
        }
      } catch (err) {
        console.error('Failed to navigate wikilink:', err);
      }
    },
    [flushAutosave, handleCreateNote]
  );

  // Toggle Pinned
  const handleTogglePin = useCallback(
    async (isPinned: boolean) => {
      if (!selectedNoteId) return;
      try {
        const updated = await api.updateNote(selectedNoteId, { is_pinned: isPinned });
        setActiveNoteDetails(updated);
        await loadNotesList();
      } catch (err) {
        console.error('Failed to toggle pin:', err);
      }
    },
    [selectedNoteId, loadNotesList]
  );

  // Toggle Archived
  const handleToggleArchive = useCallback(
    async (isArchived: boolean) => {
      if (!selectedNoteId) return;
      try {
        const updated = await api.updateNote(selectedNoteId, { is_archived: isArchived });
        setActiveNoteDetails(updated);
        const list = await loadNotesList();
        if (isArchived) {
          const next = list.find((n) => n.id !== selectedNoteId);
          setSelectedNoteId(next ? next.id : null);
        }
      } catch (err) {
        console.error('Failed to toggle archive:', err);
      }
    },
    [selectedNoteId, loadNotesList]
  );

  // Synchronized scrolling handlers
  const handleEditorScroll = useCallback((ratio: number) => {
    if (isSyncScrollingRef.current === 'preview') return;
    isSyncScrollingRef.current = 'editor';
    previewRef.current?.scrollToRatio(ratio);
    requestAnimationFrame(() => {
      isSyncScrollingRef.current = null;
    });
  }, []);

  const handlePreviewScroll = useCallback((ratio: number) => {
    if (isSyncScrollingRef.current === 'editor') return;
    isSyncScrollingRef.current = 'preview';
    editorRef.current?.scrollToRatio(ratio);
    requestAnimationFrame(() => {
      isSyncScrollingRef.current = null;
    });
  }, []);

  // Format insertion in editor
  const handleInsertFormat = useCallback((prefix: string, suffix?: string, defaultText?: string) => {
    editorRef.current?.insertFormat(prefix, suffix, defaultText);
  }, []);

  // Image upload handler
  const handleUploadImage = useCallback(async (file: File) => {
    if (editorRef.current) {
      await editorRef.current.insertImage(file);
    }
  }, []);

  // Export note to ZIP
  const handleExportZip = useCallback(async () => {
    if (!activeNoteDetails) return;
    await flushAutosave();
    try {
      await exportNoteToZip(activeNoteDetails);
    } catch (err) {
      console.error('Failed to export note as ZIP:', err);
    }
  }, [activeNoteDetails, flushAutosave]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;

      if (isCmdOrCtrl && (e.key === 'p' || e.key === 'P' || e.key === 'o' || e.key === 'O' || e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsQuickSwitcherOpen((prev) => !prev);
      } else if (isCmdOrCtrl && (e.key === 'e' || e.key === 'E')) {
        e.preventDefault();
        setViewMode((prev) => (prev === 'split' ? 'liveview' : prev === 'liveview' ? 'preview' : prev === 'preview' ? 'editor' : 'split'));
      } else if (isCmdOrCtrl && (e.key === 'b' || e.key === 'B') && !e.shiftKey) {
        e.preventDefault();
        setIsSidebarOpen((prev) => !prev);
      } else if (isCmdOrCtrl && e.shiftKey && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        setIsInspectorOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // All existing note titles for wikilink resolution styling
  const existingNoteTitles = useMemo(() => notes.map((n) => n.title), [notes]);

  const wordCount = editorContent.trim() ? editorContent.trim().split(/\s+/).length : 0;
  const charCount = editorContent.length;

  return (
    <div
      className="flex flex-col h-screen w-screen overflow-hidden font-sans transition-colors duration-150"
      style={{
        backgroundColor: currentTheme.colors.bgPrimary,
        color: currentTheme.colors.textPrimary,
      }}
    >
      {/* Top Header */}
      <AppHeader
        onNewNote={() => handleCreateNote()}
        onOpenQuickSwitcher={() => setIsQuickSwitcherOpen(true)}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        isInspectorOpen={isInspectorOpen}
        onToggleInspector={() => setIsInspectorOpen((prev) => !prev)}
        onCheckUpdates={() => setIsUpdateModalOpen(true)}
        currentTheme={currentTheme}
        onSelectTheme={setCurrentTheme}
      />

      {/* Main Center Area: Sidebar + Workspace + Inspector */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Sidebar (Collapsible) */}
        {isSidebarOpen && (
          <Sidebar
            notes={notes}
            selectedNoteId={selectedNoteId}
            onSelectNote={handleSelectNote}
            onDeleteNote={handleDeleteNote}
            onNewNote={() => handleCreateNote()}
            selectedTag={selectedTag}
            onSelectTag={setSelectedTag}
            theme={currentTheme}
          />
        )}

        {/* Center Workspace Area */}
        <main
          className="flex-1 flex flex-col min-w-0 overflow-hidden"
          style={{ backgroundColor: currentTheme.colors.bgPrimary }}
        >
          {activeNoteDetails ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Note Editor Header Bar */}
              <div
                className="h-9 px-4 border-b flex items-center justify-between shrink-0"
                style={{
                  backgroundColor: currentTheme.colors.bgSecondary,
                  borderColor: currentTheme.colors.border,
                }}
              >
                <div className="flex items-center space-x-2 flex-1 min-w-0 mr-4">
                  <FileEdit className="w-4 h-4 shrink-0" style={{ color: currentTheme.colors.accent }} />
                  <input
                    type="text"
                    value={editorTitle}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Note Title..."
                    aria-label="Note title"
                    className="bg-transparent border-none text-sm font-bold focus:outline-none focus:ring-1 rounded px-1.5 py-0.5 truncate flex-1"
                    style={{
                      color: currentTheme.colors.textBold,
                    }}
                  />
                </div>
                <div
                  className="text-[11px] font-mono shrink-0 opacity-70"
                  style={{ color: currentTheme.colors.textSecondary }}
                >
                  {activeNoteDetails.note.path}
                </div>
              </div>

              {/* Editor Toolbar with image upload and zip export */}
              <EditorToolbar
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                onInsertFormat={handleInsertFormat}
                onUploadImage={handleUploadImage}
                onExportZip={handleExportZip}
                theme={currentTheme}
              />

              {/* Split / Single View Workspace */}
              <div className="flex-1 flex min-h-0 overflow-hidden">
                {/* Single-Pane Word-like LiveView */}
                {viewMode === 'liveview' && (
                  <LiveViewEditor
                    content={editorContent}
                    onChange={handleContentChange}
                    existingTitles={existingNoteTitles}
                    onNavigateWikilink={handleNavigateWikilink}
                    theme={currentTheme}
                  />
                )}

                {/* CodeMirror 6 Editor Pane */}
                {(viewMode === 'split' || viewMode === 'editor') && (
                  <div
                    className={`h-full overflow-hidden flex flex-col ${
                      viewMode === 'split' ? 'w-1/2 border-r' : 'w-full'
                    }`}
                    style={{ borderColor: currentTheme.colors.border }}
                  >
                    <NoteEditor
                      ref={editorRef}
                      value={editorContent}
                      onChange={handleContentChange}
                      onScroll={handleEditorScroll}
                      theme={currentTheme}
                    />
                  </div>
                )}

                {/* Markdown + MathJax Vector SVG Preview Pane */}
                {(viewMode === 'split' || viewMode === 'preview') && (
                  <div
                    className={`h-full overflow-hidden flex flex-col ${
                      viewMode === 'split' ? 'w-1/2' : 'w-full'
                    }`}
                    style={{
                      backgroundColor: currentTheme.isDark
                        ? 'rgba(11, 17, 32, 0.4)'
                        : currentTheme.colors.bgEditor,
                    }}
                  >
                    <MarkdownPreview
                      ref={previewRef}
                      content={editorContent}
                      existingTitles={existingNoteTitles}
                      onNavigateWikilink={handleNavigateWikilink}
                      onScroll={handlePreviewScroll}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div
              className="flex-1 flex flex-col items-center justify-center p-8 text-center"
              style={{ color: currentTheme.colors.textSecondary }}
            >
              <BookOpen className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm font-medium mb-2">No note selected</p>
              <button
                onClick={() => handleCreateNote()}
                className="px-3 py-1.5 rounded-md text-xs font-medium transition hover:opacity-90 shadow-xs"
                style={{
                  backgroundColor: currentTheme.colors.accent,
                  color: currentTheme.isDark ? '#000000' : '#ffffff',
                }}
              >
                Create New Note
              </button>
            </div>
          )}
        </main>

        {/* Right Inspector Panel (Collapsible) */}
        {isInspectorOpen && (
          <BacklinksPanel
            noteDetails={activeNoteDetails}
            onNavigateToNote={handleNavigateWikilink}
            onCreateNoteFromLink={handleCreateNote}
            onTogglePin={handleTogglePin}
            onToggleArchive={handleToggleArchive}
            onExportZip={handleExportZip}
            theme={currentTheme}
          />
        )}
      </div>

      {/* Bottom Status Bar */}
      <StatusBar
        appStatus={appStatus}
        saveStatus={saveStatus}
        notesCount={notes.length}
        wordCount={wordCount}
        charCount={charCount}
        currentNoteTitle={editorTitle}
        isEncrypted={true}
        theme={currentTheme}
      />

      {/* Quick Switcher Modal (Ctrl+P / Ctrl+O) */}
      <QuickSwitcherModal
        isOpen={isQuickSwitcherOpen}
        onClose={() => setIsQuickSwitcherOpen(false)}
        onSelectNote={handleSelectNote}
        onCreateNote={handleCreateNote}
      />

      {/* GitHub Auto-Updater Modal */}
      <UpdateModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        currentVersion="0.2.0"
      />
    </div>
  );
}

export default App;
