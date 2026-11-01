import React from 'react';
import { Database, CheckCircle2, FileText, Loader2, Check, AlertCircle } from 'lucide-react';
import type { SaveStatus } from '../../hooks/useDebouncedAutosave';

export interface StatusBarProps {
  appStatus: string;
  saveStatus?: SaveStatus;
  notesCount: number;
  wordCount: number;
  charCount: number;
  currentNoteTitle?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  appStatus,
  saveStatus = 'idle',
  notesCount,
  wordCount,
  charCount,
  currentNoteTitle,
}) => {
  return (
    <footer className="h-6 border-t border-slate-800 bg-slate-950 px-3 flex items-center justify-between text-[11px] text-slate-400 select-none shrink-0 z-20">
      {/* Left info: Database, App Status & Autosave Status */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-1.5 text-cyan-400">
          <Database className="w-3 h-3 text-cyan-400" />
          <span className="font-medium">SQLite Bundled</span>
        </div>

        <div className="h-3 w-px bg-slate-800" />

        <div className="flex items-center space-x-1 text-slate-300">
          <span>{appStatus}</span>
        </div>

        <div className="h-3 w-px bg-slate-800" />

        {/* Visual Autosave Badge */}
        <div className="flex items-center space-x-1">
          {saveStatus === 'saving' && (
            <>
              <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />
              <span className="text-cyan-400 font-medium">Saving...</span>
            </>
          )}
          {saveStatus === 'saved' && (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Saved</span>
            </>
          )}
          {saveStatus === 'idle' && (
            <>
              <Check className="w-3 h-3 text-slate-500" />
              <span className="text-slate-400">All changes saved</span>
            </>
          )}
          {saveStatus === 'error' && (
            <>
              <AlertCircle className="w-3 h-3 text-rose-400" />
              <span className="text-rose-400 font-medium">Save failed</span>
            </>
          )}
        </div>
      </div>

      {/* Right info: Stats */}
      <div className="flex items-center space-x-3">
        {currentNoteTitle && (
          <>
            <span className="truncate max-w-[180px] text-slate-400 font-mono text-[10px]">
              {currentNoteTitle}
            </span>
            <div className="h-3 w-px bg-slate-800" />
            <span>{wordCount} words</span>
            <span>{charCount} chars</span>
            <div className="h-3 w-px bg-slate-800" />
          </>
        )}
        <div className="flex items-center space-x-1">
          <FileText className="w-3 h-3 text-slate-400" />
          <span>
            {notesCount} {notesCount === 1 ? 'note' : 'notes'}
          </span>
        </div>
      </div>
    </footer>
  );
};
