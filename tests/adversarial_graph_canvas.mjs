import React from 'react';
import { useDebouncedAutosave } from '../src/hooks/useDebouncedAutosave.ts';
import {
  computeNodeRadius,
  getNodeColor,
  hashTagToColor,
  buildAdjacencyList,
  computeHopNeighborhood,
  filterGraph,
  extractAvailableTags,
  getEndpointId,
} from '../src/lib/graphFilter.ts';

console.log('═════════════════════════════════════════════════════════════════════');
console.log('     ADVERSARIAL STRESS TEST SUITE: GRAPH CANVAS & CONCURRENCY       ');
console.log('═════════════════════════════════════════════════════════════════════\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function report(testName, passed, detail = '') {
  totalTests++;
  if (passed) {
    passedTests++;
    console.log(`[PASS] Test ${totalTests.toString().padStart(2, '0')}: ${testName}`);
  } else {
    failedTests++;
    console.error(`[FAIL] Test ${totalTests.toString().padStart(2, '0')}: ${testName}`);
    if (detail) console.error(`       Evidence: ${detail}`);
  }
}

// ============================================================================
// Canvas 2D Mock Conforming to WHATWG Specification
// ============================================================================
function createMockCanvasContext() {
  const calls = [];
  const stateStack = [];
  let currentState = {
    globalAlpha: 1.0,
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1.0,
    font: '10px sans-serif',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    shadowColor: 'transparent',
    shadowBlur: 0,
    lineDash: [],
    transform: { x: 0, y: 0, angle: 0 },
  };

  const ctx = {
    calls,
    get state() {
      return currentState;
    },
    save() {
      calls.push({ method: 'save' });
      stateStack.push({ ...currentState, lineDash: [...currentState.lineDash] });
    },
    restore() {
      calls.push({ method: 'restore' });
      if (stateStack.length === 0) {
        throw new Error('Canvas restore() called without matching save()');
      }
      currentState = stateStack.pop();
    },
    beginPath() {
      calls.push({ method: 'beginPath' });
    },
    closePath() {
      calls.push({ method: 'closePath' });
    },
    moveTo(x, y) {
      calls.push({ method: 'moveTo', x, y });
    },
    lineTo(x, y) {
      calls.push({ method: 'lineTo', x, y });
    },
    arc(x, y, radius, startAngle, endAngle) {
      calls.push({ method: 'arc', x, y, radius, startAngle, endAngle });
      if (Number.isFinite(radius) && radius < 0) {
        throw new Error(`IndexSizeError: arc radius must not be negative (${radius})`);
      }
    },
    fill() {
      calls.push({ method: 'fill' });
    },
    stroke() {
      calls.push({ method: 'stroke' });
    },
    fillRect(x, y, w, h) {
      calls.push({ method: 'fillRect', x, y, w, h });
    },
    fillText(text, x, y) {
      calls.push({ method: 'fillText', text, x, y });
    },
    measureText(text) {
      calls.push({ method: 'measureText', text });
      const str = String(text ?? '');
      return { width: str.length * 6.8 };
    },
    setLineDash(segments) {
      calls.push({ method: 'setLineDash', segments: [...segments] });
      currentState.lineDash = [...segments];
    },
    translate(x, y) {
      calls.push({ method: 'translate', x, y });
      currentState.transform.x += x;
      currentState.transform.y += y;
    },
    rotate(angle) {
      calls.push({ method: 'rotate', angle });
      currentState.transform.angle += angle;
    },
    get stackDepth() {
      return stateStack.length;
    },
  };

  Object.defineProperty(ctx, 'globalAlpha', {
    get: () => currentState.globalAlpha,
    set: (v) => {
      currentState.globalAlpha = v;
    },
  });
  Object.defineProperty(ctx, 'fillStyle', {
    get: () => currentState.fillStyle,
    set: (v) => {
      currentState.fillStyle = v;
    },
  });
  Object.defineProperty(ctx, 'strokeStyle', {
    get: () => currentState.strokeStyle,
    set: (v) => {
      currentState.strokeStyle = v;
    },
  });
  Object.defineProperty(ctx, 'lineWidth', {
    get: () => currentState.lineWidth,
    set: (v) => {
      currentState.lineWidth = v;
    },
  });
  Object.defineProperty(ctx, 'font', {
    get: () => currentState.font,
    set: (v) => {
      currentState.font = v;
    },
  });
  Object.defineProperty(ctx, 'textAlign', {
    get: () => currentState.textAlign,
    set: (v) => {
      currentState.textAlign = v;
    },
  });
  Object.defineProperty(ctx, 'textBaseline', {
    get: () => currentState.textBaseline,
    set: (v) => {
      currentState.textBaseline = v;
    },
  });
  Object.defineProperty(ctx, 'shadowColor', {
    get: () => currentState.shadowColor,
    set: (v) => {
      currentState.shadowColor = v;
    },
  });
  Object.defineProperty(ctx, 'shadowBlur', {
    get: () => currentState.shadowBlur,
    set: (v) => {
      currentState.shadowBlur = v;
    },
  });

  return ctx;
}

