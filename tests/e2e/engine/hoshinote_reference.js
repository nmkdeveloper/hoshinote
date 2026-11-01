/**
 * Authoritative Reference Oracle Engine for Hoshinote E2E Testing
 *
 * Implements the complete specification and interface contracts defined in:
 * - PROJECT.md § Interface Contracts (Rust Tauri backend IPC & TS data models)
 * - PROJECT.md § Feature Inventory (Features 4, 5, 6, 7, 8, 10, 11)
 *
 * Provides a deterministically verifiable ground truth for all test tiers.
 */

import { randomUUID } from 'node:crypto';

// Catppuccin Mocha Color Palette for Graph Groups
export const CATPPUCCIN_PALETTE = {
  general: '#cdd6f4', // Text
  math: '#89b4fa',    // Blue
  physics: '#a6e3a1', // Green
  backend: '#f38ba8', // Red
  frontend: '#fab387',// Peach
  database: '#f9e2af',// Yellow
  paper: '#cba6f7',   // Mauve
  system: '#94e2d5',  // Teal
  draft: '#6c7086'    // Overlay0
};

export class HoshinoteReferenceEngine {
  constructor() {
    this.reset();
  }

  reset() {
    this.notes = new Map(); // id -> Note
    this.links = [];        // Array of LinkItem
    this.tags = new Map();  // noteId -> Set of tags
  }

  // ==========================================
  // Note CRUD (Feature 4)
  // ==========================================

  createNote({ title, content = '', path = '/', tags = [] }) {
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      throw new Error('Note title cannot be empty');
    }

    const trimmedTitle = title.trim();

    // Check for duplicate title
    for (const note of this.notes.values()) {
      if (note.title.toLowerCase() === trimmedTitle.toLowerCase()) {
        throw new Error(`Note with title "${trimmedTitle}" already exists`);
      }
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    const note = {
      id,
      title: trimmedTitle,
      content: content || '',
      path: path || '/',
      created_at: now,
      updated_at: now,
      is_pinned: false,
      is_archived: false
    };

    this.notes.set(id, note);

    // Extract tags from content (#tag) and merge with tags parameter
    const extractedTags = this._extractTags(note.content);
    const combinedTags = Array.from(new Set([...extractedTags, ...(tags || [])]));
    this.tags.set(id, new Set(combinedTags));

    // Extract outgoing links
    this._rebuildLinksForNote(id, note.content);

    // Re-resolve existing dangling links that were targeting this title
    this._resolveDanglingLinksForTitle(trimmedTitle, id);

    return this.getNote(id);
  }

  getNote(id) {
    const note = this.notes.get(id);
    if (!note) {
      throw new Error(`Note with id "${id}" not found`);
    }

    const noteTags = Array.from(this.tags.get(id) || []);
    const outgoing_links = this.links.filter(l => l.source_id === id);
    const incoming_links = this.getBacklinks(id);

    return {
      note: { ...note },
      tags: noteTags,
      outgoing_links,
      incoming_links
    };
  }

  getNoteByTitle(title) {
    if (!title) return null;
    const lower = title.trim().toLowerCase();
    for (const note of this.notes.values()) {
      if (note.title.toLowerCase() === lower) {
        return this.getNote(note.id);
      }
    }
    return null;
  }

