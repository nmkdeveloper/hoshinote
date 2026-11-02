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

export interface SidebarProps {
  notes: NoteSummary[];
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  onDeleteNote?: (id: string) => void;
  onNewNote?: () => void;
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  notes,
  selectedNoteId,
  onSelectNote,
  onDeleteNote,
  onNewNote,
  selectedTag,
  onSelectTag,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [isTagsOpen, setIsTagsOpen] = useState(true);
  const [isPinnedOpen, setIsPinnedOpen] = useState(true);

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
    <aside className="w-64 border-r border-slate-800 bg-slate-900/60 flex flex-col h-full select-none shrink-0 text-slate-300">
      {/* Vault Header */}
      <div className="p-3 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold tracking-wide text-slate-100">Hoshinote Vault</span>
        </div>
        {onNewNote && (
          <button
            onClick={onNewNote}
            title="Create new note"
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Local Filter Bar */}
      <div className="px-3 py-2 border-b border-slate-800/60">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter notes..."
            aria-label="Filter notes list"
            className="w-full bg-slate-950/50 border border-slate-800 text-[11px] rounded pl-8 pr-2 py-1 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/70"
          />
        </div>
      </div>

      {/* Tags Filter Chips (Collapsible) */}
      {tagsMap.length > 0 && (
        <div className="p-2 border-b border-slate-800/80">
          <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            <button
              onClick={() => setIsTagsOpen((prev) => !prev)}
              className="flex items-center gap-1 hover:text-cyan-400 transition"
              title="Toggle tags filter"
            >
              {isTagsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              <Tag className="w-3 h-3 text-cyan-400" />
              <span>Tags ({tagsMap.length})</span>
            </button>
            {selectedTag && (
              <button
                onClick={() => onSelectTag(null)}
                className="text-[10px] text-cyan-400 hover:underline lowercase font-normal"
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
                    className={`flex items-center space-x-1 text-[10px] px-2 py-0.5 rounded-full transition ${
                      isSelected
                        ? 'bg-cyan-500 text-slate-950 font-medium shadow-xs'
                        : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <Hash className="w-2.5 h-2.5" />
                    <span>{tag}</span>
                    <span className={`text-[9px] ${isSelected ? 'text-slate-900' : 'text-slate-500'}`}>
                      {count}
                    </span>
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
              className="w-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-400/90 flex items-center justify-between hover:bg-slate-800/40 rounded transition"
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
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Other / All notes section */}
        <div>
          {pinnedNotes.length > 0 && otherNotes.length > 0 && (
            <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <FileText className="w-3 h-3 text-cyan-400" />
              Notes ({otherNotes.length})
            </div>
          )}
          {filteredNotes.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No notes match your filter.
            </div>
          ) : (
            otherNotes.map((note) => (
              <NoteListItem
                key={note.id}
                note={note}
                isSelected={note.id === selectedNoteId}
                onSelect={() => onSelectNote(note.id)}
                onDelete={onDeleteNote ? () => onDeleteNote(note.id) : undefined}
              />
            ))
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
}

const NoteListItem: React.FC<NoteListItemProps> = ({ note, isSelected, onSelect, onDelete }) => {
  return (
    <div
      onClick={onSelect}
      className={`w-full text-left p-2 rounded-lg transition group cursor-pointer flex flex-col gap-0.5 relative ${
        isSelected
          ? 'bg-slate-800 border border-cyan-500/40 text-white shadow-xs'
          : 'hover:bg-slate-800/50 text-slate-300 hover:text-white border border-transparent'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium truncate flex-1 pr-1">{note.title}</span>
        <div className="flex items-center gap-1 shrink-0">
          {note.is_pinned && <Pin className="w-3 h-3 text-amber-400 fill-amber-400/20" />}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="Delete note"
              className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-rose-400 transition"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <p className="text-[11px] text-slate-500 truncate group-hover:text-slate-400">
        {note.snippet || 'Empty note'}
      </p>

      <div className="flex items-center gap-2 mt-0.5 text-[9px] text-slate-500">
        <span className="flex items-center gap-1">
          <Calendar className="w-2.5 h-2.5" />
          {new Date(note.updated_at).toLocaleDateString()}
        </span>
        {note.tags.length > 0 && (
          <div className="flex items-center gap-1 overflow-hidden truncate">
            {note.tags.slice(0, 2).map((t) => (
              <span key={t} className="px-1 py-0.2 rounded bg-slate-800/80 text-slate-400">
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
