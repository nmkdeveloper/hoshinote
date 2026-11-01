export interface Note {
  id: string;
  title: string;
  content: string;
  path: string;
  created_at: string;
  updated_at: string;
  is_pinned: boolean;
  is_archived: boolean;
}

export interface LinkItem {
  id: string;
  source_id: string;
  target_id?: string | null;
  raw_target: string;
  alias?: string | null;
  heading?: string | null;
  is_unresolved: boolean;
}

export interface BacklinkItem {
  source_id?: string;
  source_title?: string;
  snippet?: string;
  note_id?: string;
  note_title?: string;
  context_snippet?: string;
}

export interface NoteSummary {
  id: string;
  title: string;
  path: string;
  snippet: string;
  tags: string[];
  updated_at: string;
  is_pinned: boolean;
  is_archived: boolean;
  connections_count?: number;
}

export interface NoteWithDetails {
  note: Note;
  tags: string[];
  outgoing_links: LinkItem[];
  incoming_links: BacklinkItem[];
}

export interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  rank: number;
  matches_count?: number;
}

export interface TagSummary {
  name: string;
  count: number;
}

export interface GraphNode {
  id: string;
  title: string;
  tags: string[];
  connections_count: number;
  is_orphan: boolean;
  is_unresolved: boolean;
  group: string;
  radius?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  is_unresolved: boolean;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface CreateNoteInput {
  title: string;
  content?: string;
  path?: string;
  tags?: string[];
}

export interface UpdateNoteInput {
  title?: string;
  content?: string;
  path?: string;
  tags?: string[];
  is_pinned?: boolean;
  is_archived?: boolean;
}

export interface ListNotesFilter {
  tag?: string;
  is_archived?: boolean;
  sort_by?: 'title' | 'created_at' | 'updated_at' | 'is_pinned' | string;
  order?: 'asc' | 'desc' | 'ASC' | 'DESC' | string;
  limit?: number;
  offset?: number;
}
