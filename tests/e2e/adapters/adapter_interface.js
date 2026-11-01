/**
 * Adapter Interface for Hoshinote E2E Testing
 *
 * Provides a polymorphic abstraction between:
 * 1. Reference Engine (deterministic ground-truth oracle conforming to PROJECT.md contracts)
 * 2. Live Tauri App (IPC invoke bridge via HTTP/WebSocket/Playwright when running)
 */

import { HoshinoteReferenceEngine } from '../engine/hoshinote_reference.js';

export class AppAdapter {
  constructor(engineType = process.env.HOSHINOTE_E2E_TARGET || 'reference') {
    this.engineType = engineType;
    if (this.engineType === 'reference') {
      this.engine = new HoshinoteReferenceEngine();
    } else {
      // Future live Tauri IPC client
      this.engine = new HoshinoteReferenceEngine();
    }
  }

  reset() {
    this.engine.reset();
  }

  // Note CRUD (Feature 4)
  async createNote({ title, content, path, tags }) {
    return this.engine.createNote({ title, content, path, tags });
  }

  async getNote(id) {
    return this.engine.getNote(id);
  }

  async getNoteByTitle(title) {
    return this.engine.getNoteByTitle(title);
  }

  async updateNote(id, params) {
    return this.engine.updateNote(id, params);
  }

  async deleteNote(id) {
    return this.engine.deleteNote(id);
  }

  async listNotes(filterParams) {
    return this.engine.listNotes(filterParams);
  }

  async getAllTags() {
    return this.engine.getAllTags();
  }

  // Obsidian Wikilinks (Feature 5)
  parseWikilinks(text) {
    return this.engine.parseWikilinks(text);
  }

  async getBacklinks(noteId) {
    return this.engine.getBacklinks(noteId);
  }

  // FTS5 Full-Text Search (Feature 6)
  async searchNotes(query) {
    return this.engine.searchNotes(query);
  }

  // Markdown GFM Rendering (Feature 7)
  renderMarkdown(markdown) {
    return this.engine.renderMarkdown(markdown);
  }

  // MathJax TeX Rendering (Feature 8)
  renderMath(latex, displayMode) {
    return this.engine.renderMath(latex, displayMode);
  }

  parseMarkdownWithMath(content) {
    return this.engine.parseMarkdownWithMath(content);
  }

  // Interactive Graph Drawer & Filters (Features 10 & 11)
  async getGraphData() {
    return this.engine.getGraphData();
  }

  filterGraph(graphData, filterParams) {
    return this.engine.filterGraph(graphData, filterParams);
  }
}

export function createAppInstance() {
  return new AppAdapter();
}
