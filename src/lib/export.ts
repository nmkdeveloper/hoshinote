import JSZip from 'jszip';
import type { NoteWithDetails } from '../types';

/**
 * Exports a single note and all its assets/embedded images to a ZIP file.
 */
export async function exportNoteToZip(noteDetails: NoteWithDetails): Promise<Blob> {
  const { note, tags, outgoing_links, incoming_links } = noteDetails;
  const zip = new JSZip();

  // 1. Sanitize file name
  const safeTitle = note.title.replace(/[\\/:*?"<>|]/g, '_') || 'Untitled Note';

  // 2. Extract base64 embedded images into assets/ folder and rewrite markdown links
  let exportedContent = note.content;
  const assetsFolder = zip.folder('assets');
  let assetIndex = 1;

  // Regex to match data URL images: ![alt](data:image/(png|jpeg|webp|gif|svg\+xml);base64,....)
  const dataUrlRegex = /!\[([^\]]*)\]\((data:image\/([a-zA-Z0-9+]+);base64,([A-Za-z0-9+/=]+))\)/g;
  let match: RegExpExecArray | null;

  while ((match = dataUrlRegex.exec(note.content)) !== null) {
    const fullMatch = match[0];
    const alt = match[1] || `image_${assetIndex}`;
    const mimeSubtype = match[3] === 'svg+xml' ? 'svg' : match[3];
    const base64Data = match[4];
    const fileName = `${alt.replace(/[^\w-]/g, '_')}_${assetIndex}.${mimeSubtype}`;

    if (assetsFolder) {
      assetsFolder.file(fileName, base64Data, { base64: true });
    }

    // Replace data URL with local relative asset path
    exportedContent = exportedContent.replace(fullMatch, `![${alt}](./assets/${fileName})`);
    assetIndex++;
  }

  // 3. Add primary Markdown note file
  zip.file(`${safeTitle}.md`, exportedContent);

  // 4. Add structured metadata JSON
  const metadata = {
    id: note.id,
    title: note.title,
    path: note.path,
    tags,
    outgoing_links: outgoing_links.map((l) => ({
      target_title: l.raw_target,
      alias: l.alias,
      is_unresolved: l.is_unresolved,
    })),
    incoming_links: incoming_links.map((b) => ({
      source_id: b.source_id,
      source_title: b.source_title,
    })),
    created_at: note.created_at,
    updated_at: note.updated_at,
    exported_at: new Date().toISOString(),
    is_pinned: note.is_pinned,
    is_archived: note.is_archived,
  };
  zip.file('metadata.json', JSON.stringify(metadata, null, 2));

  // 5. Generate ZIP blob and trigger browser/desktop download
  const blob = await zip.generateAsync({ type: 'blob' });
  if (typeof document !== 'undefined') {
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = url;
    downloadAnchor.download = `${safeTitle}.zip`;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    URL.revokeObjectURL(url);
  }
  return blob;
}
