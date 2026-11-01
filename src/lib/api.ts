import { invoke } from '@tauri-apps/api/core';
import type {
  Note,
  NoteWithDetails,
  NoteSummary,
  SearchResult,
  BacklinkItem,
  GraphData,
  TagSummary,
  LinkItem,
  GraphNode,
  GraphLink,
  CreateNoteInput,
  UpdateNoteInput,
  ListNotesFilter,
} from '../types';

export type { CreateNoteInput, UpdateNoteInput, ListNotesFilter };

// ============================================================================
// Environment Detection
// ============================================================================

export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

// ============================================================================
// Initial Seed Data for Mock & Browser Dev
// ============================================================================

export const INITIAL_SEED_NOTES: Note[] = [
  {
    id: 'note-welcome',
    title: 'Welcome to Hoshinote',
    content: `# Welcome to Hoshinote 🌌

A production desktop note-taking application inspired by Obsidian, crafted with **Rust**, **Tauri 2.0**, and **SQLite**.

## Features
- 🚀 **High Performance**: Native Rust backend with zero runtime bloat.
- 📐 **MathJax Formulas**: Render inline math like $E = mc^2$ and complex displays:
  $$\\oint_{\\partial \\Omega} \\mathbf{E} \\cdot d\\mathbf{S} = \\frac{1}{\\varepsilon_0} \\iiint_{\\Omega} \\rho \\, dV$$
- 🕸️ **Interactive Graph**: Visualize connections between your knowledge nodes using \`[[Wikilinks]]\`.
- 🔍 **FTS5 Search**: Sub-millisecond full-text search directly inside local SQLite.

Explore other notes:
- Check out [[Quantum Physics Notes]]
- See [[Linear Algebra Foundations]]
`,
    path: '/Welcome to Hoshinote.md',
    created_at: '2026-11-01T00:00:00.000Z',
    updated_at: '2026-11-01T00:00:00.000Z',
    is_pinned: true,
    is_archived: false,
  },
  {
    id: 'note-math',
    title: 'Quantum Physics Notes',
    content: `# Quantum Physics Notes

Schrödinger equation describes how the quantum state of a physical system changes over time:

$$i\\hbar\\frac{\\partial}{\\partial t}\\Psi(\\mathbf{r},t) = \\hat{H}\\Psi(\\mathbf{r},t)$$

Related concepts:
- [[Welcome to Hoshinote]]
- [[Linear Algebra Foundations]]
`,
    path: '/Quantum Physics Notes.md',
    created_at: '2026-11-01T00:00:00.000Z',
    updated_at: '2026-11-01T00:00:00.000Z',
    is_pinned: false,
    is_archived: false,
  },
  {
    id: 'note-linalg',
    title: 'Linear Algebra Foundations',
    content: `# Linear Algebra Foundations

Eigenvalue decomposition is fundamental:

$$A \\mathbf{v} = \\lambda \\mathbf{v}$$

Where $\\mathbf{v}$ is the eigenvector and $\\lambda$ is the eigenvalue.

See also [[Quantum Physics Notes]].
`,
    path: '/Linear Algebra Foundations.md',
    created_at: '2026-11-01T00:00:00.000Z',
    updated_at: '2026-11-01T00:00:00.000Z',
    is_pinned: false,
    is_archived: false,
  },
];

// Catppuccin color groups
const CATPPUCCIN_GROUPS: Record<string, string> = {
  general: '#cdd6f4',
  math: '#89b4fa',
  physics: '#a6e3a1',
  backend: '#f38ba8',
  frontend: '#fab387',
  database: '#f9e2af',
  paper: '#cba6f7',
  system: '#94e2d5',
  draft: '#6c7086',
};

// ============================================================================
// In-Memory Mock Database
// ============================================================================

export class MockDatabase {
  private notes = new Map<string, Note>();
  private tags = new Map<string, Set<string>>();

  constructor() {
    this.reset();
  }

  reset(): void {
    this.notes.clear();
    this.tags.clear();
    for (const note of INITIAL_SEED_NOTES) {
      this.notes.set(note.id, { ...note });
      const extracted = this.extractTags(note.content);
      const initialTags = extracted.length > 0 ? extracted : ['general'];
      this.tags.set(note.id, new Set(initialTags));
    }
  }

