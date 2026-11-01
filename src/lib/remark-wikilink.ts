/**
 * Obsidian Wikilinks Parser & AST Plugin for Hoshinote
 *
 * Supports:
 * - [[Target Note]]
 * - [[Target Note|Custom Alias]]
 * - [[Target Note#Section]]
 * - [[Target Note#Section|Custom Alias]]
 */

import { escapeHtml } from './math';

export interface ParsedWikilink {
  raw: string;
  target: string;
  heading: string | null;
  alias: string | null;
  displayText: string;
  isResolved?: boolean;
}

export const RE_WIKILINK = /\[\[([^\]\n]+?)\]\]/g;

/**
 * Parses the inner content of a wikilink e.g. "Target#Heading|Alias"
 */
export function parseWikilinkInner(inner: string): Omit<ParsedWikilink, 'raw'> {
  const trimmed = inner.trim();
  let target = trimmed;
  let alias: string | null = null;
  let heading: string | null = null;

  // Check alias pipe '|'
  const pipeIdx = trimmed.indexOf('|');
  let linkPart = trimmed;
  if (pipeIdx !== -1) {
    linkPart = trimmed.slice(0, pipeIdx).trim();
    alias = trimmed.slice(pipeIdx + 1).trim();
  }

  // Check heading hash '#'
  const hashIdx = linkPart.indexOf('#');
  if (hashIdx !== -1) {
    target = linkPart.slice(0, hashIdx).trim();
    heading = linkPart.slice(hashIdx + 1).trim();
  } else {
    target = linkPart;
  }

  const displayText = alias || (heading ? `${target} > ${heading}` : target);

  return {
    target,
    heading: heading || null,
    alias: alias || null,
    displayText,
  };
}

/**
 * Extracts all wikilinks from a given text string.
 */
export function extractWikilinks(text: string): ParsedWikilink[] {
  if (!text) return [];
  const results: ParsedWikilink[] = [];
  const regex = new RegExp(RE_WIKILINK.source, 'g');
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const raw = match[0];
    const inner = match[1].trim();
    if (!inner) continue;

    const parsed = parseWikilinkInner(inner);
    if (!parsed.target) continue;

    results.push({
      raw,
      ...parsed,
    });
  }

  return results;
}

/**
 * Replaces [[wikilinks]] in HTML text with structured <a> tags.
 */
export function renderWikilinksToHtml(text: string, existingTitles?: string[]): string {
  if (!text || !text.includes('[[')) return text;

  const lowerExisting = (existingTitles || []).map((t) => t.toLowerCase());

  return text.replace(RE_WIKILINK, (match, inner) => {
    const trimmed = inner.trim();
    if (!trimmed) return match;

    const { target, heading, alias, displayText } = parseWikilinkInner(trimmed);
    if (!target) return match;

    const isResolved = lowerExisting.length === 0 || lowerExisting.includes(target.toLowerCase());
    const safeTarget = escapeHtml(target);
    const safeDisplay = escapeHtml(displayText);
    const safeHeading = heading ? escapeHtml(heading) : '';
    const safeAlias = alias ? escapeHtml(alias) : '';

    const headingAttr = safeHeading ? ` data-heading="${safeHeading}"` : '';
    const aliasAttr = safeAlias ? ` data-alias="${safeAlias}"` : '';
    const unresolvedAttr = !isResolved ? ` data-unresolved="true"` : '';
    const className = isResolved ? 'wikilink' : 'wikilink wikilink-unresolved';

    return `<a class="${className}" data-target="${safeTarget}"${headingAttr}${aliasAttr}${unresolvedAttr} href="#/notes/${encodeURIComponent(target)}">${safeDisplay}</a>`;
  });
}
