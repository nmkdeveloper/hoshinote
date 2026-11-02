import React, { useState, useMemo } from 'react';
import {
  FileText,
  Tag,
  Pin,
  Calendar,
  Hash,
  Search,
  Plus,
  Trash2,
  FolderOpen,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import type { NoteSummary } from '../../types';
import type { ThemeConfig } from '../../types/theme';

export interface SidebarProps {
  notes: NoteSummary[];
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  onDeleteNote?: (id: string) => void;
  onNewNote?: () => void;
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  theme?: ThemeConfig;
}

export const Sidebar: React.FC<SidebarProps> = ({
  notes,
  selectedNoteId,
  onSelectNote,
  onDeleteNote,
  onNewNote,
  selectedTag,
  onSelectTag,
  theme,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [isTagsOpen, setIsTagsOpen] = useState(true);
  const [isPinnedOpen, setIsPinnedOpen] = useState(true);
  const [isNotesOpen, setIsNotesOpen] = useState(true);

  // Aggregate tags
  const tagsMap = useMemo(() => {
    const map = new Map<string, number>();
    notes.forEach((n) => {
      n.tags.forEach((t) => {
        map.set(t, (map.get(t) || 0) + 1);
      });
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [notes]);

  // Filter notes by tag and local filter query
  const filteredNotes = useMemo(() => {
    let result = notes;
    if (selectedTag) {
      result = result.filter((n) => n.tags.includes(selectedTag));
    }
    if (filterQuery.trim()) {
      const q = filterQuery.trim().toLowerCase();
      result = result.filter(
        (n) => n.title.toLowerCase().includes(q) || n.snippet.toLowerCase().includes(q)
      );
    }
    return result;
  }, [notes, selectedTag, filterQuery]);

  // Separate pinned and unpinned notes
  const pinnedNotes = useMemo(() => filteredNotes.filter((n) => n.is_pinned), [filteredNotes]);
  const otherNotes = useMemo(() => filteredNotes.filter((n) => !n.is_pinned), [filteredNotes]);

  return (
    <aside
      className="w-64 border-r flex flex-col h-full select-none shrink-0 transition-colors duration-150"
      style={{
        backgroundColor: theme?.colors.bgSecondary || 'var(--color-bg-secondary)',
        borderColor: theme?.colors.border || 'var(--color-border)',
        color: theme?.colors.textPrimary || 'var(--color-text-primary)',
      }}
    >
      {/* Vault Header */}
      <div
        className="p-3 border-b flex items-center justify-between"
        style={{ borderColor: theme?.colors.border || 'var(--color-border)' }}
      >
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4" style={{ color: theme?.colors.accent || 'var(--color-accent)' }} />
          <span className="text-xs font-semibold tracking-wide" style={{ color: theme?.colors.textBold || 'var(--color-text-bold)' }}>
            Hoshinote Vault
          </span>
        </div>
        {onNewNote && (
          <button
            onClick={onNewNote}
            title="Create new note"
            className="p-1 rounded transition hover:opacity-80"
            style={{ color: theme?.colors.textSecondary || 'var(--color-text-secondary)' }}
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Local Filter Bar */}
      <div
        className="px-3 py-2 border-b"
        style={{ borderColor: theme?.colors.border || 'var(--color-border)' }}
      >
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: theme?.colors.textSecondary || 'var(--color-text-secondary)' }} />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter notes..."
            aria-label="Filter notes list"
            className="w-full border text-[11px] rounded pl-8 pr-2 py-1 focus:outline-none transition"
            style={{
              backgroundColor: theme?.colors.bgPrimary || 'var(--color-bg-primary)',
              borderColor: theme?.colors.border || 'var(--color-border)',
              color: theme?.colors.textPrimary || 'var(--color-text-primary)',
            }}
          />
        </div>
      </div>

      {/* Tags Filter Chips (Collapsible) */}
      {tagsMap.length > 0 && (
        <div
          className="p-2 border-b"
          style={{ borderColor: theme?.colors.border || 'var(--color-border)' }}
        >
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider mb-1">
            <button
              onClick={() => setIsTagsOpen((prev) => !prev)}
              className="flex items-center gap-1 transition hover:opacity-80"
              style={{ color: theme?.colors.textSecondary || 'var(--color-text-secondary)' }}
              title="Toggle tags filter"
            >
              {isTagsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              <Tag className="w-3 h-3" style={{ color: theme?.colors.accent || 'var(--color-accent)' }} />
              <span>Tags ({tagsMap.length})</span>
            </button>
            {selectedTag && (
              <button
                onClick={() => onSelectTag(null)}
                className="text-[10px] hover:underline lowercase font-normal"
                style={{ color: theme?.colors.accent || 'var(--color-accent)' }}
              >
                clear
              </button>
            )}
          </div>
          {isTagsOpen && (
            <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto pt-1">
              {tagsMap.map(([tag, count]) => {
                const isSelected = selectedTag === tag;
                return (
                  <button
                    key={tag}
                    onClick={() => onSelectTag(isSelected ? null : tag)}
                    className="flex items-center space-x-1 text-[10px] px-2 py-0.5 rounded-full transition border"
                    style={{
                      backgroundColor: isSelected
                        ? theme?.colors.accent || 'var(--color-accent)'
                        : theme?.colors.bgTertiary || 'var(--color-bg-tertiary)',
                      borderColor: theme?.colors.border || 'var(--color-border)',
                      color: isSelected
                        ? (theme?.isDark ? '#000000' : '#ffffff')
                        : theme?.colors.textPrimary || 'var(--color-text-primary)',
                    }}
                  >
                    <Hash className="w-2.5 h-2.5" />
                    <span>{tag}</span>
                    <span className="text-[9px] opacity-75">{count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Notes List Section */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {/* Pinned section (Collapsible) */}
        {pinnedNotes.length > 0 && (
          <div className="mb-2">
            <button
              onClick={() => setIsPinnedOpen((prev) => !prev)}
              className="w-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wider flex items-center justify-between rounded transition hover:opacity-80"
              style={{ color: theme?.colors.accent || 'var(--color-accent)' }}
            >
              <div className="flex items-center gap-1">
                {isPinnedOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                <Pin className="w-3 h-3" />
                <span>Pinned ({pinnedNotes.length})</span>
              </div>
            </button>
            {isPinnedOpen && (
              <div className="space-y-1 mt-1">
                {pinnedNotes.map((note) => (
                  <NoteListItem
                    key={note.id}
                    note={note}
                    isSelected={note.id === selectedNoteId}
                    onSelect={() => onSelectNote(note.id)}
                    onDelete={onDeleteNote ? () => onDeleteNote(note.id) : undefined}
                    theme={theme}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Other / All notes section (Collapsible) */}
        <div>
          {pinnedNotes.length > 0 && (
            <button
              onClick={() => setIsNotesOpen((prev) => !prev)}
              className="w-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wider flex items-center justify-between rounded transition hover:opacity-80"
              style={{ color: theme?.colors.textSecondary || 'var(--color-text-secondary)' }}
            >
              <div className="flex items-center gap-1">
                {isNotesOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                <FileText className="w-3 h-3" style={{ color: theme?.colors.accent || 'var(--color-accent)' }} />
                <span>Notes ({otherNotes.length})</span>
              </div>
            </button>
          )}

          {isNotesOpen && (
            filteredNotes.length === 0 ? (
              <div
                className="text-center py-8 text-xs italic"
                style={{ color: theme?.colors.textSecondary || 'var(--color-text-secondary)' }}
              >
                No notes match your filter.
              </div>
            ) : (
              <div className="space-y-1 mt-1">
                {otherNotes.map((note) => (
                  <NoteListItem
                    key={note.id}
                    note={note}
                    isSelected={note.id === selectedNoteId}
                    onSelect={() => onSelectNote(note.id)}
                    onDelete={onDeleteNote ? () => onDeleteNote(note.id) : undefined}
                    theme={theme}
                  />
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </aside>
  );
};

interface NoteListItemProps {
  note: NoteSummary;
  isSelected: boolean;
  onSelect: () => void;
  onDelete?: () => void;
  theme?: ThemeConfig;
}

const NoteListItem: React.FC<NoteListItemProps> = ({ note, isSelected, onSelect, onDelete, theme }) => {
  return (
    <div
      onClick={onSelect}
      className="w-full text-left p-2 rounded-lg transition group cursor-pointer flex flex-col gap-0.5 relative border"
      style={{
        backgroundColor: isSelected
          ? theme?.colors.bgTertiary || 'var(--color-bg-tertiary)'
          : 'transparent',
        borderColor: isSelected
          ? theme?.colors.accent || 'var(--color-accent)'
          : 'transparent',
        color: isSelected
          ? theme?.colors.textBold || 'var(--color-text-bold)'
          : theme?.colors.textPrimary || 'var(--color-text-primary)',
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium truncate flex-1 pr-1">{note.title}</span>
        <div className="flex items-center gap-1 shrink-0">
          {note.is_pinned && <Pin className="w-3 h-3" style={{ color: theme?.colors.accent || 'var(--color-accent)' }} />}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="Delete note"
              className="opacity-0 group-hover:opacity-100 p-0.5 transition hover:opacity-80"
              style={{ color: theme?.colors.textSecondary || 'var(--color-text-secondary)' }}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <p
        className="text-[11px] truncate opacity-75"
        style={{ color: theme?.colors.textSecondary || 'var(--color-text-secondary)' }}
      >
        {note.snippet || 'Empty note'}
      </p>

      <div
        className="flex items-center gap-2 mt-0.5 text-[9px] opacity-70"
        style={{ color: theme?.colors.textSecondary || 'var(--color-text-secondary)' }}
      >
        <span className="flex items-center gap-1">
          <Calendar className="w-2.5 h-2.5" />
          {new Date(note.updated_at).toLocaleDateString()}
        </span>
        {note.tags.length > 0 && (
          <div className="flex items-center gap-1 overflow-hidden truncate">
            {note.tags.slice(0, 2).map((t) => (
              <span
                key={t}
                className="px-1 py-0.2 rounded border"
                style={{
                  backgroundColor: theme?.colors.bgPrimary || 'var(--color-bg-primary)',
                  borderColor: theme?.colors.border || 'var(--color-border)',
                }}
              >
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
