import { Database, CheckCircle2, FileText, Loader2, Check, AlertCircle, Lock } from 'lucide-react';
import type { SaveStatus } from '../../hooks/useDebouncedAutosave';
import type { ThemeConfig } from '../../types/theme';

export interface StatusBarProps {
  appStatus: string;
  saveStatus?: SaveStatus;
  notesCount: number;
  wordCount: number;
  charCount: number;
  currentNoteTitle?: string;
  isEncrypted?: boolean;
  theme?: ThemeConfig;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  appStatus,
  saveStatus = 'idle',
  notesCount,
  wordCount,
  charCount,
  currentNoteTitle,
  isEncrypted = true,
  theme,
}) => {
  return (
    <footer
      className="h-6 border-t px-3 flex items-center justify-between text-[11px] select-none shrink-0 z-20 transition-colors duration-150"
      style={{
        backgroundColor: theme?.colors.bgSecondary || 'var(--color-bg-secondary)',
        borderColor: theme?.colors.border || 'var(--color-border)',
        color: theme?.colors.textSecondary || 'var(--color-text-secondary)',
      }}
    >
      {/* Left info: Database, Encryption, App Status & Autosave Status */}
      <div className="flex items-center space-x-3">
        <div
          className="flex items-center space-x-1.5 font-medium"
          style={{ color: theme?.colors.accent || 'var(--color-accent)' }}
        >
          <Database className="w-3 h-3" />
          <span>SQLite Bundled</span>
        </div>

        {isEncrypted && (
          <>
            <div className="h-3 w-px" style={{ backgroundColor: theme?.colors.border || 'var(--color-border)' }} />
            <div
              className="flex items-center space-x-1 font-medium"
              style={{ color: theme?.colors.textPrimary || 'var(--color-text-primary)' }}
              title="Database is encrypted at rest using AES-256-GCM"
            >
              <Lock className="w-3 h-3" style={{ color: theme?.colors.accent || 'var(--color-accent)' }} />
              <span>Encrypted (AES-256)</span>
            </div>
          </>
        )}

        <div className="h-3 w-px" style={{ backgroundColor: theme?.colors.border || 'var(--color-border)' }} />

        <div className="flex items-center space-x-1" style={{ color: theme?.colors.textPrimary || 'var(--color-text-primary)' }}>
          <span>{appStatus}</span>
        </div>

        <div className="h-3 w-px" style={{ backgroundColor: theme?.colors.border || 'var(--color-border)' }} />

        {/* Visual Autosave Badge */}
        <div className="flex items-center space-x-1">
          {saveStatus === 'saving' && (
            <>
              <Loader2 className="w-3 h-3 animate-spin" style={{ color: theme?.colors.accent || 'var(--color-accent)' }} />
              <span className="font-medium" style={{ color: theme?.colors.accent || 'var(--color-accent)' }}>Saving...</span>
            </>
          )}
          {saveStatus === 'saved' && (
            <>
              <CheckCircle2 className="w-3 h-3" style={{ color: theme?.colors.accent || 'var(--color-accent)' }} />
              <span className="font-medium" style={{ color: theme?.colors.textPrimary || 'var(--color-text-primary)' }}>Saved</span>
            </>
          )}
          {saveStatus === 'idle' && (
            <>
              <Check className="w-3 h-3 opacity-60" />
              <span>All changes saved</span>
            </>
          )}
          {saveStatus === 'error' && (
            <>
              <AlertCircle className="w-3 h-3" style={{ color: theme?.colors.textBold || 'var(--color-text-bold)' }} />
              <span className="font-medium underline" style={{ color: theme?.colors.textBold || 'var(--color-text-bold)' }}>Save failed</span>
            </>
          )}
        </div>
      </div>

      {/* Right info: Stats */}
      <div className="flex items-center space-x-3">
        {currentNoteTitle && (
          <>
            <span
              className="truncate max-w-[180px] font-mono text-[10px]"
              style={{ color: theme?.colors.textSecondary || 'var(--color-text-secondary)' }}
            >
              {currentNoteTitle}
            </span>
            <div className="h-3 w-px" style={{ backgroundColor: theme?.colors.border || 'var(--color-border)' }} />
            <span>{wordCount} words</span>
            <span>{charCount} chars</span>
            <div className="h-3 w-px" style={{ backgroundColor: theme?.colors.border || 'var(--color-border)' }} />
          </>
        )}
        <div className="flex items-center space-x-1">
          <FileText className="w-3 h-3" style={{ color: theme?.colors.textSecondary || 'var(--color-text-secondary)' }} />
          <span>
            {notesCount} {notesCount === 1 ? 'note' : 'notes'}
          </span>
        </div>
      </div>
    </footer>
  );
};
