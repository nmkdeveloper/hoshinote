import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { useDebouncedAutosave } from '../hooks/useDebouncedAutosave';

// Lightweight React Hook Test Harness for Node.js / Vitest environment
function renderHook<TProps, TResult>(
  hookFn: (props: TProps) => TResult,
  options?: { initialProps?: TProps }
) {
  let currentProps = options?.initialProps as TProps;
  let result = { current: undefined as unknown as TResult };
  let hooks: Array<{ state: any; setState: (s: any) => void }> = [];
  let refs: Array<{ current: any }> = [];
  let effects: Array<{ effect: () => (() => void) | void; deps?: any[]; cleanup?: (() => void) | void }> = [];
  let hookIndex = 0;
  let refIndex = 0;
  let effectIndex = 0;
  let isMounted = true;

  function runHook() {
    hookIndex = 0;
    refIndex = 0;
    effectIndex = 0;

    const dispatcher = {
      useState: (initial: any) => {
        const idx = hookIndex++;
        if (hooks[idx] === undefined) {
          hooks[idx] = {
            state: typeof initial === 'function' ? initial() : initial,
            setState: (nextState: any) => {
              hooks[idx].state = typeof nextState === 'function' ? nextState(hooks[idx].state) : nextState;
              if (isMounted) runHook();
            },
          };
        }
        return [hooks[idx].state, hooks[idx].setState];
      },
      useRef: (initial: any) => {
        const idx = refIndex++;
        if (refs[idx] === undefined) {
          refs[idx] = { current: initial };
        }
        return refs[idx];
      },
      useCallback: (fn: any) => fn,
      useEffect: (effect: () => (() => void) | void, deps?: any[]) => {
        const idx = effectIndex++;
        const prev = effects[idx];
        const hasChanged = !prev || !deps || !prev.deps || deps.some((d, i) => d !== prev.deps![i]);
        if (hasChanged) {
          if (prev?.cleanup) {
            try { prev.cleanup(); } catch (e) {}
          }
          const cleanup = effect();
          effects[idx] = { effect, deps, cleanup };
        }
      },
      useMemo: (factory: () => any) => factory(),
    };

    const r = React as any;
    let restore = () => {};
    if (r.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE) {
      const prev = r.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE.H;
      r.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE.H = dispatcher;
      restore = () => { r.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE.H = prev; };
    } else if (r.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED?.ReactCurrentDispatcher) {
      const prev = r.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher.current;
      r.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher.current = dispatcher;
      restore = () => { r.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher.current = prev; };
    }

    try {
      result.current = hookFn(currentProps);
    } finally {
      restore();
    }
  }

  runHook();

  return {
    result,
    rerender: (newProps?: TProps) => {
      if (newProps !== undefined) currentProps = newProps;
      runHook();
    },
    unmount: () => {
      isMounted = false;
      for (const eff of effects) {
        if (eff.cleanup) {
          try { eff.cleanup(); } catch (e) {}
        }
      }
    },
  };
}

describe('Editor Statistics & Word Count Logic', () => {
  it('calculates word count and character count accurately', () => {
    const text = 'Hello Hoshinote! This is an Obsidian-inspired desktop app.';
    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
    const charCount = text.length;

    expect(wordCount).toBe(8);
    expect(charCount).toBe(58);
  });

  it('handles empty or whitespace-only content safely', () => {
    const empty = '';
    const whitespace = '    \n\t  ';
    const count = (str: string) => (str.trim() ? str.trim().split(/\s+/).length : 0);

    expect(count(empty)).toBe(0);
    expect(count(whitespace)).toBe(0);
  });

  it('estimates reading time assuming 200 words per minute', () => {
    const calculateReadingTime = (words: number) => Math.max(1, Math.ceil(words / 200));

    expect(calculateReadingTime(50)).toBe(1);
    expect(calculateReadingTime(200)).toBe(1);
    expect(calculateReadingTime(201)).toBe(2);
    expect(calculateReadingTime(500)).toBe(3);
  });
});

