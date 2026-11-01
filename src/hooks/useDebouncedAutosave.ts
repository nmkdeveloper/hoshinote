import { useState, useRef, useEffect, useCallback } from 'react';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface UseDebouncedAutosaveOptions<T> {
  delay?: number;
  onSave: (data: T) => Promise<void>;
  onError?: (error: unknown) => void;
}

export function useDebouncedAutosave<T>({
  delay = 350,
  onSave,
  onError,
}: UseDebouncedAutosaveOptions<T>) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDataRef = useRef<T | null>(null);
  const isSavingRef = useRef<boolean>(false);
  const activeSavePromiseRef = useRef<Promise<void> | null>(null);

  // Keep mutable refs for callbacks to prevent effect re-triggering and debounce bypass
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  // Clear idle timer helper
  const clearIdleTimer = useCallback(() => {
    if (idleResetTimerRef.current) {
      clearTimeout(idleResetTimerRef.current);
      idleResetTimerRef.current = null;
    }
  }, []);

  // Core save runner
  const executeSave = useCallback(
    async (data: T): Promise<void> => {
      // Clear pending data if it matches what we are about to save
      if (pendingDataRef.current === data) {
        pendingDataRef.current = null;
      }
      isSavingRef.current = true;
      setStatus('saving');
      clearIdleTimer();

      const savePromise = (async () => {
        try {
          await onSaveRef.current(data);

          // Only transition to 'saved' if no newer edits arrived during this save
          if (pendingDataRef.current === null) {
            setStatus('saved');

            clearIdleTimer();
            idleResetTimerRef.current = setTimeout(() => {
              setStatus('idle');
              idleResetTimerRef.current = null;
            }, 2000);
          }
        } catch (err) {
          setStatus('error');
          if (onErrorRef.current) onErrorRef.current(err);
        } finally {
          isSavingRef.current = false;
          activeSavePromiseRef.current = null;

          // If new edits arrived while saving, immediately execute save for pending data
          if (pendingDataRef.current !== null) {
            const nextData = pendingDataRef.current;
            pendingDataRef.current = null;
            executeSave(nextData);
          }
        }
      })();

      activeSavePromiseRef.current = savePromise;
      await savePromise;
    },
    [clearIdleTimer]
  );

  // Trigger a debounced save
  const triggerSave = useCallback(
    (data: T) => {
      // Merge partial updates if objects, else replace
      if (
        typeof data === 'object' &&
        data !== null &&
        typeof pendingDataRef.current === 'object' &&
        pendingDataRef.current !== null
      ) {
        pendingDataRef.current = {
          ...pendingDataRef.current,
          ...data,
        };
      } else {
        pendingDataRef.current = data;
      }

      setStatus('saving');
      clearIdleTimer();

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        if (pendingDataRef.current !== null && !isSavingRef.current) {
          const toSave = pendingDataRef.current;
          pendingDataRef.current = null;
          executeSave(toSave);
        }
      }, delay);
    },
    [delay, executeSave, clearIdleTimer]
  );

  // Immediately flush pending changes
  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Wait until all active in-flight saves and queued pending edits are fully settled
    while (activeSavePromiseRef.current || pendingDataRef.current !== null) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      if (activeSavePromiseRef.current) {
        await activeSavePromiseRef.current;
      } else if (pendingDataRef.current !== null) {
        const toSave = pendingDataRef.current;
        pendingDataRef.current = null;
        await executeSave(toSave);
      }
    }
  }, [executeSave]);

  // Clean up on unmount ONLY (empty dependency array)
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (idleResetTimerRef.current) {
        clearTimeout(idleResetTimerRef.current);
        idleResetTimerRef.current = null;
      }
      // If there is unsaved pending data and no save currently in flight, flush on unmount
      if (pendingDataRef.current !== null && !isSavingRef.current) {
        onSaveRef.current(pendingDataRef.current).catch((err) => {
          console.error('Failed to flush autosave on unmount:', err);
        });
      }
    };
  }, []);

  return {
    status,
    setStatus,
    triggerSave,
    flush,
  };
}
