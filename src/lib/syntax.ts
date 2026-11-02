import { escapeHtml } from './math';

const KEYWORDS = new Set([
  'function', 'const', 'let', 'var', 'return', 'if', 'else', 'for', 'while', 'do',
  'switch', 'case', 'break', 'continue', 'default', 'try', 'catch', 'finally', 'throw',
  'class', 'extends', 'super', 'this', 'new', 'import', 'export', 'from', 'as',
  'async', 'await', 'yield', 'typeof', 'instanceof', 'in', 'of',
  // Rust
  'pub', 'fn', 'struct', 'enum', 'impl', 'trait', 'type', 'use', 'mod', 'mut',
  'ref', 'match', 'move', 'where', 'crate', 'self', 'Self',
  // Python
  'def', 'elif', 'pass', 'lambda', 'with', 'global', 'nonlocal', 'assert', 'raise',
  // SQL
  'select', 'insert', 'update', 'delete', 'create', 'table', 'drop', 'alter', 'where',
  'join', 'left', 'right', 'inner', 'outer', 'group', 'by', 'order', 'limit', 'offset',
  'primary', 'key', 'references', 'values', 'into', 'and', 'or', 'not', 'distinct',
]);

const TYPES = new Set([
  'string', 'number', 'boolean', 'any', 'void', 'never', 'unknown', 'object',
  'i8', 'i16', 'i32', 'i64', 'i128', 'isize',
  'u8', 'u16', 'u32', 'u64', 'u128', 'usize',
  'f32', 'f64', 'bool', 'char', 'str', 'String', 'Vec', 'Option', 'Result',
  'int', 'float', 'list', 'dict', 'tuple', 'set',
]);

const BOOLEANS_AND_CONSTS = new Set([
  'true', 'false', 'null', 'undefined', 'None', 'True', 'False', 'Ok', 'Err', 'Some', 'nil',
]);

/**
 * Highlights a block of code with HTML syntax spans.
 */
export function highlightCode(code: string, _lang?: string): string {
  if (!code) return '';

  const lines = code.split('\n');
  const highlightedLines = lines.map((line) => {
    // 1. Line comment check
    let commentIdx = -1;
    if (line.includes('//')) {
      commentIdx = line.indexOf('//');
    } else if (line.trim().startsWith('#')) {
      commentIdx = line.indexOf('#');
    } else if (line.includes('--')) {
      commentIdx = line.indexOf('--');
    }

    if (commentIdx !== -1) {
      const codePart = line.slice(0, commentIdx);
      const commentPart = line.slice(commentIdx);
      return highlightLineTokens(codePart) + `<span class="token-comment">${escapeHtml(commentPart)}</span>`;
    }

    return highlightLineTokens(line);
  });

  return highlightedLines.join('\n');
}

function highlightLineTokens(line: string): string {
  // Regex to match string literals, words (identifiers/keywords), numbers, and other tokens
  const tokenRegex = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b[a-zA-Z_]\w*\b|\b\d+(?:\.\d+)?\b|[^\s\w"']+)/g;

  return line.replace(tokenRegex, (match) => {
    if (match.startsWith('"') || match.startsWith("'") || match.startsWith('`')) {
      return `<span class="token-string">${escapeHtml(match)}</span>`;
    }
    if (/^\d+(?:\.\d+)?$/.test(match)) {
      return `<span class="token-number">${match}</span>`;
    }
    const lower = match.toLowerCase();
    if (KEYWORDS.has(match) || KEYWORDS.has(lower)) {
      return `<span class="token-keyword">${match}</span>`;
    }
    if (TYPES.has(match)) {
      return `<span class="token-type">${match}</span>`;
    }
    if (BOOLEANS_AND_CONSTS.has(match)) {
      return `<span class="token-boolean">${match}</span>`;
    }
    return escapeHtml(match);
  });
}
