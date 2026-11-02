import React, { useState } from 'react';
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
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import type { NoteWithDetails } from '../../types';
import type { ThemeConfig } from '../../types/theme';

export interface BacklinksPanelProps {
  noteDetails: NoteWithDetails | null;
  onNavigateToNote: (noteIdOrTitle: string) => void;
  onCreateNoteFromLink?: (title: string) => void;
  onTogglePin?: (isPinned: boolean) => void;
  onToggleArchive?: (isArchived: boolean) => void;
  onExportZip?: () => void;
  theme?: ThemeConfig;
}

export const BacklinksPanel: React.FC<BacklinksPanelProps> = ({
  noteDetails,
  onNavigateToNote,
  onCreateNoteFromLink,
  onTogglePin,
  onToggleArchive,
  onExportZip,
  theme,
}) => {
  const [isInfoOpen, setIsInfoOpen] = useState(true);
  const [isTagsOpen, setIsTagsOpen] = useState(true);
  const [isBacklinksOpen, setIsBacklinksOpen] = useState(true);
  const [isOutgoingOpen, setIsOutgoingOpen] = useState(true);

  if (!noteDetails) {
    return (
      <aside
        className="w-72 border-l p-4 text-xs flex flex-col items-center justify-center text-center select-none shrink-0 transition-colors duration-150"
        style={{
          backgroundColor: theme?.colors.bgSecondary || 'var(--color-bg-secondary)',
          borderColor: theme?.colors.border || 'var(--color-border)',
          color: theme?.colors.textSecondary || 'var(--color-text-secondary)',
        }}
      >
        <Info className="w-8 h-8 mb-2 opacity-40" />
        <p>No note selected</p>
      </aside>
    );
  }

  const { note, tags, outgoing_links, incoming_links } = noteDetails;

  const wordCount = note.content.trim() ? note.content.trim().split(/\s+/).length : 0;
  const charCount = note.content.length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <aside
      className="w-72 border-l flex flex-col h-full text-xs overflow-y-auto select-none shrink-0 divide-y transition-colors duration-150"
      style={{
        backgroundColor: theme?.colors.bgSecondary || 'var(--color-bg-secondary)',
        borderColor: theme?.colors.border || 'var(--color-border)',
        color: theme?.colors.textPrimary || 'var(--color-text-primary)',
      }}
    >
      {/* 1. Note Metadata & Quick Actions (Collapsible) */}
      <div className="p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsInfoOpen((prev) => !prev)}
            className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5 hover:opacity-80 transition"
            style={{ color: theme?.colors.textSecondary || 'var(--color-text-secondary)' }}
          >
            {isInfoOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            <Info className="w-3.5 h-3.5" style={{ color: theme?.colors.accent || 'var(--color-accent)' }} />
            <span>Note Info</span>
          </button>
          <div className="flex items-center space-x-1">
            {onTogglePin && (
              <button
                onClick={() => onTogglePin(!note.is_pinned)}
                title={note.is_pinned ? 'Unpin note' : 'Pin note'}
                className="p-1 rounded transition hover:opacity-80"
                style={{
                  color: note.is_pinned ? '#f59e0b' : theme?.colors.textSecondary || 'var(--color-text-secondary)',
                  backgroundColor: note.is_pinned ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                }}
              >
                <Pin className="w-3.5 h-3.5" />
              </button>
            )}
            {onToggleArchive && (
              <button
                onClick={() => onToggleArchive(!note.is_archived)}
                title={note.is_archived ? 'Unarchive note' : 'Archive note'}
                className="p-1 rounded transition hover:opacity-80"
                style={{
                  color: note.is_archived ? '#a855f7' : theme?.colors.textSecondary || 'var(--color-text-secondary)',
                  backgroundColor: note.is_archived ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
                }}
              >
                <Archive className="w-3.5 h-3.5" />
              </button>
            )}
            {onExportZip && (
              <button
                onClick={onExportZip}
                title="Export this note as a ZIP archive"
                className="p-1 rounded transition hover:opacity-80"
                style={{ color: theme?.colors.textSecondary || 'var(--color-text-secondary)' }}
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {isInfoOpen && (
          <div className="space-y-2.5 pt-0.5">
            <div
              className="text-[11px] font-mono p-2 rounded border truncate"
              style={{
                backgroundColor: theme?.colors.bgPrimary || 'var(--color-bg-primary)',
                borderColor: theme?.colors.border || 'var(--color-border)',
                color: theme?.colors.textSecondary || 'var(--color-text-secondary)',
              }}
            >
              {note.path}
            </div>

            {/* Word/Char/Time stats */}
            <div className="grid grid-cols-3 gap-1.5 text-center">
              <div
                className="p-1.5 rounded border"
                style={{
                  backgroundColor: theme?.colors.bgPrimary || 'var(--color-bg-primary)',
                  borderColor: theme?.colors.border || 'var(--color-border)',
                }}
              >
                <div className="font-semibold text-xs" style={{ color: theme?.colors.textBold || 'var(--color-text-bold)' }}>{wordCount}</div>
                <div className="text-[10px] opacity-75" style={{ color: theme?.colors.textSecondary || 'var(--color-text-secondary)' }}>words</div>
              </div>
              <div
                className="p-1.5 rounded border"
                style={{
                  backgroundColor: theme?.colors.bgPrimary || 'var(--color-bg-primary)',
                  borderColor: theme?.colors.border || 'var(--color-border)',
                }}
              >
                <div className="font-semibold text-xs" style={{ color: theme?.colors.textBold || 'var(--color-text-bold)' }}>{charCount}</div>
                <div className="text-[10px] opacity-75" style={{ color: theme?.colors.textSecondary || 'var(--color-text-secondary)' }}>chars</div>
              </div>
              <div
                className="p-1.5 rounded border"
                style={{
                  backgroundColor: theme?.colors.bgPrimary || 'var(--color-bg-primary)',
                  borderColor: theme?.colors.border || 'var(--color-border)',
                }}
              >
                <div className="font-semibold text-xs" style={{ color: theme?.colors.textBold || 'var(--color-text-bold)' }}>{readingTime}m</div>
                <div className="text-[10px] opacity-75" style={{ color: theme?.colors.textSecondary || 'var(--color-text-secondary)' }}>read</div>
              </div>
            </div>

            {/* Timestamps */}
            <div
              className="space-y-1 text-[11px] pt-1"
              style={{ color: theme?.colors.textSecondary || 'var(--color-text-secondary)' }}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 opacity-80">
                  <Calendar className="w-3 h-3" /> Created
                </span>
                <span>{new Date(note.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 opacity-80">
                  <Clock className="w-3 h-3" /> Updated
                </span>
                <span>{new Date(note.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Tags List (Collapsible) */}
      <div className="p-3.5 space-y-2">
        <button
          onClick={() => setIsTagsOpen((prev) => !prev)}
          className="w-full text-left text-[11px] font-semibold uppercase tracking-wider flex items-center justify-between hover:opacity-80 transition"
          style={{ color: theme?.colors.textSecondary || 'var(--color-text-secondary)' }}
        >
          <div className="flex items-center gap-1.5">
            {isTagsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            <Hash className="w-3.5 h-3.5" style={{ color: theme?.colors.accent || 'var(--color-accent)' }} />
            <span>Tags ({tags.length})</span>
          </div>
        </button>

        {isTagsOpen && (
          tags.length === 0 ? (
            <p className="text-[11px] italic" style={{ color: theme?.colors.textSecondary || 'var(--color-text-secondary)' }}>
              No tags assigned
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center px-2 py-0.5 rounded-full border text-[10px]"
                  style={{
                    backgroundColor: theme?.colors.bgPrimary || 'var(--color-bg-primary)',
                    borderColor: theme?.colors.border || 'var(--color-border)',
                    color: theme?.colors.textPrimary || 'var(--color-text-primary)',
                  }}
                >
                  #{t}
                </span>
              ))}
            </div>
          )
        )}
      </div>

      {/* 3. Incoming Backlinks (Collapsible) */}
      <div className="p-3.5 space-y-2 flex-1">
        <button
          onClick={() => setIsBacklinksOpen((prev) => !prev)}
          className="w-full text-left text-[11px] font-semibold uppercase tracking-wider flex items-center justify-between hover:opacity-80 transition"
          style={{ color: theme?.colors.textSecondary || 'var(--color-text-secondary)' }}
        >
          <div className="flex items-center gap-1.5">
            {isBacklinksOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
            <span>Backlinks ({incoming_links.length})</span>
          </div>
        </button>

        {isBacklinksOpen && (
          incoming_links.length === 0 ? (
            <div className="py-4 text-center italic text-[11px]" style={{ color: theme?.colors.textSecondary || 'var(--color-text-secondary)' }}>
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
                    className="p-2.5 rounded-lg border transition cursor-pointer group hover:opacity-90"
                    style={{
                      backgroundColor: theme?.colors.bgPrimary || 'var(--color-bg-primary)',
                      borderColor: theme?.colors.border || 'var(--color-border)',
                    }}
                  >
                    <div
                      className="flex items-center gap-1.5 font-medium text-[11px]"
                      style={{ color: theme?.colors.accent || 'var(--color-accent)' }}
                    >
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{sourceTitle}</span>
                    </div>
                    {snippet && (
                      <p
                        className="text-[10px] mt-1 line-clamp-2 italic"
                        style={{ color: theme?.colors.textSecondary || 'var(--color-text-secondary)' }}
                      >
                        "{snippet}"
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* 4. Outgoing Links (Collapsible) */}
      <div className="p-3.5 space-y-2">
        <button
          onClick={() => setIsOutgoingOpen((prev) => !prev)}
          className="w-full text-left text-[11px] font-semibold uppercase tracking-wider flex items-center justify-between hover:opacity-80 transition"
          style={{ color: theme?.colors.textSecondary || 'var(--color-text-secondary)' }}
        >
          <div className="flex items-center gap-1.5">
            {isOutgoingOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            <ArrowUpRight className="w-3.5 h-3.5 text-sky-400" />
            <span>Outgoing Links ({outgoing_links.length})</span>
          </div>
        </button>

        {isOutgoingOpen && (
          outgoing_links.length === 0 ? (
            <div className="py-2 text-center italic text-[11px]" style={{ color: theme?.colors.textSecondary || 'var(--color-text-secondary)' }}>
              No outgoing links
            </div>
          ) : (
            <div className="space-y-1.5 pt-1">
              {outgoing_links.map((link) => {
                const isUnresolved = link.is_unresolved;
                return (
                  <div
                    key={link.id}
                    className="flex items-center justify-between p-1.5 rounded border transition text-[11px]"
                    style={{
                      backgroundColor: theme?.colors.bgPrimary || 'var(--color-bg-primary)',
                      borderColor: theme?.colors.border || 'var(--color-border)',
                    }}
                  >
                    <button
                      onClick={() => onNavigateToNote(link.target_id || link.raw_target)}
                      className="flex items-center gap-1.5 truncate text-left flex-1"
                    >
                      <LinkIcon
                        className={`w-3 h-3 shrink-0 ${
                          isUnresolved ? 'text-amber-400' : ''
                        }`}
                        style={{ color: isUnresolved ? '#f59e0b' : theme?.colors.accent || 'var(--color-accent)' }}
                      />
                      <span
                        className={`truncate ${
                          isUnresolved ? 'line-through opacity-75' : ''
                        }`}
                        style={{ color: theme?.colors.textPrimary || 'var(--color-text-primary)' }}
                      >
                        {link.alias ? `${link.alias} (${link.raw_target})` : link.raw_target}
                      </span>
                    </button>

                    {isUnresolved && onCreateNoteFromLink && (
                      <button
                        onClick={() => onCreateNoteFromLink(link.raw_target)}
                        title={`Create note "${link.raw_target}"`}
                        className="ml-1 p-0.5 rounded transition hover:opacity-80"
                        style={{ color: theme?.colors.accent || 'var(--color-accent)' }}
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </aside>
  );
};
