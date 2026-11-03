/**
 * Parser for User-Authored Markdown Graph DSL
 *
 * Supports intuitive syntax:
 *   A -> B
 *   A --> B: custom label
 *   [Source Node] -> [Target Node]: label
 *   [Isolated Node]
 * Comments starting with #, //, or % are ignored.
 */

export interface EmbeddedGraphNode {
  id: string;
  label: string;
  degree: number;
  color: string;
}

export interface EmbeddedGraphLink {
  source: string;
  target: string;
  label?: string;
}

export interface ParsedEmbeddedGraph {
  nodes: EmbeddedGraphNode[];
  links: EmbeddedGraphLink[];
}

const PALETTE = [
  '#89b4fa', // Blue
  '#a6e3a1', // Green
  '#f38ba8', // Red
  '#fab387', // Peach
  '#f9e2af', // Yellow
  '#cba6f7', // Mauve
  '#94e2d5', // Teal
  '#eba0ac', // Flamingo
];

function cleanNodeName(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export function parseGraphDsl(dsl: string | null | undefined): ParsedEmbeddedGraph {
  if (!dsl || typeof dsl !== 'string') {
    return { nodes: [], links: [] };
  }

  const lines = dsl.split(/\r?\n/);
  const nodesMap = new Map<string, { label: string; degree: number }>();
  const links: EmbeddedGraphLink[] = [];

  const ensureNode = (id: string, label?: string) => {
    if (!nodesMap.has(id)) {
      nodesMap.set(id, { label: label || id, degree: 0 });
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('//') || line.startsWith('%')) {
      continue;
    }

    // Check for edge connection: '-->', '->', '--'
    const edgeMatch = line.match(/^(.+?)(?:-->|->|--)(.+)$/);
    if (edgeMatch) {
      let sourceRaw = edgeMatch[1].trim();
      let rest = edgeMatch[2].trim();
      let label: string | undefined;

      // Ignore if source or target starts with '>' or is empty
      if (sourceRaw.startsWith('>') || rest.startsWith('>') || !sourceRaw || !rest) {
        continue;
      }

      // Extract optional edge label after colon ': '
      const colonIdx = rest.indexOf(':');
      if (colonIdx !== -1) {
        label = rest.slice(colonIdx + 1).trim();
        rest = rest.slice(0, colonIdx).trim();
      }

      const sourceId = cleanNodeName(sourceRaw);
      const targetId = cleanNodeName(rest);

      if (sourceId && targetId && sourceId !== '-' && targetId !== '-') {
        ensureNode(sourceId);
        ensureNode(targetId);

        nodesMap.get(sourceId)!.degree += 1;
        nodesMap.get(targetId)!.degree += 1;

        links.push({
          source: sourceId,
          target: targetId,
          label: label || undefined,
        });
        continue;
      }
    }

    // Check if line represents an isolated node (e.g. "[Single Node]" or "SingleNode")
    const cleaned = cleanNodeName(line);
    // Ignore lines that look like malformed syntax
    if (cleaned && !cleaned.includes(':::') && !cleaned.includes('->') && !cleaned.includes('--')) {
      ensureNode(cleaned);
    }
  }

  const nodes: EmbeddedGraphNode[] = Array.from(nodesMap.entries()).map(([id, data], idx) => ({
    id,
    label: data.label,
    degree: data.degree,
    color: PALETTE[idx % PALETTE.length],
  }));

  return { nodes, links };
}
