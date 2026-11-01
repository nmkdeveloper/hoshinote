use std::collections::HashSet;
use chrono::Utc;
use rusqlite::{params, Connection};
use uuid::Uuid;

use crate::models::{BacklinkItem, LinkItem, Note, NoteSummary, NoteWithDetails, SearchResult, TagSummary};
use crate::parser::{extract_backlink_snippet, extract_tags, extract_wikilinks};

pub fn create_note(
    conn: &Connection,
    title: String,
    content: Option<String>,
    path: Option<String>,
    tags: Option<Vec<String>>,
) -> Result<NoteWithDetails, String> {
    let trimmed_title = title.trim();
    if trimmed_title.is_empty() {
        return Err("Note title cannot be empty".to_string());
    }

    // Check duplicate title case-insensitively
    let existing_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM notes WHERE title = ?1 COLLATE NOCASE",
            [trimmed_title],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    if existing_count > 0 {
        return Err(format!("Note with title \"{}\" already exists", trimmed_title));
    }

    let note_id = Uuid::new_v4().to_string();
    let note_content = content.unwrap_or_default();
    let note_path = path.unwrap_or_else(|| "/".to_string());
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO notes (id, title, content, path, created_at, updated_at, is_pinned, is_archived)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, 0)",
        params![note_id, trimmed_title, note_content, note_path, now, now],
    )
    .map_err(|e| e.to_string())?;

    // Combine extracted tags from content with explicitly provided tags
    let extracted_tags = extract_tags(&note_content);
    let mut combined_tags_set = HashSet::new();
    let mut combined_tags = Vec::new();

    for t in extracted_tags.into_iter().chain(tags.unwrap_or_default()) {
        let trimmed = t.trim().trim_start_matches('#').to_string();
        if !trimmed.is_empty() && combined_tags_set.insert(trimmed.to_lowercase()) {
            combined_tags.push(trimmed);
        }
    }

    // Insert tags and note_tags
    for tag_name in &combined_tags {
        conn.execute(
            "INSERT OR IGNORE INTO tags (name) VALUES (?1)",
            [tag_name],
        )
        .map_err(|e| e.to_string())?;

        let tag_id: i64 = conn
            .query_row(
                "SELECT id FROM tags WHERE name = ?1 COLLATE NOCASE",
                [tag_name],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;

        conn.execute(
            "INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?1, ?2)",
            params![note_id, tag_id],
        )
        .map_err(|e| e.to_string())?;
    }

    // Extract wikilinks and insert into links
    let parsed_links = extract_wikilinks(&note_content);
    for link in parsed_links {
        let target_note_id: Option<String> = conn
            .query_row(
                "SELECT id FROM notes WHERE title = ?1 COLLATE NOCASE LIMIT 1",
                [&link.target],
                |row| row.get(0),
            )
            .ok();

        let link_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO links (id, source_id, target_id, target_title, alias, heading, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                link_id,
                note_id,
                target_note_id,
                link.target,
                link.alias,
                link.heading,
                now
            ],
        )
        .map_err(|e| e.to_string())?;
    }

    get_note(conn, &note_id)
}

