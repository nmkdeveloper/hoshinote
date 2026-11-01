use rusqlite::Connection;
use crate::models::SearchResult;

/// Sanitizes user search input to prevent SQLite FTS5 syntax errors and crash vectors.
pub fn sanitize_fts5_query(input: &str) -> String {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return String::new();
    }

    let mut tokens = Vec::new();
    let mut in_quote = false;
    let mut current_token = String::new();

    for ch in trimmed.chars() {
        match ch {
            '"' => {
                in_quote = !in_quote;
                if !in_quote && !current_token.trim().is_empty() {
                    let cleaned = current_token.replace('"', "\"\"");
                    tokens.push(format!("\"{}\"", cleaned));
                    current_token.clear();
                }
            }
            c if c.is_whitespace() && !in_quote => {
                if !current_token.trim().is_empty() {
                    let cleaned = clean_unquoted_token(&current_token);
                    if !cleaned.is_empty() {
                        tokens.push(format!("\"{}\"*", cleaned));
                    }
                    current_token.clear();
                }
            }
            _ => {
                current_token.push(ch);
            }
        }
    }

    if !current_token.trim().is_empty() {
        let cleaned = clean_unquoted_token(&current_token);
        if !cleaned.is_empty() {
            tokens.push(format!("\"{}\"*", cleaned));
        }
    }

    tokens.join(" ")
}

fn clean_unquoted_token(token: &str) -> String {
    let forbidden = ['(', ')', '{', '}', '[', ']', ':', '+', '*', '^', '~', '\'', '"', '\\'];
    let filtered: String = token.chars().filter(|c| !forbidden.contains(c)).collect();
    let trimmed = filtered.trim();
    if trimmed.is_empty() {
        return String::new();
    }
    // Disarm isolated boolean operators by quoting them
    if trimmed.eq_ignore_ascii_case("AND")
        || trimmed.eq_ignore_ascii_case("OR")
        || trimmed.eq_ignore_ascii_case("NOT")
    {
        return format!("\"{}\"", trimmed);
    }
    trimmed.to_string()
}

/// Executes full-text search against `notes_fts` using BM25 ranking and snippet generation,
/// with graceful fallback to `LIKE` on invalid queries or syntax anomalies.
pub fn search_notes(conn: &Connection, query: &str) -> Result<Vec<SearchResult>, rusqlite::Error> {
    let trimmed = query.trim();
    if trimmed.is_empty() {
        return Ok(Vec::new());
    }

    let sanitized = sanitize_fts5_query(trimmed);
    if sanitized.is_empty() {
        return search_notes_fallback(conn, trimmed);
    }

    let sql = "
        SELECT 
            n.id,
            n.title,
            snippet(notes_fts, 2, '<mark>', '</mark>', '...', 24) AS snippet,
            bm25(notes_fts, 0.0, 10.0, 1.0) AS raw_rank,
            n.updated_at
        FROM notes_fts
        JOIN notes n ON n.id = notes_fts.note_id
        WHERE notes_fts MATCH ?1 AND n.is_archived = 0
        ORDER BY raw_rank ASC
        LIMIT 50;
    ";

    let mut stmt = match conn.prepare(sql) {
        Ok(s) => s,
        Err(_) => return search_notes_fallback(conn, trimmed),
    };

    let result = stmt.query_map([&sanitized], |row| {
        let id: String = row.get(0)?;
        let title: String = row.get(1)?;
        let snippet: String = row.get(2)?;
        let raw_rank: f64 = row.get(3)?;
        let updated_at: String = row.get(4)?;

        // Negate negative BM25 score to make it a positive score where higher = more relevant
        let rank = if raw_rank < 0.0 { -raw_rank } else { 1.0 };

        Ok(SearchResult {
            id,
            title,
            snippet,
            rank,
            updated_at: Some(updated_at),
            matches_count: Some(1),
        })
    });

    match result {
        Ok(rows) => {
            let mut results = Vec::new();
            for r in rows {
                results.push(r?);
            }
            if results.is_empty() {
                // If FTS returned nothing (e.g. word boundary or specific token mismatch), try fallback
                search_notes_fallback(conn, trimmed)
            } else {
                Ok(results)
            }
        }
        Err(_) => search_notes_fallback(conn, trimmed),
    }
}

fn search_notes_fallback(conn: &Connection, query: &str) -> Result<Vec<SearchResult>, rusqlite::Error> {
    let pattern = format!("%{}%", query.trim());
    let sql = "
        SELECT 
            id,
            title,
            substr(content, 1, 100) AS snippet,
            CASE WHEN title LIKE ?1 THEN 10.0 ELSE 1.0 END AS rank,
            updated_at
        FROM notes
        WHERE (title LIKE ?1 OR content LIKE ?1) AND is_archived = 0
        ORDER BY rank DESC, updated_at DESC
        LIMIT 50;
    ";

    let mut stmt = conn.prepare(sql)?;
    let rows = stmt.query_map([&pattern], |row| {
        let id: String = row.get(0)?;
        let title: String = row.get(1)?;
        let snippet: String = row.get(2)?;
        let rank: f64 = row.get(3)?;
        let updated_at: String = row.get(4)?;

        Ok(SearchResult {
            id,
            title,
            snippet,
            rank,
            updated_at: Some(updated_at),
            matches_count: Some(1),
        })
    })?;

    let mut results = Vec::new();
    for r in rows {
        results.push(r?);
    }
    Ok(results)
}