  private extractTags(content: string): string[] {
    if (!content) return [];
    const matches = content.match(/(?:^|\s)#([a-zA-Z0-9_\-\/]+)(?=\s|$)/g);
    if (!matches) return [];
    return Array.from(new Set(matches.map((m) => m.trim().replace(/^#/, ''))));
  }

  private parseLinks(sourceId: string, content: string): LinkItem[] {
    const links: LinkItem[] = [];
    if (!content) return links;
    const regex = /\[\[([^\]\n]+?)\]\]/g;
    let match: RegExpExecArray | null;
    let index = 0;

    while ((match = regex.exec(content)) !== null) {
      const raw = match[1].trim();
      if (!raw) continue;

      let target_title = raw;
      let alias: string | null = null;
      let heading: string | null = null;

      if (target_title.includes('|')) {
        const parts = target_title.split('|');
        target_title = parts[0].trim();
        alias = parts.slice(1).join('|').trim();
      }

      if (target_title.includes('#')) {
        const parts = target_title.split('#');
        target_title = parts[0].trim();
        heading = parts.slice(1).join('#').trim();
      }

      const targetNote = Array.from(this.notes.values()).find(
        (n) => n.title.toLowerCase() === target_title.toLowerCase()
      );

      links.push({
        id: `link-${sourceId}-${index++}`,
        source_id: sourceId,
        target_id: targetNote ? targetNote.id : null,
        raw_target: target_title,
        alias,
        heading,
        is_unresolved: !targetNote,
      });
    }

    return links;
  }

  async createNote(input: CreateNoteInput): Promise<NoteWithDetails> {
    const trimmedTitle = input.title ? input.title.trim() : '';
    if (!trimmedTitle) {
      throw new Error('Note title cannot be empty');
    }

    for (const n of this.notes.values()) {
      if (n.title.toLowerCase() === trimmedTitle.toLowerCase()) {
        throw new Error(`Note with title "${trimmedTitle}" already exists`);
      }
    }

    const id = `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const note: Note = {
      id,
      title: trimmedTitle,
      content: input.content || '',
      path: input.path || `/${trimmedTitle}.md`,
      created_at: now,
      updated_at: now,
      is_pinned: false,
      is_archived: false,
    };

    this.notes.set(id, note);
    const extracted = this.extractTags(note.content);
    const combined = Array.from(new Set([...extracted, ...(input.tags || [])]));
    this.tags.set(id, new Set(combined.length > 0 ? combined : ['general']));

    return this.getNote(id);
  }

  async getNote(id: string): Promise<NoteWithDetails> {
    const note = this.notes.get(id);
    if (!note) {
      throw new Error(`Note with id "${id}" not found`);
    }

    const noteTags = Array.from(this.tags.get(id) || []);
    const outgoing = this.parseLinks(id, note.content);
    const incoming = await this.getBacklinks(id);

    return {
      note: { ...note },
      tags: noteTags,
      outgoing_links: outgoing,
      incoming_links: incoming,
    };
  }

  async getNoteByTitle(title: string): Promise<NoteWithDetails | null> {
    if (!title) return null;
    const lower = title.trim().toLowerCase();
    const target = Array.from(this.notes.values()).find((n) => n.title.toLowerCase() === lower);
    if (!target) return null;
    return this.getNote(target.id);
  }

  async updateNote(id: string, input: UpdateNoteInput): Promise<NoteWithDetails> {
    const note = this.notes.get(id);
    if (!note) {
      throw new Error(`Note with id "${id}" not found`);
    }

    if (input.title !== undefined) {
      const trimmed = input.title.trim();
      if (!trimmed) {
        throw new Error('Note title cannot be empty');
      }
      for (const other of this.notes.values()) {
        if (other.id !== id && other.title.toLowerCase() === trimmed.toLowerCase()) {
          throw new Error(`Note with title "${trimmed}" already exists`);
        }
      }
      note.title = trimmed;
    }

    if (input.content !== undefined) {
      note.content = input.content;
    }
    if (input.path !== undefined) {
      note.path = input.path;
    }
    if (input.is_pinned !== undefined) {
      note.is_pinned = Boolean(input.is_pinned);
    }
    if (input.is_archived !== undefined) {
      note.is_archived = Boolean(input.is_archived);
    }

    note.updated_at = new Date().toISOString();

    if (input.tags !== undefined || input.content !== undefined) {
      const extracted = this.extractTags(note.content);
      const existingTags = Array.from(this.tags.get(id) || []);
      const combined = Array.from(new Set([...extracted, ...(input.tags || existingTags)]));
      this.tags.set(id, new Set(combined));
    }

    return this.getNote(id);
  }

  async deleteNote(id: string): Promise<void> {
    if (!this.notes.has(id)) {
      throw new Error(`Note with id "${id}" not found`);
    }
    this.notes.delete(id);
    this.tags.delete(id);
  }

  async listNotes(filter?: ListNotesFilter): Promise<NoteSummary[]> {
    let list = Array.from(this.notes.values());

    if (filter?.is_archived !== undefined) {
      list = list.filter((n) => n.is_archived === filter.is_archived);
    }

    if (filter?.tag) {
      const clean = filter.tag.replace(/^#/, '').toLowerCase();
      list = list.filter((n) => {
        const tSet = this.tags.get(n.id);
        return tSet ? Array.from(tSet).some((t) => t.toLowerCase() === clean) : false;
      });
    }

    const sortBy = filter?.sort_by || 'updated_at';
    const isAsc = filter?.order?.toLowerCase() === 'asc';

    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'title') {
        cmp = a.title.localeCompare(b.title);
      } else if (sortBy === 'created_at') {
        cmp = a.created_at.localeCompare(b.created_at);
      } else if (sortBy === 'is_pinned') {
        cmp = (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0);
      } else {
        cmp = a.updated_at.localeCompare(b.updated_at);
      }
      return isAsc ? cmp : -cmp;
    });

    if (filter?.offset && filter.offset > 0) {
      list = list.slice(filter.offset);
    }
    if (filter?.limit && filter.limit > 0) {
      list = list.slice(0, filter.limit);
    }

    return list.map((n) => {
      const firstLine = n.content.split('\n\n')[0] || '';
      const snippet = firstLine.replace(/^[#\s]+/, '').slice(0, 100);
      return {
        id: n.id,
        title: n.title,
        path: n.path,
        snippet,
        tags: Array.from(this.tags.get(n.id) || []),
        updated_at: n.updated_at,
        is_pinned: n.is_pinned,
        is_archived: n.is_archived,
      };
    });
  }

  async searchNotes(query: string): Promise<SearchResult[]> {
    const clean = query.trim().toLowerCase();
    if (!clean) return [];

    const results: SearchResult[] = [];
    for (const n of this.notes.values()) {
      if (n.is_archived) continue;
      const titleLower = n.title.toLowerCase();
      const contentLower = n.content.toLowerCase();
      const titleMatch = titleLower.includes(clean);
      const contentMatch = contentLower.includes(clean);

      if (titleMatch || contentMatch) {
        let snippet = '';
        if (contentMatch) {
          const idx = contentLower.indexOf(clean);
          const start = Math.max(0, idx - 40);
          const end = Math.min(n.content.length, idx + clean.length + 60);
          const rawSlice = n.content.slice(start, end);
          snippet = rawSlice.replace(new RegExp(clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '<mark>$&</mark>');
          if (start > 0) snippet = '...' + snippet;
          if (end < n.content.length) snippet = snippet + '...';
        } else {
          snippet = n.content.slice(0, 100);
        }

        const rank = (titleMatch ? 10.0 : 1.0) + (contentMatch ? 2.0 : 0.0);
        results.push({
          id: n.id,
          title: n.title,
          snippet,
          rank,
        });
      }
    }

    results.sort((a, b) => b.rank - a.rank);
    return results;
  }

  async getBacklinks(noteId: string): Promise<BacklinkItem[]> {
    const target = this.notes.get(noteId);
    if (!target) return [];

    const backlinks: BacklinkItem[] = [];
    for (const source of this.notes.values()) {
      if (source.id === noteId || source.is_archived) continue;
      const links = this.parseLinks(source.id, source.content);
      const match = links.find(
        (l) => l.target_id === noteId || l.raw_target.toLowerCase() === target.title.toLowerCase()
      );
      if (match) {
        const idx = source.content.toLowerCase().indexOf(`[[${match.raw_target.toLowerCase()}`);
        const start = Math.max(0, idx - 30);
        const end = Math.min(source.content.length, idx + match.raw_target.length + 50);
        const snippet = source.content.slice(start, end).trim();
        backlinks.push({
          source_id: source.id,
          source_title: source.title,
          snippet,
          note_id: source.id,
          note_title: source.title,
          context_snippet: snippet,
        });
      }
    }
    return backlinks;
  }

  async getGraphData(): Promise<GraphData> {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const degrees = new Map<string, number>();
    const phantomNodes = new Map<string, string>();

    for (const source of this.notes.values()) {
      const outLinks = this.parseLinks(source.id, source.content);
      for (const l of outLinks) {
        let targetId = l.target_id;
        if (!targetId) {
          const canonical = phantomNodes.get(l.raw_target.toLowerCase()) || l.raw_target;
          phantomNodes.set(l.raw_target.toLowerCase(), canonical);
          targetId = `unresolved:${canonical}`;
        }
        degrees.set(source.id, (degrees.get(source.id) || 0) + 1);
        degrees.set(targetId, (degrees.get(targetId) || 0) + 1);
        links.push({
          source: source.id,
          target: targetId,
          is_unresolved: l.is_unresolved,
        });
      }
    }

    for (const n of this.notes.values()) {
      const count = degrees.get(n.id) || 0;
      const noteTags = Array.from(this.tags.get(n.id) || []);
      const primaryTag = noteTags[0] ? noteTags[0].toLowerCase() : 'general';
      const group = CATPPUCCIN_GROUPS[primaryTag] ? primaryTag : 'general';

      nodes.push({
        id: n.id,
        title: n.title,
        tags: noteTags,
        connections_count: count,
        is_orphan: count === 0,
        is_unresolved: false,
        group,
        radius: 4 + 2 * count,
      });
    }

    for (const [_, canonical] of phantomNodes.entries()) {
      const phantomId = `unresolved:${canonical}`;
      const count = degrees.get(phantomId) || 0;
      nodes.push({
        id: phantomId,
        title: canonical,
        tags: [],
        connections_count: count,
        is_orphan: false,
        is_unresolved: true,
        group: 'draft',
        radius: 4,
      });
    }

    return { nodes, links };
  }

  async getAllTags(): Promise<TagSummary[]> {
    const counts = new Map<string, number>();
    for (const tSet of this.tags.values()) {
      for (const t of tSet) {
        counts.set(t, (counts.get(t) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }
}

export const mockDatabase = new MockDatabase();
export const resetMockDatabase = (): void => mockDatabase.reset();

// ============================================================================
// Public Typed Tauri IPC Client API
// ============================================================================

export async function getAppStatus(): Promise<string> {
  if (isTauri()) {
    try {
      return await invoke<string>('get_app_status');
    } catch (err) {
      console.warn('Failed to invoke get_app_status:', err);
      return 'Tauri IPC Error';
    }
  }
  return 'Browser Dev Mode (Tauri Standby)';
}

export async function createNote(input: CreateNoteInput): Promise<NoteWithDetails> {
  if (isTauri()) {
    return await invoke<NoteWithDetails>('create_note', {
      title: input.title,
      content: input.content ?? null,
      path: input.path ?? null,
      tags: input.tags ?? null,
    });
  }
  return await mockDatabase.createNote(input);
}

export async function getNote(id: string): Promise<NoteWithDetails> {
  if (isTauri()) {
    return await invoke<NoteWithDetails>('get_note', { id });
  }
  return await mockDatabase.getNote(id);
}

export async function getNoteByTitle(title: string): Promise<NoteWithDetails | null> {
  if (isTauri()) {
    return await invoke<NoteWithDetails | null>('get_note_by_title', { title });
  }
  return await mockDatabase.getNoteByTitle(title);
}

export async function updateNote(id: string, input: UpdateNoteInput): Promise<NoteWithDetails> {
  if (isTauri()) {
    return await invoke<NoteWithDetails>('update_note', {
      id,
      title: input.title ?? null,
      content: input.content ?? null,
      path: input.path ?? null,
      tags: input.tags ?? null,
      is_pinned: input.is_pinned ?? null,
      is_archived: input.is_archived ?? null,
    });
  }
  return await mockDatabase.updateNote(id, input);
}

export async function deleteNote(id: string): Promise<void> {
  if (isTauri()) {
    return await invoke<void>('delete_note', { id });
  }
  return await mockDatabase.deleteNote(id);
}

export async function listNotes(filter?: ListNotesFilter): Promise<NoteSummary[]> {
  if (isTauri()) {
    return await invoke<NoteSummary[]>('list_notes', {
      tag: filter?.tag ?? null,
      is_archived: filter?.is_archived ?? null,
      sort_by: filter?.sort_by ?? null,
      order: filter?.order ?? null,
      limit: filter?.limit ?? null,
      offset: filter?.offset ?? null,
    });
  }
  return await mockDatabase.listNotes(filter);
}

export async function searchNotes(query: string): Promise<SearchResult[]> {
  if (isTauri()) {
    return await invoke<SearchResult[]>('search_notes', { query });
  }
  return await mockDatabase.searchNotes(query);
}

export async function getBacklinks(noteId: string): Promise<BacklinkItem[]> {
  if (isTauri()) {
    return await invoke<BacklinkItem[]>('get_backlinks', { note_id: noteId });
  }
  return await mockDatabase.getBacklinks(noteId);
}

export async function getGraphData(): Promise<GraphData> {
  if (isTauri()) {
    return await invoke<GraphData>('get_graph_data');
  }
  return await mockDatabase.getGraphData();
}

export async function getAllTags(): Promise<TagSummary[]> {
  if (isTauri()) {
    return await invoke<TagSummary[]>('get_all_tags');
  }
  return await mockDatabase.getAllTags();
}
