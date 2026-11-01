use std::collections::{BTreeMap, HashMap, HashSet};
use rusqlite::Connection;
use crate::models::{GraphData, GraphLink, GraphNode};

pub fn get_graph_data(conn: &Connection) -> Result<GraphData, String> {
    // 1. Fetch active notes
    let mut stmt = conn
        .prepare("SELECT id, title FROM notes WHERE is_archived = 0")
        .map_err(|e| e.to_string())?;

    let notes: Vec<(String, String)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let real_ids: HashSet<String> = notes.iter().map(|(id, _)| id.clone()).collect();

    // 2. Fetch tags map
    let mut stmt = conn
        .prepare(
            "SELECT nt.note_id, t.name 
             FROM note_tags nt 
             JOIN tags t ON nt.tag_id = t.id 
             JOIN notes n ON nt.note_id = n.id 
             WHERE n.is_archived = 0",
        )
        .map_err(|e| e.to_string())?;

    let mut note_tags_map: HashMap<String, Vec<String>> = HashMap::new();
    let mut rows = stmt.query([]).map_err(|e| e.to_string())?;
    while let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let note_id: String = row.get(0).map_err(|e| e.to_string())?;
        let tag_name: String = row.get(1).map_err(|e| e.to_string())?;
        note_tags_map.entry(note_id).or_default().push(tag_name);
    }

    // 3. Fetch active links
    let mut stmt = conn
        .prepare(
            "SELECT l.source_id, l.target_id, l.target_title 
             FROM links l 
             JOIN notes n ON l.source_id = n.id 
             WHERE n.is_archived = 0",
        )
        .map_err(|e| e.to_string())?;

    let mut degrees: HashMap<String, i64> = HashMap::new();
    let mut phantom_titles: BTreeMap<String, String> = BTreeMap::new();
    let mut graph_links = Vec::new();

    let mut rows = stmt.query([]).map_err(|e| e.to_string())?;
    while let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let source_id: String = row.get(0).map_err(|e| e.to_string())?;
        let target_id: Option<String> = row.get(1).map_err(|e| e.to_string())?;
        let target_title: String = row.get(2).map_err(|e| e.to_string())?;

        match target_id {
            Some(tid) if real_ids.contains(&tid) => {
                *degrees.entry(source_id.clone()).or_insert(0) += 1;
                *degrees.entry(tid.clone()).or_insert(0) += 1;
                graph_links.push(GraphLink {
                    source: source_id,
                    target: tid,
                    is_unresolved: false,
                });
            }
            _ => {
                let canonical_title = phantom_titles
                    .entry(target_title.to_lowercase())
                    .or_insert(target_title)
                    .clone();
                let phantom_id = format!("unresolved:{}", canonical_title);

                *degrees.entry(source_id.clone()).or_insert(0) += 1;
                *degrees.entry(phantom_id.clone()).or_insert(0) += 1;
                graph_links.push(GraphLink {
                    source: source_id,
                    target: phantom_id,
                    is_unresolved: true,
                });
            }
        }
    }

    // 4. Construct concrete nodes
    let mut graph_nodes = Vec::new();
    for (id, title) in notes {
        let tags = note_tags_map.remove(&id).unwrap_or_default();
        let deg = degrees.get(&id).copied().unwrap_or(0);
        let group = tags.first().map(|t| t.to_lowercase()).unwrap_or_else(|| "general".to_string());
        let radius = 4.0 + 2.0 * deg as f64;

        graph_nodes.push(GraphNode {
            id,
            title,
            tags,
            connections_count: deg,
            radius,
            is_orphan: deg == 0,
            is_unresolved: false,
            group,
        });
    }

    // 5. Construct phantom nodes
    for (_lower, orig_title) in phantom_titles {
        let phantom_id = format!("unresolved:{}", orig_title);
        let deg = degrees.get(&phantom_id).copied().unwrap_or(1);
        let radius = 4.0;

        graph_nodes.push(GraphNode {
            id: phantom_id,
            title: orig_title,
            tags: Vec::new(),
            connections_count: deg,
            radius,
            is_orphan: false,
            is_unresolved: true,
            group: "draft".to_string(),
        });
    }

    Ok(GraphData {
        nodes: graph_nodes,
        links: graph_links,
    })
}
