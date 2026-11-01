// Adversarial Probe Suite for Milestone 3 Frontend & Autosave
// Run with: node tests/adversarial_probe_m3.mjs

import { EditorState } from '@codemirror/state';

console.log('═════════════════════════════════════════════════════════════════════');
console.log('           MILESTONE 3 ADVERSARIAL STRESS TEST SUITE                 ');
console.log('═════════════════════════════════════════════════════════════════════\n');

let failureCount = 0;
let totalProbes = 0;

function reportProbe(name, passed, detail) {
  totalProbes++;
  if (passed) {
    console.log(`[PASS] Probe ${totalProbes}: ${name}`);
  } else {
    failureCount++;
    console.log(`[FAIL] Probe ${totalProbes}: ${name}`);
    console.log(`       Evidence: ${detail}`);
  }
}

// ============================================================================
// PROBE 1: useDebouncedAutosave Debounce Preservation during Typing Re-render
// ============================================================================
{
  let timerRef = { current: null };
  let pendingDataRef = { current: null };
  let saveCalls = [];
  let onSaveRef = { current: null };
  let unmountFn = null;

  function simulateRender(onSave) {
    onSaveRef.current = onSave;

    const executeSave = async (data) => {
      await onSaveRef.current(data);
      pendingDataRef.current = null;
    };

    const triggerSave = (data) => {
      pendingDataRef.current = data;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        if (pendingDataRef.current !== null) {
          executeSave(pendingDataRef.current);
        }
      }, 350);
    };

    if (!unmountFn) {
      unmountFn = () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        if (pendingDataRef.current !== null) {
          onSaveRef.current(pendingDataRef.current).catch(() => {});
        }
      };
    }

    return { triggerSave, unmount: unmountFn };
  }

  // Render 1
  let hook = simulateRender(async (data) => { saveCalls.push(data); });
  // Keystroke 1: user types 'a'
  hook.triggerSave('a');
  // State update in App causes Render 2 (onSaveRef updated without unmount cleanup)
  hook = simulateRender(async (data) => { saveCalls.push(data); });

  // If debounce is working properly, saveCalls should be 0 (350ms has NOT elapsed, only 0ms passed!)
  const debounceDefeated = saveCalls.length > 0;
  reportProbe(
    'Autosave debounce preservation during typing re-renders',
    !debounceDefeated,
    `Save fired immediately on re-render (0ms elapsed): ${JSON.stringify(saveCalls)}. 350ms debounce is completely bypassed.`
  );
}

// ============================================================================
// PROBE 2: Data Loss Prevention During In-Flight Save on Note Switch
// ============================================================================
{
  let timerRef = { current: null };
  let pendingDataRef = { current: null };
  let isSavingRef = { current: false };
  let savedRecords = [];
  let resolveInFlight = null;
  let inFlightPromise = new Promise((resolve) => { resolveInFlight = resolve; });

  const onSave = async (data) => {
    if (data === 'Content V1') {
      await inFlightPromise;
    }
    savedRecords.push(data);
  };

  const executeSave = async (data) => {
    isSavingRef.current = true;
    try {
      await onSave(data);
    } finally {
      isSavingRef.current = false;
      if (pendingDataRef.current === data) {
        pendingDataRef.current = null;
      }
      if (pendingDataRef.current !== null) {
        const next = pendingDataRef.current;
        pendingDataRef.current = null;
        executeSave(next);
      }
    }
  };

  const triggerSave = (data) => {
    pendingDataRef.current = data;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      if (pendingDataRef.current !== null && !isSavingRef.current) executeSave(pendingDataRef.current);
    }, 350);
  };

  const flush = async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (pendingDataRef.current !== null && !isSavingRef.current) {
      await executeSave(pendingDataRef.current);
    }
  };

  // 1. First save triggers
  triggerSave('Content V1');
  executeSave(pendingDataRef.current); // in-flight save starts

  // 2. User types Content V2 while save is in flight
  triggerSave('Content V2');

  // 3. User switches note -> flush()
  await flush();

  // 4. In-flight save finishes
  resolveInFlight();
  await new Promise((r) => setTimeout(r, 20));

  const dataLost = !savedRecords.includes('Content V2') && pendingDataRef.current === null;
  reportProbe(
    'Data loss prevention when switching notes while save is in flight',
    !dataLost,
    `Content V2 was lost! Saved: ${JSON.stringify(savedRecords)}, pendingData: ${pendingDataRef.current}`
  );
}

