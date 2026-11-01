import { describe, it, expect } from 'vitest';
import type { Note, NoteWithDetails, GraphData } from './index';

describe('TypeScript Contract Types', () => {
  it('correctly validates Note model shape', () => {
    const note: Note = {
      id: 'test-1',
      title: 'Test Note',
      content: '# Heading\nContent with $E=mc^2$',
      path: '/test.md',
      created_at: '2026-11-01T00:00:00Z',
      updated_at: '2026-11-01T00:00:00Z',
      is_pinned: true,
      is_archived: false,
    };
    expect(note.id).toBe('test-1');
    expect(note.title).toBe('Test Note');
    expect(note.is_pinned).toBe(true);
  });

  it('correctly models NoteWithDetails and GraphData', () => {
    const details: NoteWithDetails = {
      note: {
        id: 'note-1',
        title: 'Quantum Physics',
        content: 'Content',
        path: '/qp.md',
        created_at: '2026-11-01T00:00:00Z',
        updated_at: '2026-11-01T00:00:00Z',
        is_pinned: false,
        is_archived: false,
      },
      tags: ['physics', 'science'],
      outgoing_links: [],
      incoming_links: [],
    };
    expect(details.tags).toContain('physics');

    const graph: GraphData = {
      nodes: [
        {
          id: 'note-1',
          title: 'Quantum Physics',
          tags: ['physics'],
          connections_count: 0,
          is_orphan: true,
          is_unresolved: false,
          group: 'physics',
        },
      ],
      links: [],
    };
    expect(graph.nodes.length).toBe(1);
    expect(graph.nodes[0].is_orphan).toBe(true);
  });
});
