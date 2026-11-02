import React from 'react';
import {
  Info,
  Clock,
  Calendar,
  FileText,
  Pin,
  Archive,
  Link as LinkIcon,
  ArrowDownLeft,
  ArrowUpRight,
  PlusCircle,
  Hash,
  Download,
} from 'lucide-react';
import type { NoteWithDetails } from '../../types';

export interface BacklinksPanelProps {
  noteDetails: NoteWithDetails | null;
  onNavigateToNote: (noteIdOrTitle: string) => void;
  onCreateNoteFromLink?: (title: string) => void;
  onTogglePin?: (isPinned: boolean) => void;
  onToggleArchive?: (isArchived: boolean) => void;
  onExportZip?: () => void;
}

export const BacklinksPanel: React.FC<BacklinksPanelProps> = ({
  noteDetails,
  onNavigateToNote,
  onCreateNoteFromLink,
  onTogglePin,
  onToggleArchive,
  onExportZip,
}) => {
  if (!noteDetails) {
    return (
      <aside className="w-72 border-l border-slate-800 bg-slate-950/60 p-4 text-slate-500 text-xs flex flex-col items-center justify-center text-center select-none shrink-0">
        <Info className="w-8 h-8 mb-2 text-slate-700" />
        <p>No note selected</p>
      </aside>
    );
  }

  const { note, tags, outgoing_links, incoming_links } = noteDetails;

  const wordCount = note.content.trim() ? note.content.trim().split(/\s+/).length : 0;
  const charCount = note.content.length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <aside className="w-72 border-l border-slate-800 bg-slate-950/70 flex flex-col h-full text-xs text-slate-300 overflow-y-auto select-none shrink-0 divide-y divide-slate-800/80">
      {/* 1. Note Metadata & Quick Actions */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            Note Info
          </span>
          <div className="flex items-center space-x-1">
            {onTogglePin && (
              <button
                onClick={() => onTogglePin(!note.is_pinned)}
                title={note.is_pinned ? 'Unpin note' : 'Pin note'}
                className={`p-1 rounded transition ${
                  note.is_pinned
                    ? 'text-amber-400 bg-amber-950/40 border border-amber-800/50'
                    : 'text-slate-500 hover:text-slate-200'
                }`}
              >
                <Pin className="w-3.5 h-3.5" />
              </button>
            )}
            {onToggleArchive && (
              <button
                onClick={() => onToggleArchive(!note.is_archived)}
                title={note.is_archived ? 'Unarchive note' : 'Archive note'}
                className={`p-1 rounded transition ${
                  note.is_archived
                    ? 'text-purple-400 bg-purple-950/40 border border-purple-800/50'
                    : 'text-slate-500 hover:text-slate-200'
                }`}
              >
                <Archive className="w-3.5 h-3.5" />
              </button>
            )}
            {onExportZip && (
              <button
                onClick={onExportZip}
                title="Export this note as a ZIP archive"
                className="p-1 rounded text-slate-400 hover:text-cyan-300 transition"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="text-[11px] font-mono text-slate-400 bg-slate-900/60 p-2 rounded border border-slate-800/60 truncate">
          {note.path}
        </div>

        {/* Word/Char/Time stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-900/40 p-2 rounded border border-slate-800/60">
            <div className="font-semibold text-slate-200 text-xs">{wordCount}</div>
            <div className="text-[10px] text-slate-500">words</div>
          </div>
          <div className="bg-slate-900/40 p-2 rounded border border-slate-800/60">
            <div className="font-semibold text-slate-200 text-xs">{charCount}</div>
            <div className="text-[10px] text-slate-500">chars</div>
          </div>
          <div className="bg-slate-900/40 p-2 rounded border border-slate-800/60">
            <div className="font-semibold text-slate-200 text-xs">{readingTime}m</div>
            <div className="text-[10px] text-slate-500">read</div>
          </div>
        </div>

        {/* Timestamps */}
        <div className="space-y-1 text-[11px] text-slate-400 pt-1">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-slate-500">
              <Calendar className="w-3 h-3" /> Created
            </span>
            <span>{new Date(note.created_at).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-slate-500">
              <Clock className="w-3 h-3" /> Updated
            </span>
            <span>{new Date(note.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      </div>

      {/* 2. Tags List */}
      <div className="p-4 space-y-2">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Hash className="w-3.5 h-3.5 text-cyan-400" />
          Tags ({tags.length})
        </span>
        {tags.length === 0 ? (
          <p className="text-[11px] text-slate-500 italic">No tags assigned</p>
        ) : (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-800/70 border border-slate-700/60 text-slate-300 text-[10px]"
              >
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 3. Incoming Backlinks */}
      <div className="p-4 space-y-2 flex-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
            Backlinks ({incoming_links.length})
          </span>
        </div>

        {incoming_links.length === 0 ? (
          <div className="py-4 text-center text-slate-500 text-[11px]">
            No incoming backlinks yet
          </div>
        ) : (
          <div className="space-y-2 pt-1">
            {incoming_links.map((link, idx) => {
              const sourceTitle = link.source_title || link.note_title || 'Untitled';
              const targetId = link.source_id || link.note_id || sourceTitle;
              const snippet = link.snippet || link.context_snippet || '';

              return (
                <div
                  key={idx}
                  onClick={() => onNavigateToNote(targetId)}
                  className="p-2.5 rounded-lg bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800/80 transition cursor-pointer group"
                >
                  <div className="flex items-center gap-1.5 text-cyan-400 group-hover:text-cyan-300 font-medium text-[11px]">
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{sourceTitle}</span>
                  </div>
                  {snippet && (
                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 italic">
                      "{snippet}"
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Outgoing Links */}
      <div className="p-4 space-y-2">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <ArrowUpRight className="w-3.5 h-3.5 text-sky-400" />
          Outgoing Links ({outgoing_links.length})
        </span>

        {outgoing_links.length === 0 ? (
          <div className="py-2 text-center text-slate-500 text-[11px]">
            No outgoing links
          </div>
        ) : (
          <div className="space-y-1.5 pt-1">
            {outgoing_links.map((link) => {
              const isUnresolved = link.is_unresolved;
              return (
                <div
                  key={link.id}
                  className="flex items-center justify-between p-1.5 rounded bg-slate-900/40 border border-slate-800/50 hover:bg-slate-800/40 transition text-[11px]"
                >
                  <button
                    onClick={() => onNavigateToNote(link.target_id || link.raw_target)}
                    className="flex items-center gap-1.5 truncate text-left flex-1"
                  >
                    <LinkIcon
                      className={`w-3 h-3 shrink-0 ${
                        isUnresolved ? 'text-amber-400/80' : 'text-cyan-400'
                      }`}
                    />
                    <span
                      className={`truncate ${
                        isUnresolved
                          ? 'text-amber-300/80 line-through decoration-slate-600'
                          : 'text-slate-200'
                      }`}
                    >
                      {link.alias ? `${link.alias} (${link.raw_target})` : link.raw_target}
                    </span>
                  </button>

                  {isUnresolved && onCreateNoteFromLink && (
                    <button
                      onClick={() => onCreateNoteFromLink(link.raw_target)}
                      title={`Create note "${link.raw_target}"`}
                      className="ml-1 text-cyan-400 hover:text-cyan-300 p-0.5 rounded"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
};