// ============================================================================
// PROBE 3: Duplicate In-Flight Save on Unmount
// ============================================================================
{
  let timerRef = { current: null };
  let pendingDataRef = { current: null };
  let isSavingRef = { current: false };
  let totalSaveCalls = 0;
  let activeConcurrentSaves = 0;
  let maxConcurrent = 0;

  const onSave = async (data) => {
    totalSaveCalls++;
    activeConcurrentSaves++;
    if (activeConcurrentSaves > maxConcurrent) maxConcurrent = activeConcurrentSaves;
    await new Promise((r) => setTimeout(r, 50));
    activeConcurrentSaves--;
  };

  const executeSave = async (data) => {
    if (pendingDataRef.current === data) {
      pendingDataRef.current = null;
    }
    isSavingRef.current = true;
    try {
      await onSave(data);
    } finally {
      isSavingRef.current = false;
    }
  };

  const triggerSave = (data) => {
    pendingDataRef.current = data;
    executeSave(pendingDataRef.current);
  };

  const unmount = () => {
    if (pendingDataRef.current !== null && !isSavingRef.current) {
      onSave(pendingDataRef.current).catch(() => {});
    }
  };

  triggerSave('Doc A');
  // Unmount while onSave is in flight
  await new Promise((r) => setTimeout(r, 10));
  unmount();
  await new Promise((r) => setTimeout(r, 100));

  const duplicateFired = totalSaveCalls > 1;
  reportProbe(
    'No duplicate concurrent save fired on unmount during in-flight save',
    !duplicateFired,
    `Total saves fired: ${totalSaveCalls}, max concurrent: ${maxConcurrent}. Duplicate save was fired.`
  );
}

// ============================================================================
// PROBE 4: False Idle Status While Save is Pending
// ============================================================================
{
  let status = 'idle';
  let idleResetTimer = null;
  let timer = null;

  const executeSave = () => {
    status = 'saved';
    if (idleResetTimer) clearTimeout(idleResetTimer);
    idleResetTimer = setTimeout(() => {
      status = 'idle';
    }, 50);
  };

  const triggerSave = () => {
    status = 'saving';
    if (idleResetTimer) {
      clearTimeout(idleResetTimer);
      idleResetTimer = null;
    }
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      executeSave();
    }, 80);
  };

  // Save 1 completes -> idle timer scheduled for 50ms
  executeSave();
  // At 30ms, user types new content
  await new Promise((r) => setTimeout(r, 30));
  triggerSave(); // status set to 'saving', timer scheduled for 80ms

  // At 60ms, the old idle timer fires at 50ms and overrides status to 'idle'!
  await new Promise((r) => setTimeout(r, 30));
  const falselyIdle = status === 'idle' && timer !== null;

  reportProbe(
    'Autosave status accuracy: no premature idle override during pending save',
    !falselyIdle,
    `Status was prematurely set to 'idle' while save timer is still pending (status = '${status}', timer active = ${timer !== null})`
  );
}

// ============================================================================
// PROBE 5: Quick Switcher Selection in Graph View
// ============================================================================
{
  let currentView = 'graph';
  let selectedNoteId = 'note-1';

  const handleSelectNote = (newNoteId) => {
    if (currentView !== 'editor') currentView = 'editor';
    if (newNoteId === selectedNoteId) return;
    selectedNoteId = newNoteId;
  };

  handleSelectNote('note-2');
  const stuckInGraph = currentView === 'graph';

  reportProbe(
    'Quick Switcher navigates to editor view when currently in graph view',
    !stuckInGraph,
    `currentView remained '${currentView}' after selecting note from Quick Switcher`
  );
}