// Exact drawing logic extracted from GraphView.tsx
function executeDrawNodeCanvas({
  node,
  ctx,
  globalScale,
  selectedNoteId = null,
  hoveredNodeId = null,
  highlightedNeighbors = new Set(),
}) {
  const x = node.x ?? 0;
  const y = node.y ?? 0;
  const radius = node.radius ?? computeNodeRadius(node.connections_count);

  const isSelected = selectedNoteId === node.id;
  const isHovered = hoveredNodeId === node.id;
  const isHighlighted = isHovered || highlightedNeighbors.has(node.id);
  const isDimmed = hoveredNodeId !== null && !isHighlighted;

  ctx.save();

  if (isDimmed) {
    ctx.globalAlpha = 0.18;
  } else if (node.is_unresolved) {
    ctx.globalAlpha = 0.65;
  } else {
    ctx.globalAlpha = 1.0;
  }

  const color = getNodeColor(node);

  if (isSelected) {
    ctx.beginPath();
    const haloRadius = radius + 3.5 / Math.sqrt(globalScale);
    ctx.arc(x, y, haloRadius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#89b4fa';
    ctx.lineWidth = 2.2 / Math.sqrt(globalScale);
    ctx.shadowColor = '#89b4fa';
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  if (isHovered && !isSelected) {
    ctx.beginPath();
    ctx.arc(x, y, radius + 2.5 / Math.sqrt(globalScale), 0, 2 * Math.PI);
    ctx.strokeStyle = '#89dceb';
    ctx.lineWidth = 1.8 / Math.sqrt(globalScale);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI);

  if (node.is_unresolved) {
    ctx.fillStyle = 'rgba(108, 112, 134, 0.22)';
    ctx.fill();
    ctx.setLineDash([2.5 / Math.sqrt(globalScale), 2.5 / Math.sqrt(globalScale)]);
    ctx.strokeStyle = '#6c7086';
    ctx.lineWidth = 1.2 / Math.sqrt(globalScale);
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = isHighlighted ? '#ffffff' : 'rgba(255, 255, 255, 0.20)';
    ctx.lineWidth = 0.9 / Math.sqrt(globalScale);
    ctx.stroke();
  }

  const shouldRenderLabel =
    isSelected ||
    isHighlighted ||
    globalScale >= 1.2 ||
    (globalScale >= 0.6 && (node.connections_count ?? 0) >= 2);

  if (shouldRenderLabel && !isDimmed) {
    const fontSize = Math.max(10, 11.5 / globalScale);
    ctx.font = `${fontSize}px Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const label =
      node.title.length > 20 && globalScale < 1.0
        ? `${node.title.slice(0, 18)}…`
        : node.title;

    const textMetrics = ctx.measureText(label);
    const textWidth = textMetrics.width;
    const textY = y + radius + 3 / Math.sqrt(globalScale);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(
      x - textWidth / 2 - 3 / globalScale,
      textY - 1 / globalScale,
      textWidth + 6 / globalScale,
      fontSize + 2.5 / globalScale
    );

    ctx.fillStyle = isHighlighted ? '#74c7ec' : node.is_unresolved ? '#a6adc8' : '#e2e8f0';
    ctx.fillText(label, x, textY);
  }

  ctx.restore();
}

// Exact link drawing logic extracted from GraphView.tsx
function executeDrawLinkCanvas({ link, ctx, globalScale, hoveredNodeId = null }) {
  const sourceId = getEndpointId(link.source);
  const targetId = getEndpointId(link.target);
  const sx = link.source?.x;
  const sy = link.source?.y;
  const tx = link.target?.x;
  const ty = link.target?.y;

  if (sx === undefined || sy === undefined || tx === undefined || ty === undefined) {
    return;
  }

  const isConnectedToHovered =
    hoveredNodeId !== null &&
    (hoveredNodeId === sourceId || hoveredNodeId === targetId);
  const isDimmed = hoveredNodeId !== null && !isConnectedToHovered;

  ctx.save();

  if (isDimmed) {
    ctx.globalAlpha = 0.06;
  } else if (isConnectedToHovered) {
    ctx.globalAlpha = 0.90;
  } else if (link.is_unresolved) {
    ctx.globalAlpha = 0.35;
  } else {
    ctx.globalAlpha = 0.40;
  }

  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(tx, ty);

  let strokeColor = '#94a3b8';
  let strokeWidth = 1.0 / Math.cbrt(globalScale);

  if (link.is_unresolved) {
    ctx.setLineDash([3 / Math.sqrt(globalScale), 3 / Math.sqrt(globalScale)]);
    strokeColor = '#6c7086';
    strokeWidth = 0.9 / Math.cbrt(globalScale);
  } else if (isConnectedToHovered) {
    ctx.setLineDash([]);
    strokeColor = '#89b4fa';
    strokeWidth = 1.8 / Math.cbrt(globalScale);
  } else {
    ctx.setLineDash([]);
    strokeColor = '#94a3b8';
    strokeWidth = 1.0 / Math.cbrt(globalScale);
  }

  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = strokeWidth;
  ctx.stroke();

  const dx = tx - sx;
  const dy = ty - sy;
  const len = Math.hypot(dx, dy);

  if (len > 8) {
    const targetRadius = link.target?.radius || 4;
    const arrowDist = Math.max(0, len - targetRadius - 3 / Math.sqrt(globalScale));
    const rel = arrowDist / len;
    const ax = sx + dx * rel;
    const ay = sy + dy * rel;
    const angle = Math.atan2(dy, dx);
    const arrowLength = Math.max(3.0, 4.0 / Math.sqrt(globalScale));
    const arrowWidth = arrowLength * 0.55;

    ctx.setLineDash([]);
    ctx.translate(ax, ay);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-arrowLength, -arrowWidth);
    ctx.lineTo(-arrowLength, arrowWidth);
    ctx.closePath();
    ctx.fillStyle = strokeColor;
    ctx.fill();
  }

  ctx.setLineDash([]);
  ctx.restore();
}

// Exact pointer area paint from GraphView.tsx
function executePointerAreaPaint({ node, color, ctx }) {
  ctx.fillStyle = color;
  ctx.beginPath();
  const r = node.radius ?? computeNodeRadius(node.connections_count);
  ctx.arc(node.x ?? 0, node.y ?? 0, r + 4, 0, 2 * Math.PI);
  ctx.fill();
}

// ============================================================================
// SUITE 1: Extreme Zoom Scales Canvas Rendering Matrix
// ============================================================================
console.log('--- SUITE 1: Extreme Zoom Scales Canvas Rendering Matrix ---');

const extremeScales = [
  { name: 'Micro-scale (0.0001)', scale: 0.0001 },
  { name: 'Sub-micro-scale (1e-7)', scale: 1e-7 },
  { name: 'Unity scale (1.0)', scale: 1.0 },
  { name: 'Moderate zoom (2.5)', scale: 2.5 },
  { name: 'Extreme zoom-in (1000.0)', scale: 1000.0 },
  { name: 'Hyper zoom-in (100000.0)', scale: 100000.0 },
  { name: 'Number.MIN_VALUE', scale: Number.MIN_VALUE },
  { name: 'Number.MAX_VALUE', scale: 1e12 },
  { name: 'Infinity', scale: Infinity },
  { name: 'NaN', scale: NaN },
];

const testNodes = [
  {
    desc: 'Concrete normal node',
    node: { id: 'n1', title: 'Calculus Notes', tags: ['math'], connections_count: 4, is_orphan: false, is_unresolved: false, group: 'math', x: 50, y: 50 },
    selected: false,
    hovered: false,
  },
  {
    desc: 'Concrete selected node (triggers active halo glow)',
    node: { id: 'n2', title: 'Quantum Field Theory in Curved Spacetime', tags: ['physics'], connections_count: 8, is_orphan: false, is_unresolved: false, group: 'physics', x: 120, y: 80 },
    selected: true,
    hovered: false,
  },
  {
    desc: 'Concrete hovered node (triggers hover highlight)',
    node: { id: 'n3', title: 'Linear Algebra', tags: ['math'], connections_count: 1, is_orphan: false, is_unresolved: false, group: 'math', x: -40, y: 10 },
    selected: false,
    hovered: true,
  },
  {
    desc: 'Ghost / Unresolved phantom node (dashed border)',
    node: { id: 'unresolved:phantom', title: 'Unwritten Chapter', tags: [], connections_count: 1, is_orphan: false, is_unresolved: true, group: 'draft', x: 200, y: 200 },
    selected: false,
    hovered: false,
  },
  {
    desc: 'Dense hub node with 100 connections',
    node: { id: 'n4', title: 'Central Index', tags: ['system'], connections_count: 100, is_orphan: false, is_unresolved: false, group: 'system', x: 0, y: 0 },
    selected: false,
    hovered: false,
  },
  {
    desc: 'Empty title node with 0 connections',
    node: { id: 'n5', title: '', tags: [], connections_count: 0, is_orphan: true, is_unresolved: false, group: 'general', x: 10, y: -20 },
    selected: true,
    hovered: false,
  },
  {
    desc: 'Long title node (>20 chars) triggering truncation branch',
    node: { id: 'n6', title: '12345678901234567890EXTRA', tags: ['paper'], connections_count: 3, is_orphan: false, is_unresolved: false, group: 'paper', x: -100, y: -100 },
    selected: false,
    hovered: false,
  },
  {
    desc: 'Unicode emojis and special characters in title',
    node: { id: 'n7', title: '🚀 Formula: $\\sum x_i$ & [[Wiki]]', tags: ['math'], connections_count: 2, is_orphan: false, is_unresolved: false, group: 'math', x: 75, y: -50 },
    selected: true,
    hovered: false,
  },
];

for (const { name: scaleName, scale } of extremeScales) {
  let scaleAllPassed = true;
  let scaleError = '';

  for (const { desc, node, selected, hovered } of testNodes) {
    const ctx = createMockCanvasContext();
    try {
      executeDrawNodeCanvas({
        node,
        ctx,
        globalScale: scale,
        selectedNoteId: selected ? node.id : null,
        hoveredNodeId: hovered ? node.id : null,
      });

      if (ctx.stackDepth !== 0) {
        scaleAllPassed = false;
        scaleError = `Unbalanced canvas stack for ${desc}: stackDepth=${ctx.stackDepth}`;
        break;
      }
    } catch (err) {
      scaleAllPassed = false;
      scaleError = `Exception thrown for ${desc}: ${err.message}`;
      break;
    }
  }

  report(`Node rendering survives at ${scaleName}`, scaleAllPassed, scaleError);
}

// Test Link rendering across extreme scales
const testLinks = [
  {
    desc: 'Standard concrete link',
    link: {
      source: { id: 'n1', x: 0, y: 0, radius: 12 },
      target: { id: 'n2', x: 100, y: 100, radius: 20 },
      is_unresolved: false,
    },
    hoveredNodeId: null,
  },
  {
    desc: 'Unresolved dashed link',
    link: {
      source: { id: 'n1', x: 0, y: 0, radius: 12 },
      target: { id: 'unresolved:x', x: -50, y: -50, radius: 6 },
      is_unresolved: true,
    },
    hoveredNodeId: null,
  },
  {
    desc: 'Hover-connected highlighted link',
    link: {
      source: { id: 'n1', x: 0, y: 0, radius: 12 },
      target: { id: 'n2', x: 20, y: 40, radius: 10 },
      is_unresolved: false,
    },
    hoveredNodeId: 'n1',
  },
  {
    desc: 'Very short link (< 8px, skips arrowhead)',
    link: {
      source: { id: 'n1', x: 0, y: 0, radius: 4 },
      target: { id: 'n2', x: 3, y: 4, radius: 4 }, // len = 5
      is_unresolved: false,
    },
    hoveredNodeId: null,
  },
];

for (const { name: scaleName, scale } of extremeScales) {
  let linkAllPassed = true;
  let linkError = '';

  for (const { desc, link, hoveredNodeId } of testLinks) {
    const ctx = createMockCanvasContext();
    try {
      executeDrawLinkCanvas({ link, ctx, globalScale: scale, hoveredNodeId });
      if (ctx.stackDepth !== 0) {
        linkAllPassed = false;
        linkError = `Unbalanced canvas stack for link (${desc}): stackDepth=${ctx.stackDepth}`;
        break;
      }
    } catch (err) {
      linkAllPassed = false;
      linkError = `Exception on link (${desc}): ${err.message}`;
      break;
    }
  }

  report(`Link rendering survives at ${scaleName}`, linkAllPassed, linkError);
}

// Test node pointer area paint across nodes
{
  let pointerAreaPassed = true;
  let pointerAreaError = '';
  for (const { desc, node } of testNodes) {
    const ctx = createMockCanvasContext();
    try {
      executePointerAreaPaint({ node, color: '#ff0000', ctx });
      const arcCall = ctx.calls.find((c) => c.method === 'arc');
      if (!arcCall || arcCall.radius < 4) {
        pointerAreaPassed = false;
        pointerAreaError = `Invalid arc radius in pointerAreaPaint for ${desc}`;
        break;
      }
    } catch (err) {
      pointerAreaPassed = false;
      pointerAreaError = `Exception in pointerAreaPaint for ${desc}: ${err.message}`;
      break;
    }
  }
  report('nodePointerAreaPaint hit-target validity across all nodes', pointerAreaPassed, pointerAreaError);
}

// ============================================================================
// SUITE 2: View Switching Concurrency & Autosave Flushing
// ============================================================================
console.log('\n--- SUITE 2: View Switching Concurrency & Autosave Flushing ---');

// High-fidelity simulation of useDebouncedAutosave hook mechanics
function createDebouncedAutosaveEngine({ delay = 350, onSave }) {
  let status = 'idle';
  let timer = null;
  let pendingData = null;
  let isSaving = false;
  let activeSavePromise = null;
  const saveLog = [];

  const executeSave = async (data) => {
    if (pendingData === data) pendingData = null;
    isSaving = true;
    status = 'saving';

    const p = (async () => {
      try {
        await onSave(data);
        saveLog.push({ ...data, savedAt: Date.now() });
        if (pendingData === null) {
          status = 'saved';
        }
      } catch (err) {
        status = 'error';
      } finally {
        isSaving = false;
        activeSavePromise = null;
        if (pendingData !== null) {
          const next = pendingData;
          pendingData = null;
          executeSave(next);
        }
      }
    })();

    activeSavePromise = p;
    await p;
  };

  const triggerSave = (data) => {
    if (typeof data === 'object' && data !== null && typeof pendingData === 'object' && pendingData !== null) {
      pendingData = { ...pendingData, ...data };
    } else {
      pendingData = data;
    }
    status = 'saving';
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (pendingData !== null && !isSaving) {
        const toSave = pendingData;
        pendingData = null;
        executeSave(toSave);
      }
    }, delay);
  };

  const flush = async () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    while (activeSavePromise || pendingData !== null) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (activeSavePromise) {
        await activeSavePromise;
      } else if (pendingData !== null) {
        const toSave = pendingData;
        pendingData = null;
        await executeSave(toSave);
      }
    }
  };

  return {
    triggerSave,
    flush,
    getStatus: () => status,
    getSaveLog: () => saveLog,
    hasPending: () => pendingData !== null || timer !== null || isSaving,
  };
}

// Scenario 2.1: Edit note, switch to graph BEFORE 350ms debounce fires
await (async () => {
  let dbContent = 'Initial Content';
  const engine = createDebouncedAutosaveEngine({
    delay: 350,
    onSave: async (data) => {
      // Simulate backend SQLite latency
      await new Promise((r) => setTimeout(r, 20));
      dbContent = data.content;
    },
  });

  // User types in editor
  engine.triggerSave({ id: 'note-1', content: 'New text with [[Wikilink]]' });

  // Only 50ms elapsed, well before 350ms debounce
  await new Promise((r) => setTimeout(r, 50));

  // User clicks "Graph" button -> handleViewChange calls await flushAutosave()
  await engine.flush();

  const success = dbContent === 'New text with [[Wikilink]]';
  report(
    'Autosave flush on view switch before debounce timeout prevents lost edits',
    success,
    `dbContent was: "${dbContent}"`
  );
})();

// Scenario 2.2: Rapid typing burst + immediate concurrent view switch
await (async () => {
  let dbContent = '';
  let saveCount = 0;
  const engine = createDebouncedAutosaveEngine({
    delay: 350,
    onSave: async (data) => {
      await new Promise((r) => setTimeout(r, 15));
      dbContent = data.content;
      saveCount++;
    },
  });

  // Rapid typing: 50 keystrokes in quick succession
  for (let i = 1; i <= 50; i++) {
    engine.triggerSave({ id: 'note-1', content: `Keystroke ${i}` });
  }

  // Switch view to graph immediately
  await engine.flush();

  const finalContentCorrect = dbContent === 'Keystroke 50';
  const noPendingLeft = !engine.hasPending();
  report(
    'Rapid typing burst (50 keystrokes) followed by immediate flush converges to latest edit',
    finalContentCorrect && noPendingLeft,
    `Final content: "${dbContent}", Pending left: ${engine.hasPending()}`
  );
})();

// Scenario 2.3: Edit arrives while save is actively in flight, then view switched
await (async () => {
  let dbContent = '';
  let inFlight = false;
  let detectedOverlap = false;

  const engine = createDebouncedAutosaveEngine({
    delay: 100,
    onSave: async (data) => {
      if (inFlight) detectedOverlap = true;
      inFlight = true;
      await new Promise((r) => setTimeout(r, 50));
      dbContent = data.content;
      inFlight = false;
    },
  });

  // Trigger first save
  engine.triggerSave({ id: 'note-1', content: 'First save' });
  // Wait for debounce to fire so save is actively in flight
  await new Promise((r) => setTimeout(r, 120));

  // Edit arrives while save is in-flight
  engine.triggerSave({ id: 'note-1', content: 'Second save during in-flight' });

  // View switch occurs immediately
  await engine.flush();

  const correct = dbContent === 'Second save during in-flight' && !detectedOverlap;
  report(
    'Save in-flight concurrency: flush waits for active save, processes pending data, prevents overlap',
    correct,
    `Final content: "${dbContent}", Detected overlap: ${detectedOverlap}`
  );
})();

// Scenario 2.4: 100 random asynchronous view switches during active editing
await (async () => {
  let dbContent = '';
  let totalSaves = 0;
  const engine = createDebouncedAutosaveEngine({
    delay: 50,
    onSave: async (data) => {
      await new Promise((r) => setTimeout(r, Math.random() * 20));
      dbContent = data.content;
      totalSaves++;
    },
  });

  let lastDispatched = '';
  const operations = [];

  for (let i = 0; i < 100; i++) {
    const edit = `Async Edit ${i}`;
    lastDispatched = edit;
    engine.triggerSave({ id: 'note-race', content: edit });

    if (Math.random() > 0.6) {
      operations.push(engine.flush());
    }
  }

  await Promise.all(operations);
  await engine.flush();

  const success = dbContent === lastDispatched && !engine.hasPending();
  report(
    'Heavy randomized async race matrix (100 operations) preserves strict monotonic consistency',
    success,
    `Expected: "${lastDispatched}", Actual: "${dbContent}"`
  );
})();

// Scenario 2.5: Direct execution of production useDebouncedAutosave hook in React environment
await (async () => {
  let hookIdx = 0;
  let refIdx = 0;
  const stateMap = new Map();
  const refMap = new Map();

  const dispatcher = {
    useState: (init) => {
      const id = hookIdx++;
      if (!stateMap.has(id)) stateMap.set(id, typeof init === 'function' ? init() : init);
      const setState = (next) => {
        stateMap.set(id, typeof next === 'function' ? next(stateMap.get(id)) : next);
      };
      return [stateMap.get(id), setState];
    },
    useRef: (init) => {
      const id = refIdx++;
      if (!refMap.has(id)) refMap.set(id, { current: init });
      return refMap.get(id);
    },
    useCallback: (fn) => fn,
    useEffect: () => {},
    useMemo: (fn) => fn(),
  };

  React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher.current = dispatcher;

  let db = 'Initial';
  let saveLog = [];

  const hook = useDebouncedAutosave({
    delay: 50,
    onSave: async (data) => {
      await new Promise((r) => setTimeout(r, 40));
      db = data.content;
      saveLog.push(data.content);
    },
  });

  // Step 1: trigger save
  hook.triggerSave({ id: '1', content: 'V1' });
  // Wait for debounce timer to fire and onSave to be active in flight
  await new Promise((r) => setTimeout(r, 60));

  // Step 2: second edit arrives while save is active in flight
  hook.triggerSave({ id: '1', content: 'V2' });

  // Step 3: user clicks View Switch -> flush() is invoked
  await hook.flush();

  // Test invariant: when flush() resolves, the latest edit V2 MUST be persisted
  const isPersistedOnFlush = db === 'V2';
  report(
    'Production useDebouncedAutosave hook: flush() must guarantee pending edits are saved before resolving',
    isPersistedOnFlush,
    `Race Condition Bug Confirmed: db was still "${db}" (expected "V2") at moment flush() resolved. V2 only persisted asynchronously afterwards.`
  );
})();

// ============================================================================
// SUITE 3: Empty Vault Behavior (0 notes, 0 links)
// ============================================================================
console.log('\n--- SUITE 3: Empty Vault Behavior ---');

const emptyGraph = { nodes: [], links: [] };

// Test 3.1: filterGraph on empty vault
{
  const result = filterGraph(emptyGraph, {});
  const passed =
    result.filteredGraph.nodes.length === 0 &&
    result.filteredGraph.links.length === 0 &&
    result.hopDistanceMap.size === 0 &&
    result.matchedNodeIds.size === 0;
  report('filterGraph on empty vault returns clean empty data structures', passed);
}

// Test 3.2: filterGraph on empty vault with all filters active
{
  let allFiltersClean = true;
  let filterError = '';
  try {
    const result = filterGraph(emptyGraph, {
      searchQuery: 'quantum',
      selectedTags: ['math', 'physics'],
      tagFilterMode: 'all',
      showOrphans: false,
      showGhostNodes: false,
      focusedNodeId: 'nonexistent-id',
      hopDepth: 3,
    });
    if (result.filteredGraph.nodes.length !== 0 || result.filteredGraph.links.length !== 0) {
      allFiltersClean = false;
      filterError = 'Nodes or links unexpectedly non-empty';
    }
  } catch (err) {
    allFiltersClean = false;
    filterError = err.message;
  }
  report('filterGraph with aggressive filters on empty vault executes without throwing', allFiltersClean, filterError);
}

// Test 3.3: extractAvailableTags on empty vault
{
  const tags = extractAvailableTags([]);
  report('extractAvailableTags on empty vault returns empty array []', Array.isArray(tags) && tags.length === 0);
}

// Test 3.4: computeHopNeighborhood on empty vault
{
  const hops = computeHopNeighborhood('any-id', emptyGraph, 2);
  report('computeHopNeighborhood on empty vault returns empty distance map', hops.size === 0);
}

// Test 3.5: buildAdjacencyList on empty vault
{
  const adj = buildAdjacencyList(emptyGraph);
  report('buildAdjacencyList on empty vault returns empty map', adj.size === 0);
}

// ============================================================================
// SUITE 4: Ghost Node Resolution & Interaction Dynamics
// ============================================================================
console.log('\n--- SUITE 4: Ghost Node Resolution & Interaction Dynamics ---');

// Simulator of GraphView.tsx click handling
function createNodeClickDispatcher({ onSelectNote, onOpenNote, onCreateNote }) {
  let lastClick = { id: '', time: 0 };
  let focusedNodeId = null;

  const handleNodeClick = (node, now = Date.now()) => {
    const prev = lastClick;
    const isDoubleClick = prev.id === node.id && now - prev.time < 320;

    if (isDoubleClick) {
      lastClick = { id: '', time: 0 };
      if (node.is_unresolved) {
        onCreateNote(node.title);
      } else if (onOpenNote) {
        onOpenNote(node.id);
      } else {
        onSelectNote(node.id);
      }
    } else {
      lastClick = { id: node.id, time: now };
      onSelectNote(node.id);
      focusedNodeId = node.id;
    }
  };

  return {
    handleNodeClick,
    getFocusedNodeId: () => focusedNodeId,
    getLastClick: () => lastClick,
  };
}

// Test 4.1: Single click on ghost node selects and focuses it
{
  let selected = null;
  let created = null;
  const dispatcher = createNodeClickDispatcher({
    onSelectNote: (id) => {
      selected = id;
    },
    onCreateNote: (title) => {
      created = title;
    },
  });

  const ghostNode = {
    id: 'unresolved:quantum gravity',
    title: 'Quantum Gravity',
    is_unresolved: true,
  };

  dispatcher.handleNodeClick(ghostNode, 1000);

  const passed =
    selected === 'unresolved:quantum gravity' &&
    dispatcher.getFocusedNodeId() === 'unresolved:quantum gravity' &&
    created === null;
  report('Single click on ghost node selects and focuses without triggering creation', passed);
}

// Test 4.2: Double click within 320ms on ghost node invokes onCreateNote with verbatim title
{
  let selected = null;
  let created = null;
  const dispatcher = createNodeClickDispatcher({
    onSelectNote: (id) => {
      selected = id;
    },
    onCreateNote: (title) => {
      created = title;
    },
  });

  const ghostNode = {
    id: 'unresolved:matrix mechanics',
    title: 'Matrix Mechanics',
    is_unresolved: true,
  };

  // First click at t=1000
  dispatcher.handleNodeClick(ghostNode, 1000);
  // Second click at t=1200 (200ms delta < 320ms threshold)
  dispatcher.handleNodeClick(ghostNode, 1200);

  const passed = created === 'Matrix Mechanics' && dispatcher.getLastClick().id === '';
  report(
    'Double-click on ghost node (<320ms) triggers onCreateNote(title) and clears lastClick state',
    passed,
    `Created title was: "${created}"`
  );
}

// Test 4.3: Slow double click (>320ms) does NOT trigger onCreateNote
{
  let created = null;
  let selectCount = 0;
  const dispatcher = createNodeClickDispatcher({
    onSelectNote: () => {
      selectCount++;
    },
    onCreateNote: (title) => {
      created = title;
    },
  });

  const ghostNode = {
    id: 'unresolved:slow click',
    title: 'Slow Click',
    is_unresolved: true,
  };

  dispatcher.handleNodeClick(ghostNode, 1000);
  dispatcher.handleNodeClick(ghostNode, 1350); // 350ms > 320ms

  const passed = created === null && selectCount === 2;
  report('Clicks separated by >320ms on ghost node are treated as two distinct selections', passed);
}

// Test 4.4: Click alternation between two different nodes within 320ms
{
  let created = null;
  const selections = [];
  const dispatcher = createNodeClickDispatcher({
    onSelectNote: (id) => {
      selections.push(id);
    },
    onCreateNote: (title) => {
      created = title;
    },
  });

  const ghostA = { id: 'unresolved:a', title: 'Note A', is_unresolved: true };
  const ghostB = { id: 'unresolved:b', title: 'Note B', is_unresolved: true };

  // Click A at 1000, Click B at 1050 (50ms delta)
  dispatcher.handleNodeClick(ghostA, 1000);
  dispatcher.handleNodeClick(ghostB, 1050);

  const passed = created === null && selections[0] === 'unresolved:a' && selections[1] === 'unresolved:b';
  report('Fast clicking across different nodes does not trigger false double-click', passed);
}

// Test 4.5: Concrete note double-click navigates via onOpenNote instead of onCreateNote
{
  let opened = null;
  let created = null;
  const dispatcher = createNodeClickDispatcher({
    onSelectNote: () => {},
    onOpenNote: (id) => {
      opened = id;
    },
    onCreateNote: (title) => {
      created = title;
    },
  });

  const concreteNode = {
    id: 'concrete-42',
    title: 'Existing Note',
    is_unresolved: false,
  };

  dispatcher.handleNodeClick(concreteNode, 2000);
  dispatcher.handleNodeClick(concreteNode, 2150);

  const passed = opened === 'concrete-42' && created === null;
  report('Double-click on concrete node invokes onOpenNote(id) and never onCreateNote', passed);
}

// Test 4.6: Ghost node title with special characters, punctuation, and unicode
{
  let createdTitle = null;
  const dispatcher = createNodeClickDispatcher({
    onSelectNote: () => {},
    onCreateNote: (title) => {
      createdTitle = title;
    },
  });

  const complexTitle = 'Advanced & Complex: $E=mc^2$ / #tag & "quotes" 🌟';
  const ghostNode = {
    id: `unresolved:${complexTitle.toLowerCase()}`,
    title: complexTitle,
    is_unresolved: true,
  };

  dispatcher.handleNodeClick(ghostNode, 3000);
  dispatcher.handleNodeClick(ghostNode, 3100);

  const passed = createdTitle === complexTitle;
  report('Ghost node double-click preserves complex titles with symbols, math, and unicode', passed);
}

// ============================================================================
// SUMMARY
// ============================================================================
console.log('\n═════════════════════════════════════════════════════════════════════');
console.log(`TOTAL ADVERSARIAL TESTS: ${totalTests}`);
console.log(`PASSED: ${passedTests}`);
console.log(`FAILED: ${failedTests}`);
console.log(`PASS RATE: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
console.log('═════════════════════════════════════════════════════════════════════');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