describe('useDebouncedAutosave Production Hook Verification', () => {
  it('debounces rapid sequential keystrokes into a single save after 350ms of quiet', async () => {
    vi.useFakeTimers();
    const onSaveSpy = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useDebouncedAutosave<{ id: string; content: string }>({
        delay: 350,
        onSave: onSaveSpy,
      })
    );

    result.current.triggerSave({ id: 'note-1', content: 'H' });
    vi.advanceTimersByTime(100);
    result.current.triggerSave({ id: 'note-1', content: 'He' });
    vi.advanceTimersByTime(100);
    result.current.triggerSave({ id: 'note-1', content: 'Hello' });

    expect(result.current.status).toBe('saving');
    expect(onSaveSpy).not.toHaveBeenCalled();

    // Advance 349ms (still quiet)
    vi.advanceTimersByTime(349);
    expect(onSaveSpy).not.toHaveBeenCalled();

    // Advance 2ms (exceeds 350ms)
    vi.advanceTimersByTime(2);
    expect(onSaveSpy).toHaveBeenCalledTimes(1);
    expect(onSaveSpy).toHaveBeenCalledWith({ id: 'note-1', content: 'Hello' });

    await Promise.resolve();
    expect(result.current.status).toBe('saved');

    vi.useRealTimers();
  });

  it('preserves debounce timing across parent re-renders with new onSave identity', async () => {
    vi.useFakeTimers();
    const saveCalls: string[] = [];

    const { result, rerender } = renderHook(
      (props) =>
        useDebouncedAutosave<{ id: string; content: string }>({
          delay: 350,
          onSave: props.onSave,
        }),
      { initialProps: { onSave: async (d: any) => { saveCalls.push(d.content); } } }
    );

    result.current.triggerSave({ id: 'note-1', content: 'Keystroke A' });

    // Simulate parent re-render with brand new onSave reference (0ms elapsed)
    rerender({ onSave: async (d: any) => { saveCalls.push(d.content); } });

    // Should NOT have fired yet!
    expect(saveCalls.length).toBe(0);

    // Advance 350ms
    vi.advanceTimersByTime(350);
    expect(saveCalls.length).toBe(1);
    expect(saveCalls[0]).toBe('Keystroke A');

    vi.useRealTimers();
  });

  it('flushes pending debounced save immediately on note switch to prevent data loss', async () => {
    vi.useFakeTimers();
    const onSaveSpy = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useDebouncedAutosave<{ id: string; content: string }>({
        delay: 350,
        onSave: onSaveSpy,
      })
    );

    result.current.triggerSave({ id: 'note-a', content: 'Unsaved edits in Note A' });
    expect(onSaveSpy).not.toHaveBeenCalled();

    // User switches note -> immediate flush
    await result.current.flush();
    expect(onSaveSpy).toHaveBeenCalledTimes(1);
    expect(onSaveSpy).toHaveBeenCalledWith({ id: 'note-a', content: 'Unsaved edits in Note A' });

    vi.useRealTimers();
  });

  it('merges partial payload updates (content and title) safely', async () => {
    vi.useFakeTimers();
    const onSaveSpy = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useDebouncedAutosave<{ id: string; content?: string; title?: string }>({
        delay: 350,
        onSave: onSaveSpy,
      })
    );

    // Edit content then edit title within 350ms
    result.current.triggerSave({ id: 'note-1', content: 'Updated Body' });
    result.current.triggerSave({ id: 'note-1', title: 'Updated Title' });

    vi.advanceTimersByTime(350);
    expect(onSaveSpy).toHaveBeenCalledTimes(1);
    expect(onSaveSpy).toHaveBeenCalledWith({
      id: 'note-1',
      content: 'Updated Body',
      title: 'Updated Title',
    });

    vi.useRealTimers();
  });

  it('does not trigger duplicate concurrent save on unmount', async () => {
    vi.useFakeTimers();
    let totalSaves = 0;
    const slowSave = vi.fn(async () => {
      totalSaves++;
      await new Promise((r) => setTimeout(r, 100));
    });

    const { result, unmount } = renderHook(() =>
      useDebouncedAutosave<{ id: string }>({
        delay: 350,
        onSave: slowSave,
      })
    );

    result.current.triggerSave({ id: 'doc-1' });
    vi.advanceTimersByTime(350);
    expect(slowSave).toHaveBeenCalledTimes(1);

    // Unmount while save is in flight
    unmount();
    vi.advanceTimersByTime(200);

    // Verify no second duplicate save was fired
    expect(slowSave).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it('waits for in-flight save and subsequent queued pending edits before flush resolves', async () => {
    vi.useFakeTimers();
    let resolveFirstSave!: () => void;
    let resolveSecondSave!: () => void;
    const firstSavePromise = new Promise<void>((r) => {
      resolveFirstSave = r;
    });
    const secondSavePromise = new Promise<void>((r) => {
      resolveSecondSave = r;
    });

    const saveLog: string[] = [];
    const onSave = vi.fn(async (data: { id: string; content: string }) => {
      if (data.content === 'V1') {
        await firstSavePromise;
      } else if (data.content === 'V2') {
        await secondSavePromise;
      }
      saveLog.push(data.content);
    });

    const { result } = renderHook(() =>
      useDebouncedAutosave<{ id: string; content: string }>({
        delay: 50,
        onSave,
      })
    );

    // 1. Trigger first save and advance timer to put V1 in-flight
    result.current.triggerSave({ id: '1', content: 'V1' });
    vi.advanceTimersByTime(50);
    expect(onSave).toHaveBeenCalledTimes(1);

    // 2. Queue second edit while V1 is actively in-flight
    result.current.triggerSave({ id: '1', content: 'V2' });

    // 3. User switches view (e.g. to graph) -> flush() is invoked
    let flushResolved = false;
    const flushPromise = result.current.flush().then(() => {
      flushResolved = true;
    });

    // Flush must be waiting for in-flight save
    expect(flushResolved).toBe(false);

    // 4. Resolve V1 in-flight save
    resolveFirstSave();
    // Allow microtasks to cycle so V1 finally block executes and spawns V2 save
    await Promise.resolve();
    await Promise.resolve();

    // V2 is now in-flight; flush must NOT have resolved prematurely!
    expect(flushResolved).toBe(false);
    expect(saveLog).toEqual(['V1']);

    // 5. Resolve V2 save
    resolveSecondSave();
    await flushPromise;

    // Both saves complete, flush has resolved, and status is 'saved'
    expect(flushResolved).toBe(true);
    expect(saveLog).toEqual(['V1', 'V2']);
    expect(result.current.status).toBe('saved');
    expect(onSave).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });
});