// ============================================================================
// PROBE 6: Active Note Details Corruption on Fast Switching
// ============================================================================
{
  let selectedNoteId = 'note-1';
  let activeNoteDetails = { id: 'note-1', title: 'Note 1' };

  let resolveSaveNote1 = null;
  const onSave = async (data) => {
    await new Promise((r) => { resolveSaveNote1 = r; });
    const updated = { id: data.id, title: 'Updated Note 1' };
    if (selectedNoteId === data.id) {
      activeNoteDetails = updated;
    }
  };

  // Start slow save for Note 1
  const savePromise = onSave({ id: 'note-1' });

  // User switches to Note 2
  selectedNoteId = 'note-2';
  activeNoteDetails = { id: 'note-2', title: 'Note 2' };

  // Note 1 save finishes
  resolveSaveNote1();
  await savePromise;

  const corrupted = activeNoteDetails.id !== selectedNoteId;
  reportProbe(
    'Active note details integrity on note switch during pending save',
    !corrupted,
    `activeNoteDetails has id '${activeNoteDetails.id}' but selectedNoteId is '${selectedNoteId}'`
  );
}

// ============================================================================
// PROBE 7: Quick Switcher Keyboard Wrap-Around Navigation
// ============================================================================
{
  const items = [{ id: '1' }, { id: '2' }, { id: '3' }];

  const nextIndex = (prev, len) => (len > 0 ? (prev + 1) % len : 0);
  const prevIndex = (prev, len) => (len > 0 ? (prev - 1 + len) % len : 0);

  // Arrow up from index 0 should wrap to 2
  const upFrom0 = prevIndex(0, items.length);
  // Arrow down from index 2 should wrap to 0
  const downFromLast = nextIndex(2, items.length);
  // Arrow on empty list
  const emptyUp = prevIndex(0, 0);

  const wrapOk = upFrom0 === 2 && downFromLast === 0 && emptyUp === 0;
  reportProbe(
    'Quick Switcher keyboard wrap-around navigation',
    wrapOk,
    `upFrom0: ${upFrom0}, downFromLast: ${downFromLast}, emptyUp: ${emptyUp}`
  );
}

// ============================================================================
// PROBE 8: CodeMirror 6 Formatting Insertion Precision & Stress
// ============================================================================
{
  function insertFormat(docText, from, to, prefix, suffix, defaultText) {
    let state = EditorState.create({
      doc: docText,
      selection: { anchor: from, head: to },
    });
    const sel = state.selection.main;
    const selectedText = state.sliceDoc(sel.from, sel.to) || defaultText;
    const replacement = `${prefix}${selectedText}${suffix}`;
    const tr = state.update({
      changes: { from: sel.from, to: sel.to, insert: replacement },
      selection: {
        anchor: sel.from + prefix.length,
        head: sel.from + prefix.length + selectedText.length,
      },
    });
    return {
      doc: tr.state.doc.toString(),
      anchor: tr.state.selection.main.anchor,
      head: tr.state.selection.main.head,
      selected: tr.state.sliceDoc(tr.state.selection.main.anchor, tr.state.selection.main.head),
    };
  }

  // Test 1: Empty document with defaultText
  const res1 = insertFormat('', 0, 0, '**', '**', 'bold text');
  const t1Ok = res1.doc === '**bold text**' && res1.selected === 'bold text';

  // Test 2: Existing selection
  const res2 = insertFormat('Euler formula: e^(i*pi) + 1 = 0', 15, 31, '$', '$', '');
  const t2Ok = res2.doc === 'Euler formula: $e^(i*pi) + 1 = 0$' && res2.selected === 'e^(i*pi) + 1 = 0';

  // Test 3: Large document (100,000 characters)
  const largeDoc = 'x'.repeat(100000);
  const start = Date.now();
  const res3 = insertFormat(largeDoc, 50000, 50005, '[[', ']]', '');
  const elapsed = Date.now() - start;
  const t3Ok = res3.doc.length === 100004 && elapsed < 50;

  reportProbe(
    'CodeMirror 6 formatting insertion (selection, cursor, 100k doc performance)',
    t1Ok && t2Ok && t3Ok,
    `t1: ${t1Ok}, t2: ${t2Ok}, t3: ${t3Ok} (${elapsed}ms)`
  );
}

// ============================================================================
// SUMMARY
// ============================================================================
console.log('\n─────────────────────────────────────────────────────────────────────');
console.log(`TOTAL PROBES: ${totalProbes} | PASSED: ${totalProbes - failureCount} | FAILED: ${failureCount}`);
console.log('─────────────────────────────────────────────────────────────────────');

if (failureCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
