import React, { useState, useEffect } from 'react';
import { Download, X, Sparkles, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { checkAppUpdate, openReleaseDownload, UpdateInfo } from '../../lib/updater';
import { renderMarkdown } from '../../lib/markdown';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentVersion?: string;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  onClose,
  currentVersion = '0.2.0',
}) => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    checkAppUpdate(currentVersion)
      .then((info) => {
        setUpdateInfo(info);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen, currentVersion]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (updateInfo?.downloadUrl) {
      openReleaseDownload(updateInfo.downloadUrl);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-xl border border-slate-700/80 bg-slate-900 shadow-2xl overflow-hidden flex flex-col text-slate-200">
        {/* Header */}
        <div className="h-11 px-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-sm text-slate-100">Check for Updates</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex flex-col space-y-4">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
              <p className="text-sm">Connecting to GitHub Releases...</p>
            </div>
          ) : updateInfo?.error ? (
            <div className="py-6 flex flex-col items-center justify-center text-center space-y-2">
              <AlertCircle className="w-10 h-10 text-amber-400 opacity-80" />
              <p className="font-medium text-slate-200">Could not reach GitHub</p>
              <p className="text-xs text-slate-400 max-w-xs">{updateInfo.error}</p>
            </div>
          ) : updateInfo?.hasUpdate ? (
            <>
              {/* Version Comparison Banner */}
              <div className="flex items-center justify-between p-3.5 rounded-lg bg-cyan-950/40 border border-cyan-800/40 text-xs">
                <div>
                  <span className="text-slate-400">Current version: </span>
                  <span className="font-mono font-semibold text-slate-200">v{currentVersion}</span>
                </div>
                <div className="text-cyan-400 font-bold flex items-center space-x-1">
                  <span>→</span>
                  <span className="bg-cyan-500/20 px-2 py-0.5 rounded border border-cyan-500/30">
                    {updateInfo.latestVersion} Available
                  </span>
                </div>
              </div>

              {/* Release Title and Notes */}
              <div className="space-y-1.5">
                <h3 className="font-bold text-sm text-slate-100">{updateInfo.releaseName}</h3>
                <div
                  className="max-h-56 overflow-y-auto p-3 rounded-md bg-slate-950/50 border border-slate-800 text-xs text-slate-300 leading-relaxed markdown-preview"
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdown(updateInfo.releaseNotes),
                  }}
                />
              </div>
            </>
          ) : (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 opacity-90" />
              <p className="font-bold text-slate-100 text-sm">You are on the latest version!</p>
              <p className="text-xs text-slate-400 font-mono">Hoshinote v{currentVersion} is up to date.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/50 flex items-center justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-md text-xs font-medium border border-slate-700 hover:bg-slate-800 text-slate-300 transition"
          >
            Close
          </button>
          {updateInfo?.hasUpdate && (
            <button
              onClick={handleDownload}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded-md text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download & Install</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