  updateNote(id, { title, content, path, tags, is_pinned, is_archived }) {
    const existing = this.notes.get(id);
    if (!existing) {
      throw new Error(`Note with id "${id}" not found`);
    }

    const oldTitle = existing.title;
    let titleChanged = false;

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length === 0) {
        throw new Error('Note title cannot be empty');
      }
      const newTitle = title.trim();
      if (newTitle.toLowerCase() !== oldTitle.toLowerCase()) {
        for (const [otherId, other] of this.notes.entries()) {
          if (otherId !== id && other.title.toLowerCase() === newTitle.toLowerCase()) {
            throw new Error(`Note with title "${newTitle}" already exists`);
          }
        }
        existing.title = newTitle;
        titleChanged = true;
      }
    }

    if (content !== undefined) {
      existing.content = content;
    }
    if (path !== undefined) {
      existing.path = path;
    }
    if (is_pinned !== undefined) {
      existing.is_pinned = Boolean(is_pinned);
    }
    if (is_archived !== undefined) {
      existing.is_archived = Boolean(is_archived);
    }

    existing.updated_at = new Date().toISOString();

    // Rebuild tags
    if (tags !== undefined) {
      const extracted = this._extractTags(existing.content);
      const combined = Array.from(new Set([...extracted, ...tags]));
      this.tags.set(id, new Set(combined));
    } else if (content !== undefined) {
      const extracted = this._extractTags(existing.content);
      this.tags.set(id, new Set(extracted));
    }

    // Rebuild outgoing links
    if (content !== undefined) {
      this._rebuildLinksForNote(id, existing.content);
    }

    // Handle title change: update links targeting the old title
    if (titleChanged) {
      for (const link of this.links) {
        if (link.target_id === id || link.target_title.toLowerCase() === oldTitle.toLowerCase()) {
          link.target_title = existing.title;
          link.target_id = id;
          link.is_unresolved = false;
        }
      }
      this._resolveDanglingLinksForTitle(existing.title, id);
    }

    return this.getNote(id);
  }

  deleteNote(id) {
    const existing = this.notes.get(id);
    if (!existing) {
      throw new Error(`Note with id "${id}" not found`);
    }

    const deletedTitle = existing.title;

    // Delete note and tags
    this.notes.delete(id);
    this.tags.delete(id);

    // Remove outgoing links from this note
    this.links = this.links.filter(l => l.source_id !== id);

    // Any incoming links to this note now become unresolved dangling links
    for (const link of this.links) {
      if (link.target_id === id || link.target_title.toLowerCase() === deletedTitle.toLowerCase()) {
        link.target_id = null;
        link.is_unresolved = true;
      }
    }
  }

  listNotes({ tag, is_archived, sort_by = 'updated_at', order = 'desc', limit, offset = 0 } = {}) {
    let list = Array.from(this.notes.values());

    if (is_archived !== undefined) {
      list = list.filter(n => n.is_archived === is_archived);
    }

    if (tag) {
      const cleanTag = tag.replace(/^#/, '').toLowerCase();
      list = list.filter(n => {
        const noteTags = this.tags.get(n.id);
        if (!noteTags) return false;
        for (const t of noteTags) {
          if (t.toLowerCase() === cleanTag) return true;
        }
        return false;
      });
    }

    // Sort
    list.sort((a, b) => {
      let valA = a[sort_by] || '';
      let valB = b[sort_by] || '';
      if (typeof valA === 'string') {
        const cmp = valA.localeCompare(valB);
        return order === 'desc' ? -cmp : cmp;
      }
      return order === 'desc' ? valB - valA : valA - valB;
    });

    if (offset > 0) {
      list = list.slice(offset);
    }
    if (limit !== undefined && limit >= 0) {
      list = list.slice(0, limit);
    }

    return list.map(n => {
      const noteTags = Array.from(this.tags.get(n.id) || []);
      const connections_count = this._getConnectionCount(n.id);
      return {
        id: n.id,
        title: n.title,
        path: n.path,
        created_at: n.created_at,
        updated_at: n.updated_at,
        is_pinned: n.is_pinned,
        is_archived: n.is_archived,
        tags: noteTags,
        connections_count
      };
    });
  }

  getAllTags() {
    const countMap = new Map();
    for (const tagSet of this.tags.values()) {
      for (const t of tagSet) {
        countMap.set(t, (countMap.get(t) || 0) + 1);
      }
    }

    const summaries = [];
    for (const [name, count] of countMap.entries()) {
      summaries.push({ name, count });
    }

    summaries.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    return summaries;
  }

  // ==========================================
  // Obsidian Wikilinks Engine (Feature 5)
  // ==========================================

  getBacklinks(noteId) {
    const targetNote = this.notes.get(noteId);
    if (!targetNote) return [];

    const backlinks = [];
    for (const link of this.links) {
      const matchById = link.target_id === noteId;
      const matchByTitle = link.target_title.toLowerCase() === targetNote.title.toLowerCase();

      if (matchById || matchByTitle) {
        const sourceNote = this.notes.get(link.source_id);
        if (sourceNote) {
          const snippet = this._extractContextSnippet(sourceNote.content, link.raw_text || link.target_title);
          backlinks.push({
            source_id: sourceNote.id,
            source_title: sourceNote.title,
            snippet
          });
        }
      }
    }

    return backlinks;
  }

  parseWikilinks(text) {
    if (!text || typeof text !== 'string') return [];
    const results = [];
    // Regex matches [[Target]], [[Target|Alias]], [[Target#Heading]], [[Target#Heading|Alias]]
    const regex = /\[\[([^\]\n]+?)\]\]/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const raw = match[1].trim();
      if (!raw) continue; // Skip empty brackets [[]]

      let target_title = raw;
      let alias = null;
      let heading = null;

      // Check for alias separator '|'
      const pipeIndex = raw.indexOf('|');
      let linkPart = raw;
      if (pipeIndex !== -1) {
        linkPart = raw.slice(0, pipeIndex).trim();
        alias = raw.slice(pipeIndex + 1).trim();
      }

      // Check for heading separator '#'
      const hashIndex = linkPart.indexOf('#');
      if (hashIndex !== -1) {
        target_title = linkPart.slice(0, hashIndex).trim();
        heading = linkPart.slice(hashIndex + 1).trim();
      } else {
        target_title = linkPart;
      }

      if (target_title.length === 0) continue;

      results.push({
        raw_text: match[0],
        target_title,
        heading,
        alias
      });
    }

    return results;
  }

  // ==========================================
  // FTS5 Full-Text Search (Feature 6)
  // ==========================================

  searchNotes(query) {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return [];
    }

    const cleanQuery = query.trim();
    // Escape special regex characters to avoid regex crashes
    const escapedTerms = cleanQuery
      .split(/\s+/)
      .filter(t => t.length > 0)
      .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

    if (escapedTerms.length === 0) return [];

    const regexes = escapedTerms.map(t => new RegExp(t, 'i'));
    const results = [];

    for (const note of this.notes.values()) {
      let titleMatches = 0;
      let contentMatches = 0;
      let matchedSnippet = '';
      let allTermsMatched = true;

      for (const rx of regexes) {
        let termMatched = false;

        if (rx.test(note.title)) {
          titleMatches += 3; // Weight title higher
          termMatched = true;
        }

        const contentMatch = note.content.match(new RegExp(rx.source, 'gi'));
        if (contentMatch) {
          contentMatches += contentMatch.length;
          termMatched = true;
          if (!matchedSnippet) {
            matchedSnippet = this._extractContextSnippet(note.content, rx.source.replace(/\\/g, ''));
          }
        }

        // Also match note tags
        const noteTags = this.tags.get(note.id);
        if (noteTags) {
          for (const t of noteTags) {
            if (rx.test(t) || rx.test(`#${t}`)) {
              contentMatches += 2;
              termMatched = true;
            }
          }
        }

        if (!termMatched) {
          allTermsMatched = false;
        }
      }

      const totalMatches = titleMatches + contentMatches;
      if (allTermsMatched && totalMatches > 0) {
        // BM25-like rank score: higher for title matches and term frequency
        const rank = (titleMatches * 5.0) + (contentMatches * 1.5);
        results.push({
          id: note.id,
          title: note.title,
          snippet: matchedSnippet || (note.content.slice(0, 100) + '...'),
          rank: parseFloat(rank.toFixed(2)),
          matches_count: totalMatches
        });
      }
    }

    results.sort((a, b) => b.rank - a.rank);
    return results;
  }

  // ==========================================
  // Markdown GFM Rendering (Feature 7)
  // ==========================================

  renderMarkdown(markdown) {
    if (!markdown) return '';
    let html = markdown;

    // 1. Sanitize raw HTML script tags to prevent XSS
    html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    html = html.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
    html = html.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');

    // 2. Headings (# h1 to ###### h6)
    html = html.replace(/^###### (.*$)/gim, '<h6>$1</h6>');
    html = html.replace(/^##### (.*$)/gim, '<h5>$1</h5>');
    html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // 3. Code blocks (```lang\ncode\n```)
    html = html.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/gm, (match, lang, code) => {
      const safeCode = this._escapeHtml(code.trim());
      const langClass = lang ? ` class="language-${lang}"` : '';
      return `<pre><code${langClass}>${safeCode}</code></pre>`;
    });

    // 4. Inline code (`code`)
    html = html.replace(/`([^`\n]+)`/g, (match, code) => `<code>${this._escapeHtml(code)}</code>`);

    // 5. Task lists (- [ ] or - [x])
    html = html.replace(/^[*-] \[ \]\s+(.*)$/gim, '<li class="task-list-item"><input type="checkbox" disabled /> $1</li>');
    html = html.replace(/^[*-] \[x\]\s+(.*)$/gim, '<li class="task-list-item"><input type="checkbox" checked disabled /> $1</li>');

    // 6. GFM Tables (protecting wikilink pipes)
    html = this._renderTables(html);

    // 7. Blockquotes (> quote)
    html = html.replace(/^>\s+(.*)$/gim, '<blockquote><p>$1</p></blockquote>');

    // 8. Wikilinks [[Target|Alias]] or [[Target]]
    html = html.replace(/\[\[([^\]\n]+?)\]\]/g, (match, inner) => {
      let target = inner.trim();
      let label = target;
      if (inner.includes('|')) {
        const parts = inner.split('|');
        target = parts[0].trim();
        label = parts[1].trim();
      }
      return `<a class="wikilink" data-target="${this._escapeHtml(target)}" href="#/notes/${encodeURIComponent(target)}">${this._escapeHtml(label)}</a>`;
    });

    // 9. Bold, Italic, Strikethrough
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');

    // 10. Unordered Lists (- or *)
    html = html.replace(/^[*-]\s+(?!\[[ x]\])(.*)$/gim, '<li>$1</li>');

    return html;
  }

  // ==========================================
  // MathJax TeX Formula Rendering (Feature 8)
  // ==========================================

  renderMath(latex, displayMode = false) {
    if (latex === null || latex === undefined) return '';
    const trimmed = latex.trim();
    if (trimmed.length === 0) return '';

    // Validate LaTeX syntax: check for unbalanced braces {}
    let braceCount = 0;
    for (const char of trimmed) {
      if (char === '{') braceCount++;
      if (char === '}') braceCount--;
      if (braceCount < 0) break;
    }

    if (braceCount !== 0 || (trimmed.includes('\\begin{') && !trimmed.includes('\\end{'))) {
      return `<span class="math-error" data-error="SyntaxError: Unbalanced braces or unclosed environment">${this._escapeHtml(trimmed)}</span>`;
    }

    // Render pure scalable SVG representation
    const safeLatex = this._escapeHtml(trimmed);
    if (displayMode) {
      return `<div class="math-display"><svg class="math-block" xmlns="http://www.w3.org/2000/svg" role="img" focusable="false" viewBox="0 0 200 40"><text y="25">${safeLatex}</text></svg></div>`;
    } else {
      return `<svg class="math-inline" xmlns="http://www.w3.org/2000/svg" role="img" focusable="false" viewBox="0 0 100 20"><text y="15">${safeLatex}</text></svg>`;
    }
  }

  parseMarkdownWithMath(content) {
    if (!content) return '';

    // 1. First handle escaped dollar signs: \$50 -> literal $50 token
    const ESCAPED_DOLLAR_PLACEHOLDER = '__ESCAPED_DOLLAR__';
    let processed = content.replace(/\\\$/g, ESCAPED_DOLLAR_PLACEHOLDER);

    // 2. Block math: $$formula$$
    processed = processed.replace(/\$\$([\s\S]+?)\$\$/g, (match, formula) => {
      return this.renderMath(formula, true);
    });

    // 3. Inline math: $formula$
    // Distinguish from currency: currency has space after first $ or space before closing $, or pure numbers
    // e.g., "$100 and $200" is currency, not math.
    processed = processed.replace(/(^|[^\\])\$([^\s$][^$]*?[^\s$]|\S)\$/g, (match, prefix, formula) => {
      // Check if it looks like pure currency ($100, $20.50, $1,000)
      if (/^\d+(?:\.\d{1,2})?$/.test(formula)) {
        return `${prefix}$${formula}$`; // Keep as currency literal
      }
      return `${prefix}${this.renderMath(formula, false)}`;
    });

    // 4. Restore escaped dollars
    processed = processed.replace(new RegExp(ESCAPED_DOLLAR_PLACEHOLDER, 'g'), '$');

    // 5. Render surrounding Markdown
    return this.renderMarkdown(processed);
  }

  // ==========================================
  // Interactive Graph Drawer & Filters (Features 10 & 11)
  // ==========================================

  getGraphData() {
    const nodes = [];
    const nodeMap = new Map();

    // Add all existing notes as nodes
    for (const note of this.notes.values()) {
      const noteTags = Array.from(this.tags.get(note.id) || []);
      const connections_count = this._getConnectionCount(note.id);
      const is_orphan = connections_count === 0;
      const primaryTag = noteTags[0] ? noteTags[0].toLowerCase() : 'general';
      const group = CATPPUCCIN_PALETTE[primaryTag] ? primaryTag : 'general';
      const radius = 4 + 2 * connections_count;

      const graphNode = {
        id: note.id,
        title: note.title,
        tags: noteTags,
        connections_count,
        radius,
        is_orphan,
        is_unresolved: false,
        group
      };

      nodes.push(graphNode);
      nodeMap.set(note.id, graphNode);
    }

    // Graph Links
    const links = [];
    for (const link of this.links) {
      if (link.is_unresolved) {
        // Unresolved links target a phantom node by title
        const phantomId = `unresolved:${link.target_title}`;
        if (!nodeMap.has(phantomId)) {
          const phantomNode = {
            id: phantomId,
            title: link.target_title,
            tags: [],
            connections_count: 1,
            radius: 4,
            is_orphan: false,
            is_unresolved: true,
            group: 'draft'
          };
          nodes.push(phantomNode);
          nodeMap.set(phantomId, phantomNode);
        }
        links.push({
          source: link.source_id,
          target: phantomId,
          is_unresolved: true
        });
      } else {
        links.push({
          source: link.source_id,
          target: link.target_id,
          is_unresolved: false
        });
      }
    }

    return { nodes, links };
  }

  filterGraph(graphData, { query, tag, hideOrphans = false, centerNodeId, hopDepth = 1 } = {}) {
    let activeNodes = [...graphData.nodes];
    let activeLinks = [...graphData.links];

    // 1. Tag Filter
    if (tag) {
      const cleanTag = tag.replace(/^#/, '').toLowerCase();
      activeNodes = activeNodes.filter(n => {
        return n.tags && n.tags.some(t => t.toLowerCase() === cleanTag);
      });
      const validNodeIds = new Set(activeNodes.map(n => n.id));
      activeLinks = activeLinks.filter(l => validNodeIds.has(l.source) && validNodeIds.has(l.target));
    }

    // 2. Search Query Filter
    if (query && query.trim().length > 0) {
      const q = query.trim().toLowerCase();
      activeNodes = activeNodes.filter(n => n.title.toLowerCase().includes(q));
      const validNodeIds = new Set(activeNodes.map(n => n.id));
      activeLinks = activeLinks.filter(l => validNodeIds.has(l.source) && validNodeIds.has(l.target));
    }

    // 3. Hide Orphans Filter
    if (hideOrphans) {
      activeNodes = activeNodes.filter(n => !n.is_orphan);
    }

    // 4. Hop Depth Filter from center node (BFS)
    if (centerNodeId) {
      const neighborhood = this._computeHopNeighborhood(centerNodeId, graphData, hopDepth);
      activeNodes = activeNodes.filter(n => neighborhood.has(n.id));
      activeLinks = activeLinks.filter(l => neighborhood.has(l.source) && neighborhood.has(l.target));
    }

    return {
      nodes: activeNodes,
      links: activeLinks
    };
  }

  // ==========================================
  // Internal Helper Methods
  // ==========================================

  _extractTags(content) {
    if (!content) return [];
    const tags = [];
    const regex = /(?:^|\s)#([a-zA-Z0-9_-]+)(?=\s|$)/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      tags.push(match[1]);
    }
    return tags;
  }

  _rebuildLinksForNote(sourceId, content) {
    // Remove existing outgoing links from this note
    this.links = this.links.filter(l => l.source_id !== sourceId);

    const parsed = this.parseWikilinks(content);
    for (const p of parsed) {
      const targetNote = this.getNoteByTitle(p.target_title);
      const is_unresolved = !targetNote;
      const target_id = targetNote ? targetNote.note.id : null;

      this.links.push({
        id: randomUUID(),
        source_id: sourceId,
        target_title: p.target_title,
        target_id,
        heading: p.heading,
        alias: p.alias,
        raw_text: p.raw_text,
        is_unresolved
      });
    }
  }

  _resolveDanglingLinksForTitle(title, noteId) {
    const lower = title.toLowerCase();
    for (const link of this.links) {
      if (link.is_unresolved && link.target_title.toLowerCase() === lower) {
        link.is_unresolved = false;
        link.target_id = noteId;
      }
    }
  }

  _getConnectionCount(noteId) {
    let count = 0;
    const note = this.notes.get(noteId);
    if (!note) return 0;

    for (const link of this.links) {
      if (link.source_id === noteId) {
        count++;
      } else if (link.target_id === noteId || link.target_title.toLowerCase() === note.title.toLowerCase()) {
        count++;
      }
    }
    return count;
  }

  _extractContextSnippet(content, keyword) {
    if (!content || !keyword) return '';
    const index = content.toLowerCase().indexOf(keyword.toLowerCase());
    if (index === -1) return content.slice(0, 80) + '...';

    const start = Math.max(0, index - 30);
    const end = Math.min(content.length, index + keyword.length + 30);
    const snippet = content.slice(start, end).trim();
    return (start > 0 ? '...' : '') + snippet + (end < content.length ? '...' : '');
  }

  _escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  _splitTableCells(line) {
    // Splits on '|' only outside of [[ ... ]]
    const inner = line.slice(1, -1);
    const cells = [];
    let current = '';
    let inWikilink = false;

    for (let i = 0; i < inner.length; i++) {
      if (inner[i] === '[' && inner[i + 1] === '[') {
        inWikilink = true;
        current += '[[';
        i++;
      } else if (inner[i] === ']' && inner[i + 1] === ']') {
        inWikilink = false;
        current += ']]';
        i++;
      } else if (inner[i] === '|' && !inWikilink) {
        cells.push(current.trim());
        current = '';
      } else {
        current += inner[i];
      }
    }
    cells.push(current.trim());
    return cells;
  }

  _renderTables(text) {
    const lines = text.split('\n');
    let inTable = false;
    let tableHtml = '';
    const output = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('|') && line.endsWith('|')) {
        const cells = this._splitTableCells(line);
        if (!inTable) {
          inTable = true;
          tableHtml = '<table><thead><tr>' + cells.map(c => `<th>${c}</th>`).join('') + '</tr></thead><tbody>';
          // Check if next line is delimiter
          if (i + 1 < lines.length && /^\|[-:\s|]+\|$/.test(lines[i + 1].trim())) {
            i++; // skip delimiter
          }
        } else {
          tableHtml += '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>';
        }
      } else {
        if (inTable) {
          inTable = false;
          tableHtml += '</tbody></table>';
          output.push(tableHtml);
        }
        output.push(lines[i]);
      }
    }

    if (inTable) {
      tableHtml += '</tbody></table>';
      output.push(tableHtml);
    }

    return output.join('\n');
  }

  _computeHopNeighborhood(centerNodeId, graphData, maxHops) {
    const visited = new Set([centerNodeId]);
    let currentQueue = [centerNodeId];

    // Build adjacency list
    const adj = new Map();
    for (const node of graphData.nodes) {
      adj.set(node.id, []);
    }
    for (const link of graphData.links) {
      if (!adj.has(link.source)) adj.set(link.source, []);
      if (!adj.has(link.target)) adj.set(link.target, []);
      adj.get(link.source).push(link.target);
      adj.get(link.target).push(link.source);
    }

    for (let hop = 0; hop < maxHops; hop++) {
      const nextQueue = [];
      for (const curr of currentQueue) {
        const neighbors = adj.get(curr) || [];
        for (const n of neighbors) {
          if (!visited.has(n)) {
            visited.add(n);
            nextQueue.push(n);
          }
        }
      }
      currentQueue = nextQueue;
      if (currentQueue.length === 0) break;
    }

    return visited;
  }
}
