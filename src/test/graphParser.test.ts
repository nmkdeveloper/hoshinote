import { describe, it, expect } from 'vitest';
import { parseGraphDsl } from '../lib/graphParser';

describe('User-Authored Markdown Graph DSL Parser', () => {
  it('parses simple directed connections', () => {
    const input = `
      Frontend -> Backend
      Backend -> Database
    `;
    const result = parseGraphDsl(input);

    expect(result.nodes).toHaveLength(3);
    expect(result.nodes.map((n) => n.id)).toEqual(['Frontend', 'Backend', 'Database']);
    expect(result.links).toHaveLength(2);
    expect(result.links[0]).toEqual({ source: 'Frontend', target: 'Backend', label: undefined });
    expect(result.links[1]).toEqual({ source: 'Backend', target: 'Database', label: undefined });
  });

  it('parses connections with edge labels', () => {
    const input = `
      Client -> Server: HTTP / IPC
      Server -> Database: SQL query
    `;
    const result = parseGraphDsl(input);

    expect(result.links[0].label).toBe('HTTP / IPC');
    expect(result.links[1].label).toBe('SQL query');
  });

  it('parses bracketed node names with spaces', () => {
    const input = `
      [Tauri Desktop App] -> [Rust SQLite Backend]: Tauri IPC
      [Rust SQLite Backend] -> [SQLite WAL DB]: rusqlite
    `;
    const result = parseGraphDsl(input);

    expect(result.nodes.map((n) => n.id)).toEqual([
      'Tauri Desktop App',
      'Rust SQLite Backend',
      'SQLite WAL DB',
    ]);
    expect(result.links[0].source).toBe('Tauri Desktop App');
    expect(result.links[0].target).toBe('Rust SQLite Backend');
    expect(result.links[0].label).toBe('Tauri IPC');
  });

  it('handles isolated standalone nodes', () => {
    const input = `
      [Orphan Node 1]
      NodeA -> NodeB
      [Orphan Node 2]
    `;
    const result = parseGraphDsl(input);

    expect(result.nodes).toHaveLength(4);
    expect(result.nodes.find((n) => n.id === 'Orphan Node 1')?.degree).toBe(0);
    expect(result.nodes.find((n) => n.id === 'Orphan Node 2')?.degree).toBe(0);
    expect(result.nodes.find((n) => n.id === 'NodeA')?.degree).toBe(1);
  });

  it('ignores comments and empty lines safely', () => {
    const input = `
      # This is a comment
      // Another comment style
      Node 1 -> Node 2

      % Third comment style
      Node 2 -> Node 3
    `;
    const result = parseGraphDsl(input);

    expect(result.nodes).toHaveLength(3);
    expect(result.links).toHaveLength(2);
  });

  it('handles cyclic connections and self references without infinite loops', () => {
    const input = `
      A -> B
      B -> C
      C -> A
      A -> A
    `;
    const result = parseGraphDsl(input);

    expect(result.nodes).toHaveLength(3);
    expect(result.links).toHaveLength(4);
    const nodeA = result.nodes.find((n) => n.id === 'A');
    expect(nodeA).toBeDefined();
    expect(nodeA!.degree).toBeGreaterThan(0);
  });

  it('handles malformed lines gracefully', () => {
    const input = `
      ->
      A ->
      -> B
      ValidA -> ValidB
      ::: invalid junk :::
    `;
    const result = parseGraphDsl(input);

    expect(result.nodes.some((n) => n.id === 'ValidA')).toBe(true);
    expect(result.nodes.some((n) => n.id === 'ValidB')).toBe(true);
    expect(result.links).toHaveLength(1);
  });
});
