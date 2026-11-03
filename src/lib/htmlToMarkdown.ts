/**
 * HTML to Markdown Serializer
 * Converts rendered preview DOM/HTML back into clean Markdown.
 * Preserves MathJax formulas ($...$), graph blocks (```graph), and Obsidian wikilinks ([[...]]).
 */

export function htmlToMarkdown(html: string | null | undefined): string {
  if (!html || typeof html !== 'string') return '';

  // Node.js test environment or Browser DOM parsing
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    return nodeToMarkdown(doc.body).trim();
  } else if (typeof document !== 'undefined') {
    const container = document.createElement('div');
    container.innerHTML = html;
    return nodeToMarkdown(container).trim();
  }

  // Fallback regex-based converter for environments without DOM
  return fallbackRegexHtmlToMarkdown(html);
}

function nodeToMarkdown(node: Node): string {
  if (node.nodeType === 3) {
    // Text node
    return node.textContent || '';
  }

  if (node.nodeType !== 1) {
    return '';
  }

  const el = node as HTMLElement;
  const tagName = el.tagName.toLowerCase();

  // 1. MathJax Display Block
  if (el.classList.contains('math-display')) {
    const svg = el.querySelector('svg[data-latex]');
    const latex = svg?.getAttribute('data-latex') || el.getAttribute('data-latex') || '';
    return `\n\n$$\n${latex}\n$$\n\n`;
  }

  // 2. MathJax Inline SVG
  if (tagName === 'svg' && (el.classList.contains('math-inline') || el.classList.contains('math-block'))) {
    const latex = el.getAttribute('data-latex') || '';
    if (el.classList.contains('math-block')) {
      return `\n\n$$\n${latex}\n$$\n\n`;
    }
    return `$${latex}$`;
  }

  // 3. Embedded Graph Block
  if (el.classList.contains('hoshinote-embedded-graph')) {
    const encoded = el.getAttribute('data-graph-source') || '';
    const source = decodeURIComponent(encoded);
    return `\n\n\`\`\`graph\n${source}\n\`\`\`\n\n`;
  }

  // 4. Embedded Mermaid Block
  if (el.classList.contains('hoshinote-embedded-mermaid')) {
    const encoded = el.getAttribute('data-mermaid-source') || '';
    const source = decodeURIComponent(encoded);
    return `\n\n\`\`\`mermaid\n${source}\n\`\`\`\n\n`;
  }

  // 5. Codeblock Wrapper
  if (el.classList.contains('codeblock-wrapper')) {
    const codeEl = el.querySelector('pre code');
    const langMatch = codeEl?.className.match(/language-([a-zA-Z0-9_-]+)/);
    const lang = langMatch ? langMatch[1] : '';
    const code = codeEl?.textContent || '';
    return `\n\n\`\`\`${lang}\n${code}\n\`\`\`\n\n`;
  }

  // 6. Wikilink
  if (tagName === 'a' && el.classList.contains('wikilink')) {
    const target = el.getAttribute('data-target') || el.textContent || '';
    const alias = el.getAttribute('data-alias');
    if (alias && alias !== target) {
      return `[[${target}|${alias}]]`;
    }
    return `[[${target}]]`;
  }

  // Traverse children
  let inner = '';
  for (let i = 0; i < el.childNodes.length; i++) {
    inner += nodeToMarkdown(el.childNodes[i]);
  }

  switch (tagName) {
    case 'h1':
      return `\n\n# ${inner.trim()}\n\n`;
    case 'h2':
      return `\n\n## ${inner.trim()}\n\n`;
    case 'h3':
      return `\n\n### ${inner.trim()}\n\n`;
    case 'h4':
      return `\n\n#### ${inner.trim()}\n\n`;
    case 'h5':
      return `\n\n##### ${inner.trim()}\n\n`;
    case 'h6':
      return `\n\n###### ${inner.trim()}\n\n`;
    case 'p':
      return `\n\n${inner.trim()}\n\n`;
    case 'strong':
    case 'b':
      return `**${inner}**`;
    case 'em':
    case 'i':
      return `*${inner}*`;
    case 'del':
    case 's':
      return `~~${inner}~~`;
    case 'code':
      return `\`${inner}\``;
    case 'li':
      return `- ${inner.trim()}\n`;
    case 'ul':
    case 'ol':
      return `\n\n${inner.trim()}\n\n`;
    case 'blockquote':
      return `\n\n> ${inner.trim()}\n\n`;
    case 'br':
      return '\n';
    case 'hr':
      return '\n\n---\n\n';
    default:
      return inner;
  }
}

function fallbackRegexHtmlToMarkdown(html: string): string {
  let s = html;

  // Math display ($$ in replacement string must be escaped as $$$$)
  s = s.replace(/<div class="math-display">[\s\S]*?<svg[^>]*data-latex="([^"]*)"[\s\S]*?<\/div>/gi, '$$$$\n$1\n$$$$');
  s = s.replace(/<svg class="math-inline"[^>]*data-latex="([^"]*)"[\s\S]*?<\/svg>/gi, '$$$1$$');

  // Embedded Graph
  s = s.replace(/<div class="hoshinote-embedded-graph"[^>]*data-graph-source="([^"]*)"[^>]*><\/div>/gi, (_, enc) => {
    return `\`\`\`graph\n${decodeURIComponent(enc)}\n\`\`\``;
  });

  // Wikilink
  s = s.replace(/<a class="wikilink"[^>]*data-target="([^"]*)"[^>]*>[\s\S]*?<\/a>/gi, '[[$1]]');

  // Headings
  s = s.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '# $1\n\n');
  s = s.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '## $1\n\n');
  s = s.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '### $1\n\n');

  // Inline
  s = s.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**');
  s = s.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*');
  s = s.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');

  // Paragraphs & lists
  s = s.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n');
  s = s.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n');

  // Strip remaining tags
  s = s.replace(/<[^>]+>/g, '');
  return s.trim();
}