pub fn get_note(conn: &Connection, id: &str) -> Result<NoteWithDetails, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, title, content, path, created_at, updated_at, is_pinned, is_archived
             FROM notes WHERE id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let note = stmt
        .query_row([id], |row| {
            let is_pinned_int: i64 = row.get(6)?;
            let is_archived_int: i64 = row.get(7)?;
            Ok(Note {
                id: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
                path: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
                is_pinned: is_pinned_int != 0,
                is_archived: is_archived_int != 0,
            })
        })
        .map_err(|_| format!("Note with id \"{}\" not found", id))?;

    // Fetch tags
    let mut tag_stmt = conn
        .prepare(
            "SELECT t.name 
             FROM tags t 
             JOIN note_tags nt ON t.id = nt.tag_id 
             WHERE nt.note_id = ?1 
             ORDER BY t.name ASC",
        )
        .map_err(|e| e.to_string())?;

    let tags: Vec<String> = tag_stmt
        .query_map([id], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // Fetch outgoing links
    let mut link_stmt = conn
        .prepare(
            "SELECT id, source_id, target_id, target_title, alias, heading
             FROM links
             WHERE source_id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let outgoing_links: Vec<LinkItem> = link_stmt
        .query_map([id], |row| {
            let link_id: String = row.get(0)?;
            let source_id: String = row.get(1)?;
            let target_id: Option<String> = row.get(2)?;
            let target_title: String = row.get(3)?;
            let alias: Option<String> = row.get(4)?;
            let heading: Option<String> = row.get(5)?;
            let is_unresolved = target_id.is_none();

            Ok(LinkItem {
                id: link_id,
                source_id,
                target_id,
                target_title: target_title.clone(),
                raw_target: Some(target_title),
                alias,
                heading,
                is_unresolved,
                is_resolved: !is_unresolved,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // Fetch incoming backlinks
    let incoming_links = get_backlinks(conn, id)?;

    Ok(NoteWithDetails {
        note,
        tags,
        outgoing_links,
        incoming_links,
    })
}

pub fn get_note_by_title(conn: &Connection, title: &str) -> Result<Option<NoteWithDetails>, String> {
    let trimmed = title.trim();
    if trimmed.is_empty() {
        return Ok(None);
    }

    let note_id: Option<String> = conn
        .query_row(
            "SELECT id FROM notes WHERE title = ?1 COLLATE NOCASE LIMIT 1",
            [trimmed],
            |row| row.get(0),
        )
        .ok();

    match note_id {
        Some(id) => get_note(conn, &id).map(Some),
        None => Ok(None),
    }
}

#[allow(clippy::too_many_arguments)]
pub fn update_note(
    conn: &Connection,
    id: &str,
    title: Option<String>,
    content: Option<String>,
    path: Option<String>,
    tags: Option<Vec<String>>,
    is_pinned: Option<bool>,
    is_archived: Option<bool>,
) -> Result<NoteWithDetails, String> {
    // Check note existence
    let existing: Note = conn
        .query_row(
            "SELECT id, title, content, path, created_at, updated_at, is_pinned, is_archived
             FROM notes WHERE id = ?1",
            [id],
            |row| {
                let p: i64 = row.get(6)?;
                let a: i64 = row.get(7)?;
                Ok(Note {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    content: row.get(2)?,
                    path: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                    is_pinned: p != 0,
                    is_archived: a != 0,
                })
            },
        )
        .map_err(|_| format!("Note with id \"{}\" not found", id))?;

    let mut title_changed = false;
    let mut new_title = existing.title.clone();

    if let Some(t) = title {
        let trimmed = t.trim().to_string();
        if trimmed.is_empty() {
            return Err("Note title cannot be empty".to_string());
        }

        if trimmed != existing.title {
            let conflict: i64 = conn
                .query_row(
                    "SELECT COUNT(*) FROM notes WHERE title = ?1 COLLATE NOCASE AND id != ?2",
                    params![&trimmed, id],
                    |row| row.get(0),
                )
                .map_err(|e| e.to_string())?;

            if conflict > 0 {
                return Err(format!("Note with title \"{}\" already exists", trimmed));
            }

            new_title = trimmed;
            title_changed = true;
        }
    }

    let new_content = content.unwrap_or(existing.content);
    let new_path = path.unwrap_or(existing.path);
    let new_pinned = is_pinned.unwrap_or(existing.is_pinned);
    let new_archived = is_archived.unwrap_or(existing.is_archived);
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE notes 
         SET title = ?1, content = ?2, path = ?3, is_pinned = ?4, is_archived = ?5, updated_at = ?6
         WHERE id = ?7",
        params![
            new_title,
            new_content,
            new_path,
            if new_pinned { 1 } else { 0 },
            if new_archived { 1 } else { 0 },
            now,
            id
        ],
    )
    .map_err(|e| e.to_string())?;

    // If title changed, update links targeting this note
    if title_changed {
        conn.execute(
            "UPDATE links SET target_title = ?1 WHERE target_id = ?2",
            params![&new_title, id],
        )
        .map_err(|e| e.to_string())?;
    }

    // Rebuild tags
    let mut combined_tags_set = HashSet::new();
    let mut final_tags = Vec::new();

    let tag_source = match tags {
        Some(explicit_tags) => {
            let extracted = extract_tags(&new_content);
            extracted.into_iter().chain(explicit_tags).collect()
        }
        None => extract_tags(&new_content),
    };

    for t in tag_source {
        let clean = t.trim().trim_start_matches('#').to_string();
        if !clean.is_empty() && combined_tags_set.insert(clean.to_lowercase()) {
            final_tags.push(clean);
        }
    }

    conn.execute("DELETE FROM note_tags WHERE note_id = ?1", [id])
        .map_err(|e| e.to_string())?;

    for tag_name in &final_tags {
        conn.execute("INSERT OR IGNORE INTO tags (name) VALUES (?1)", [tag_name])
            .map_err(|e| e.to_string())?;

        let tag_id: i64 = conn
            .query_row(
                "SELECT id FROM tags WHERE name = ?1 COLLATE NOCASE",
                [tag_name],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;

        conn.execute(
            "INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?1, ?2)",
            params![id, tag_id],
        )
        .map_err(|e| e.to_string())?;
    }

    // Rebuild outgoing links
    conn.execute("DELETE FROM links WHERE source_id = ?1", [id])
        .map_err(|e| e.to_string())?;

    let parsed_links = extract_wikilinks(&new_content);
    for link in parsed_links {
        let target_note_id: Option<String> = conn
            .query_row(
                "SELECT id FROM notes WHERE title = ?1 COLLATE NOCASE LIMIT 1",
                [&link.target],
                |row| row.get(0),
            )
            .ok();

        let link_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO links (id, source_id, target_id, target_title, alias, heading, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                link_id,
                id,
                target_note_id,
                link.target,
                link.alias,
                link.heading,
                now
            ],
        )
        .map_err(|e| e.to_string())?;
    }

    get_note(conn, id)
}

pub fn delete_note(conn: &Connection, id: &str) -> Result<(), String> {
    // Verify note exists
    let note_title: String = conn
        .query_row("SELECT title FROM notes WHERE id = ?1", [id], |row| row.get(0))
        .map_err(|_| format!("Note with id \"{}\" not found", id))?;

    // Set incoming links to unresolved dangling links
    conn.execute(
        "UPDATE links SET target_id = NULL WHERE target_id = ?1 OR target_title = ?2 COLLATE NOCASE",
        params![id, note_title],
    )
    .map_err(|e| e.to_string())?;

    // Delete note (cascades to links.source_id, note_tags, notes_fts)
    conn.execute("DELETE FROM notes WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[allow(clippy::too_many_arguments)]
pub fn list_notes(
    conn: &Connection,
    tag: Option<String>,
    is_archived: Option<bool>,
    sort_by: Option<String>,
    order: Option<String>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<NoteSummary>, String> {
    let clean_tag = tag.as_deref().map(|t| t.trim_start_matches('#').trim().to_lowercase());

    // Validate sorting
    let valid_sort_col = match sort_by.as_deref().unwrap_or("updated_at") {
        "title" => "n.title",
        "created_at" => "n.created_at",
        "is_pinned" => "n.is_pinned",
        _ => "n.updated_at",
    };

    let sort_order = if order.as_deref().unwrap_or("desc").eq_ignore_ascii_case("asc") {
        "ASC"
    } else {
        "DESC"
    };

    let mut query = String::from(
        "SELECT DISTINCT 
            n.id, n.title, n.content, n.path, n.created_at, n.updated_at, n.is_pinned, n.is_archived
         FROM notes n",
    );

    if clean_tag.is_some() {
        query.push_str(" JOIN note_tags nt ON n.id = nt.note_id JOIN tags t ON nt.tag_id = t.id");
    }

    let mut conditions = Vec::new();

    if let Some(archived) = is_archived {
        conditions.push(format!("n.is_archived = {}", if archived { 1 } else { 0 }));
    }

    if let Some(ref ct) = clean_tag {
        let escaped = ct.replace('\'', "''");
        conditions.push(format!("LOWER(t.name) = '{}'", escaped));
    }

    if !conditions.is_empty() {
        query.push_str(" WHERE ");
        query.push_str(&conditions.join(" AND "));
    }

    query.push_str(&format!(" ORDER BY {} {}", valid_sort_col, sort_order));

    if let Some(lim) = limit {
        if lim >= 0 {
            query.push_str(&format!(" LIMIT {}", lim));
            if let Some(off) = offset {
                if off > 0 {
                    query.push_str(&format!(" OFFSET {}", off));
                }
            }
        }
    } else if let Some(off) = offset {
        if off > 0 {
            query.push_str(&format!(" LIMIT -1 OFFSET {}", off));
        }
    }

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let mut rows = stmt.query([]).map_err(|e| e.to_string())?;

    let mut summaries = Vec::new();
    while let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let id: String = row.get(0).map_err(|e| e.to_string())?;
        let title: String = row.get(1).map_err(|e| e.to_string())?;
        let content: String = row.get(2).map_err(|e| e.to_string())?;
        let path: String = row.get(3).map_err(|e| e.to_string())?;
        let created_at: String = row.get(4).map_err(|e| e.to_string())?;
        let updated_at: String = row.get(5).map_err(|e| e.to_string())?;
        let is_pinned: bool = row.get::<_, i64>(6).map_err(|e| e.to_string())? != 0;
        let is_archived_val: bool = row.get::<_, i64>(7).map_err(|e| e.to_string())? != 0;

        let first_para = content.split("\n\n").next().unwrap_or("");
        let snippet = first_para.trim_start_matches(['#', ' ']).chars().take(80).collect();

        summaries.push((
            id,
            title,
            path,
            snippet,
            created_at,
            updated_at,
            is_pinned,
            is_archived_val,
        ));
    }

    let mut result = Vec::with_capacity(summaries.len());
    for (id, title, path, snippet, created_at, updated_at, is_pinned, is_archived_val) in summaries {
        let mut tag_stmt = conn
            .prepare("SELECT t.name FROM tags t JOIN note_tags nt ON t.id = nt.tag_id WHERE nt.note_id = ?1")
            .map_err(|e| e.to_string())?;
        let tags: Vec<String> = tag_stmt
            .query_map([&id], |r| r.get(0))
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;

        let conn_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM links WHERE source_id = ?1 OR target_id = ?1 OR target_title = ?2 COLLATE NOCASE",
                params![&id, &title],
                |r| r.get(0),
            )
            .unwrap_or(0);

        result.push(NoteSummary {
            id,
            title,
            path,
            snippet,
            tags,
            created_at: Some(created_at),
            updated_at,
            is_pinned,
            is_archived: is_archived_val,
            connections_count: Some(conn_count),
        });
    }

    Ok(result)
}

pub fn search_notes(conn: &Connection, query: &str) -> Result<Vec<SearchResult>, String> {
    crate::db::search::search_notes(conn, query).map_err(|e| e.to_string())
}

pub fn get_backlinks(conn: &Connection, note_id: &str) -> Result<Vec<BacklinkItem>, String> {
    let target_title: Option<String> = conn
        .query_row("SELECT title FROM notes WHERE id = ?1", [note_id], |row| row.get(0))
        .ok();

    let title_param = target_title.unwrap_or_default();

    let mut stmt = conn
        .prepare(
            "SELECT 
                l.id,
                l.source_id,
                n.title AS source_title,
                l.alias,
                l.heading,
                n.content AS source_content
             FROM links l
             JOIN notes n ON l.source_id = n.id
             WHERE (l.target_id = ?1 OR (l.target_id IS NULL AND l.target_title = ?2 COLLATE NOCASE))
               AND n.is_archived = 0",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![note_id, title_param], |row| {
            let link_id: String = row.get(0)?;
            let source_id: String = row.get(1)?;
            let source_title: String = row.get(2)?;
            let alias: Option<String> = row.get(3)?;
            let heading: Option<String> = row.get(4)?;
            let source_content: String = row.get(5)?;

            let snippet = extract_backlink_snippet(&source_content, &title_param, 120);

            Ok(BacklinkItem {
                link_id: Some(link_id),
                source_id: source_id.clone(),
                source_title: source_title.clone(),
                note_id: Some(source_id),
                note_title: Some(source_title),
                alias,
                heading,
                snippet: snippet.clone(),
                context_snippet: Some(snippet),
            })
        })
        .map_err(|e| e.to_string())?;

    let mut backlinks = Vec::new();
    for r in rows {
        backlinks.push(r.map_err(|e| e.to_string())?);
    }

    Ok(backlinks)
}

pub fn get_all_tags(conn: &Connection) -> Result<Vec<TagSummary>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT t.name, COUNT(nt.note_id) AS count
             FROM tags t
             JOIN note_tags nt ON t.id = nt.tag_id
             JOIN notes n ON nt.note_id = n.id
             WHERE n.is_archived = 0
             GROUP BY t.id, t.name
             HAVING count > 0
             ORDER BY count DESC, t.name COLLATE NOCASE ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            let name: String = row.get(0)?;
            let count: i64 = row.get(1)?;
            Ok(TagSummary {
                name,
                count,
                note_count: Some(count),
            })
        })
        .map_err(|e| e.to_string())?;

    let mut tags = Vec::new();
    for r in rows {
        tags.push(r.map_err(|e| e.to_string())?);
    }
    Ok(tags)
}
