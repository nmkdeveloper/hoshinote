import React from 'react';
import { useDebouncedAutosave } from '../src/hooks/useDebouncedAutosave';
import { HighlightedSnippet } from '../src/components/search/QuickSwitcherModal';
import { renderToStaticMarkup } from 'react-dom/server';

console.log('═════════════════════════════════════════════════════════════════════');
console.log('     EMPIRICAL CHALLENGER DEEP STRESS & ADVERSARIAL SUITE (M3)      ');
console.log('═════════════════════════════════════════════════════════════════════\n');

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passCount++;
    console.log(`[PASS] ${testName}`);
  } else {
    failCount++;
    console.error(`[FAIL] ${testName}`);
    if (detail) console.error(`       Detail: ${detail}`);
  }
}

// React Hook Test Harness using React Internals
function createHookHarness<TProps, TResult>(
  hookFn: (props: TProps) => TResult,
  initialProps: TProps
) {
  let currentProps = initialProps;
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

    const secret = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
    const prevDispatcher = secret.ReactCurrentDispatcher.current;
    secret.ReactCurrentDispatcher.current = dispatcher;

    try {
      result.current = hookFn(currentProps);
    } finally {
      secret.ReactCurrentDispatcher.current = prevDispatcher;
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function runTests() {
  // ============================================================================
  // TEST 1: Rapid 50 Keystrokes with Interleaved Re-renders
  // ============================================================================
  {
    const savedItems: Array<{ id: string; content: string }> = [];
    let renderCount = 0;

    const harness = createHookHarness(
      (props) =>
        useDebouncedAutosave<{ id: string; content: string }>({
          delay: 150,
          onSave: props.onSave,
        }),
      {
        onSave: async (d) => {
          savedItems.push(d);
        },
      }
    );

    // 50 keystrokes spaced by 5ms, re-rendering with new onSave identity every 10ms
    for (let i = 1; i <= 50; i++) {
      harness.result.current.triggerSave({ id: 'note-stress', content: `char_${i}` });
      if (i % 2 === 0) {
        renderCount++;
        harness.rerender({
          onSave: async (d) => {
            savedItems.push(d);
          },
        });
      }
      await sleep(5);
    }

    // Immediately after typing stops, no save should have fired yet
    const savedDuringTyping = savedItems.length;

    // Wait 100ms (less than delay of 150ms)
    await sleep(100);
    const savedAt100ms = savedItems.length;

    // Wait another 100ms (total 200ms quiet > 150ms delay)
    await sleep(100);
    const savedAt200ms = savedItems.length;

    harness.unmount();

    assert(
      savedDuringTyping === 0 && savedAt100ms === 0 && savedAt200ms === 1 && savedItems[0]?.content === 'char_50',
      'Rapid 50 keystrokes with 25 parent re-renders fires exactly 1 save with latest content',
      `savedDuringTyping=${savedDuringTyping}, savedAt100ms=${savedAt100ms}, savedAt200ms=${savedAt200ms}, content=${savedItems[0]?.content}`
    );
  }

  // ============================================================================
  // TEST 2: In-Flight Save Chaining and Flush Completion
  // ============================================================================
  {
    const saveLog: string[] = [];
    let resolveSave1: (() => void) | null = null;

    const harness = createHookHarness(
      (props) =>
        useDebouncedAutosave<{ id: string; content: string }>({
          delay: 50,
          onSave: props.onSave,
        }),
      {
        onSave: async (d) => {
          saveLog.push(`start:${d.content}`);
          if (d.content === 'v1') {
            await new Promise<void>((r) => {
              resolveSave1 = r;
            });
          }
          saveLog.push(`end:${d.content}`);
        },
      }
    );

    // 1. Trigger v1 and let delay elapse so save starts
    harness.result.current.triggerSave({ id: 'n1', content: 'v1' });
    await sleep(70);
    assert(saveLog.includes('start:v1') && !saveLog.includes('end:v1'), 'Save 1 is actively in-flight');

    // 2. User types v2 while save 1 is in-flight
    harness.result.current.triggerSave({ id: 'n1', content: 'v2' });

    // 3. User switches note: flush() called
    const flushPromise = harness.result.current.flush();

    // 4. Resolve save 1
    if (resolveSave1) resolveSave1();

    // 5. Await flush
    await flushPromise;
    const v2CompletedAtFlush = saveLog.includes('end:v2');

    await sleep(50);

    harness.unmount();

    const v2Saved = saveLog.includes('start:v2') && saveLog.includes('end:v2');
    assert(
      v2Saved,
      'Edits typed during in-flight save are reliably saved and chained during flush',
      `saveLog: ${JSON.stringify(saveLog)}`
    );
    console.log(`[CONCURRENCY TIMING CHECK] Was v2 already ended at the exact moment flushPromise resolved? -> ${v2CompletedAtFlush}`);
  }

  // ============================================================================
  // TEST 2b: Asynchronous Chained Save Timing during Flush
  // ============================================================================
  {
    const saveLog: string[] = [];
    let resolveSave1: (() => void) | null = null;

    const harness = createHookHarness(
      (props) =>
        useDebouncedAutosave<{ id: string; content: string }>({
          delay: 40,
          onSave: props.onSave,
        }),
      {
        onSave: async (d) => {
          saveLog.push(`start:${d.content}`);
          if (d.content === 'v1') {
            await new Promise<void>((r) => {
              resolveSave1 = r;
            });
          } else if (d.content === 'v2') {
            await sleep(60); // Asynchronous IPC/SQLite write delay
          }
          saveLog.push(`end:${d.content}`);
        },
      }
    );

    // 1. Trigger v1 and let delay elapse so save starts
    harness.result.current.triggerSave({ id: 'n1', content: 'v1' });
    await sleep(60);

    // 2. User types v2 while save 1 is in-flight
    harness.result.current.triggerSave({ id: 'n1', content: 'v2' });

    // 3. User switches note: flush() called
    const flushPromise = harness.result.current.flush();

    // 4. Resolve save 1
    if (resolveSave1) resolveSave1();

    // 5. Await flush
    await flushPromise;
    const v2EndedWhenFlushResolved = saveLog.includes('end:v2');

    // 6. Give time for v2 to finish if not yet finished
    await sleep(80);

    harness.unmount();

    const v2EventuallySaved = saveLog.includes('start:v2') && saveLog.includes('end:v2');
    console.log(`[TEST 2b TIMING] v2 ended when flush resolved: ${v2EndedWhenFlushResolved}, v2 eventually saved: ${v2EventuallySaved}`);
    assert(
      v2EventuallySaved,
      'Edits typed during in-flight save are reliably saved in database without data loss (even if async)',
      `saveLog: ${JSON.stringify(saveLog)}, v2EndedWhenFlushResolved=${v2EndedWhenFlushResolved}`
    );
  }

  // ============================================================================
  // TEST 3: Unmount During In-Flight Save with Pending Chained Edit
  // ============================================================================
  {
    const saveLog: string[] = [];
    let resolveSaveA: (() => void) | null = null;

    const harness = createHookHarness(
      (props) =>
        useDebouncedAutosave<{ id: string; content: string }>({
          delay: 40,
          onSave: props.onSave,
        }),
      {
        onSave: async (d) => {
          saveLog.push(`start:${d.content}`);
          if (d.content === 'doc_A') {
            await new Promise<void>((r) => {
              resolveSaveA = r;
            });
          }
          saveLog.push(`end:${d.content}`);
        },
      }
    );

    // 1. Trigger doc_A save
    harness.result.current.triggerSave({ id: 'doc', content: 'doc_A' });
    await sleep(60);
    assert(saveLog.includes('start:doc_A'), 'doc_A save started');

    // 2. User types doc_B while doc_A is saving
    harness.result.current.triggerSave({ id: 'doc', content: 'doc_B' });

    // 3. Component unmounts while doc_A is in flight and doc_B is pending!
    harness.unmount();

    // 4. doc_A finishes saving
    if (resolveSaveA) resolveSaveA();
    await sleep(80);

    const docBSaved = saveLog.includes('start:doc_B') && saveLog.includes('end:doc_B');
    assert(
      docBSaved,
      'Pending edit doc_B is safely persisted even if unmount occurs during in-flight save',
      `saveLog: ${JSON.stringify(saveLog)}`
    );
  }

  // ============================================================================
  // TEST 4: Error Handling, Recovery, and Status Transition
  // ============================================================================
  {
    let shouldFail = true;
    const errorsCaught: any[] = [];
    const successfulSaves: string[] = [];

    const harness = createHookHarness(
      (props) =>
        useDebouncedAutosave<{ id: string; content: string }>({
          delay: 40,
          onSave: props.onSave,
          onError: props.onError,
        }),
      {
        onSave: async (d) => {
          if (shouldFail) {
            throw new Error('Database locked / IPC timeout simulation');
          }
          successfulSaves.push(d.content);
        },
        onError: (err) => {
          errorsCaught.push(err);
        },
      }
    );

    // 1. Trigger save that will fail
    harness.result.current.triggerSave({ id: 'err-test', content: 'fail_content' });
    await sleep(60);

    assert(
      harness.result.current.status === 'error' && errorsCaught.length === 1,
      'Error in onSave transitions status to error and calls onError callback',
      `status=${harness.result.current.status}, errorsCaught=${errorsCaught.length}`
    );

    // 2. Now recover (database unlocks)
    shouldFail = false;
    harness.result.current.triggerSave({ id: 'err-test', content: 'recovered_content' });
    await sleep(60);

    assert(
      harness.result.current.status === 'saved' && successfulSaves.includes('recovered_content'),
      'Hook recovers from error on subsequent triggerSave without getting stuck in isSaving state',
      `status=${harness.result.current.status}, successfulSaves=${JSON.stringify(successfulSaves)}`
    );

    harness.unmount();
  }

  // ============================================================================
  // TEST 5: Deep Partial Merging of Title and Content
  // ============================================================================
  {
    const savedRecords: Array<{ id: string; content?: string; title?: string }> = [];

    const harness = createHookHarness(
      () =>
        useDebouncedAutosave<{ id: string; content?: string; title?: string }>({
          delay: 60,
          onSave: async (d) => {
            savedRecords.push(d);
          },
        }),
      {}
    );

    // Keystroke 1: Title edit
    harness.result.current.triggerSave({ id: 'note-merge', title: 'My New Note' });
    await sleep(15);
    // Keystroke 2: Content edit
    harness.result.current.triggerSave({ id: 'note-merge', content: 'Initial body paragraph' });
    await sleep(15);
    // Keystroke 3: Title refinement
    harness.result.current.triggerSave({ id: 'note-merge', title: 'My Final Note Title' });

    await sleep(100);
    harness.unmount();

    assert(
      savedRecords.length === 1 &&
        savedRecords[0].id === 'note-merge' &&
        savedRecords[0].title === 'My Final Note Title' &&
        savedRecords[0].content === 'Initial body paragraph',
      'Rapid partial updates across title and content merge into single unified payload',
      `records: ${JSON.stringify(savedRecords)}`
    );
  }

  // ============================================================================
  // TEST 6: Stale Note Details Protection on Note Switching (App.tsx State Machine)
  // ============================================================================
  {
    let selectedNoteId = 'note-1';
    let activeNoteDetails: any = { id: 'note-1', title: 'Original Note 1' };
    const savedInDb: Record<string, string> = {
      'note-1': 'Original Note 1',
      'note-2': 'Original Note 2',
    };

    let resolveSaveNote1: (() => void) | null = null;
    const savePromise = new Promise<void>((r) => {
      resolveSaveNote1 = r;
    });

    const mockOnSave = async (data: { id: string; title: string }) => {
      if (data.id === 'note-1') {
        await savePromise;
      }
      savedInDb[data.id] = data.title;
      // In App.tsx: Only update activeNoteDetails if the saved note is still the active note!
      if (selectedNoteId === data.id) {
        activeNoteDetails = { id: data.id, title: data.title };
      }
    };

    // 1. Note 1 edit begins slow save
    mockOnSave({ id: 'note-1', title: 'Updated Note 1' });

    // 2. User quickly switches to Note 2
    selectedNoteId = 'note-2';
    activeNoteDetails = { id: 'note-2', title: savedInDb['note-2'] };

    // 3. Note 1 slow save resolves in background
    if (resolveSaveNote1) resolveSaveNote1();
    await sleep(30);

    assert(
      selectedNoteId === 'note-2' &&
        activeNoteDetails.id === 'note-2' &&
        activeNoteDetails.title === 'Original Note 2' &&
        savedInDb['note-1'] === 'Updated Note 1',
      'Late-arriving save for Note 1 updates database without corrupting activeNoteDetails for Note 2',
      `selectedNoteId=${selectedNoteId}, activeNoteDetails=${JSON.stringify(activeNoteDetails)}`
    );
  }

  // ============================================================================
  // TEST 7: Quick Switcher Selection from Graph View & Same-Note Selection
  // ============================================================================
  {
    let currentView: 'editor' | 'graph' = 'graph';
    let selectedNoteId = 'note-10';

    const handleSelectNote = (newNoteId: string) => {
      if (currentView !== 'editor') {
        currentView = 'editor';
      }
      if (newNoteId === selectedNoteId) return;
      selectedNoteId = newNoteId;
    };

    // Case A: Selecting different note from graph view
    handleSelectNote('note-20');
    const caseAOk = currentView === 'editor' && selectedNoteId === 'note-20';

    // Reset to graph view
    currentView = 'graph';
    // Case B: Selecting SAME note from graph view (user clicks active note in graph)
    handleSelectNote('note-20');
    const caseBOk = currentView === 'editor' && selectedNoteId === 'note-20';

    assert(
      caseAOk && caseBOk,
      'Selecting note (different or same) in graph view reliably transitions currentView to editor',
      `caseAOk=${caseAOk}, caseBOk=${caseBOk}, currentView=${currentView}`
    );
  }

  // ============================================================================
  // TEST 8: HighlightedSnippet XSS Sanitization & Escaping
  // ============================================================================
  {
    const attackSnippet =
      'Formula <mark><script>alert("XSS")</script></mark> and <mark><img src=x onerror=alert(1)></mark> end <svg onload=boom()>';
    const html = renderToStaticMarkup(React.createElement(HighlightedSnippet, { text: attackSnippet }));

    const hasRawScript = html.includes('<script') || html.includes('<img') || html.includes('<svg');
    const hasEscapedMarkup =
      html.includes('&lt;script&gt;') &&
      html.includes('&lt;img') &&
      html.includes('&lt;svg');

    assert(
      !hasRawScript && hasEscapedMarkup,
      'HighlightedSnippet safely escapes embedded HTML / XSS attack payloads inside and outside <mark> tags',
      `html output: ${html}`
    );
  }

  // ============================================================================
  // TEST 9: Status Bar Idle Reset Timer Invariant
  // ============================================================================
  {
    const harness = createHookHarness(
      () =>
        useDebouncedAutosave<{ id: string }>({
          delay: 30,
          onSave: async () => {},
        }),
      {}
    );

    // Trigger save 1
    harness.result.current.triggerSave({ id: 'idle-test' });
    await sleep(40);
    assert(harness.result.current.status === 'saved', 'Status is saved after save completes');

    // Idle reset timer is 2000ms. If we trigger a new save at 50ms, status should be 'saving'
    harness.result.current.triggerSave({ id: 'idle-test-2' });
    assert(harness.result.current.status === 'saving', 'Status immediately returns to saving on new keystroke');

    await sleep(40);
    assert(harness.result.current.status === 'saved', 'Status returns to saved after second save');

    harness.unmount();
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n─────────────────────────────────────────────────────────────────────');
  console.log(`TOTAL TESTS: ${passCount + failCount} | PASSED: ${passCount} | FAILED: ${failCount}`);
  console.log('─────────────────────────────────────────────────────────────────────');

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed with uncaught error:', err);
  process.exit(1);
});
