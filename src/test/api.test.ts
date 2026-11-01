import { describe, it, expect, beforeEach } from 'vitest';
import * as api from '../lib/api';

describe('Tauri IPC Wrapper & MockDatabase Fallback', () => {
  beforeEach(() => {
    api.resetMockDatabase();
  });

  it('detects browser dev mode when window.__TAURI_INTERNALS__ is absent', () => {
    expect(api.isTauri()).toBe(false);
  });

  it('returns standby app status in browser dev mode', async () => {
    const status = await api.getAppStatus();
    expect(status).toContain('Browser Dev Mode');
  });

  it('lists initial seeded notes in browser mode', async () => {
    const notes = await api.listNotes();
    expect(notes.length).toBeGreaterThanOrEqual(3);
    expect(notes.some((n) => n.title === 'Welcome to Hoshinote')).toBe(true);
    expect(notes.some((n) => n.title === 'Quantum Physics Notes')).toBe(true);
    expect(notes.some((n) => n.title === 'Linear Algebra Foundations')).toBe(true);
  });

  it('creates and retrieves note with wikilinks and tags', async () => {
    const created = await api.createNote({
      title: 'Neural Networks Architecture',
      content: '# Deep Learning\n\nStudy [[Linear Algebra Foundations]] for math.\n#ai #math',
      tags: ['machine-learning'],
    });

    expect(created.note.title).toBe('Neural Networks Architecture');
    expect(created.tags).toContain('ai');
    expect(created.tags).toContain('machine-learning');
    expect(created.outgoing_links.length).toBe(1);
    expect(created.outgoing_links[0].raw_target).toBe('Linear Algebra Foundations');
    expect(created.outgoing_links[0].is_unresolved).toBe(false);

    const fetched = await api.getNote(created.note.id);
    expect(fetched.note.id).toBe(created.note.id);

    const fetchedByTitle = await api.getNoteByTitle('neural networks architecture');
    expect(fetchedByTitle).not.toBeNull();
    expect(fetchedByTitle?.note.id).toBe(created.note.id);
  });

  it('rejects empty title and duplicate note titles case-insensitively', async () => {
    await expect(api.createNote({ title: '   ' })).rejects.toThrow(/empty/i);
    await expect(api.createNote({ title: 'welcome to hoshinote' })).rejects.toThrow(
      /already exists/i
    );
  });

  it('updates note and reflects changes in retrieval', async () => {
    const created = await api.createNote({
      title: 'Draft Note',
      content: 'Initial text',
    });

    const updated = await api.updateNote(created.note.id, {
      title: 'Final Note',
      content: 'Updated content with [[Welcome to Hoshinote]]',
      is_pinned: true,
    });

    expect(updated.note.title).toBe('Final Note');
    expect(updated.note.is_pinned).toBe(true);
    expect(updated.outgoing_links.length).toBe(1);
    expect(updated.outgoing_links[0].raw_target).toBe('Welcome to Hoshinote');
  });

  it('deletes note removes it from listing and database', async () => {
    const created = await api.createNote({
      title: 'Ephemeral Note',
      content: 'Will be deleted soon',
    });

    await api.deleteNote(created.note.id);
    await expect(api.getNote(created.note.id)).rejects.toThrow(/not found/i);

    const list = await api.listNotes();
    expect(list.some((n) => n.id === created.note.id)).toBe(false);
  });

  it('searches notes and generates <mark> highlight snippets', async () => {
    const results = await api.searchNotes('Schrödinger');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].title).toBe('Quantum Physics Notes');
    expect(results[0].snippet).toContain('<mark>');
    expect(results[0].rank).toBeGreaterThan(0);
  });

  it('computes backlinks accurately across notes', async () => {
    const noteA = await api.createNote({
      title: 'Referencing Note A',
      content: 'This links to [[Welcome to Hoshinote]] as reference.',
    });

    const welcome = await api.getNoteByTitle('Welcome to Hoshinote');
    expect(welcome).not.toBeNull();

    const backlinks = await api.getBacklinks(welcome!.note.id);
    expect(backlinks.some((b) => b.note_id === noteA.note.id || b.source_id === noteA.note.id)).toBe(
      true
    );
  });

  it('generates topological graph data with unresolved phantom nodes', async () => {
    await api.createNote({
      title: 'Cosmology Exploration',
      content: 'Exploring [[Dark Matter]] and [[Welcome to Hoshinote]]',
    });

    const graph = await api.getGraphData();
    expect(graph.nodes.some((n) => n.id === 'unresolved:Dark Matter')).toBe(true);
    expect(graph.links.some((l) => l.target === 'unresolved:Dark Matter' && l.is_unresolved)).toBe(
      true
    );
  });

  it('aggregates all tags and returns sorted tag counts', async () => {
    await api.createNote({
      title: 'Tagged Note 1',
      content: '#ai #physics and study',
    });
    await api.createNote({
      title: 'Tagged Note 2',
      content: '#ai #algorithms and coding',
    });

    const tags = await api.getAllTags();
    const aiTag = tags.find((t) => t.name === 'ai');
    expect(aiTag).toBeDefined();
    expect(aiTag!.count).toBeGreaterThanOrEqual(2);
  });
});
