/// Extracts a UTF-8 safe context snippet around a wikilink or keyword,
/// snapping to word boundaries and producing an excerpt.
pub fn extract_backlink_snippet(content: &str, target_title: &str, max_chars: usize) -> String {
    if content.trim().is_empty() {
        return String::new();
    }

    let target_lower = target_title.to_lowercase();
    let content_lower = content.to_lowercase();

    let search_token = format!("[[{}", target_lower);
    let (token_start, token_end) = match content_lower.find(&search_token) {
        Some(idx) => {
            let close_offset = content[idx..]
                .find("]]")
                .map(|o| idx + o + 2)
                .unwrap_or(idx + search_token.len());
            (idx, close_offset)
        }
        None => match content_lower.find(&target_lower) {
            Some(idx) => (idx, idx + target_title.len()),
            None => {
                let mut end = content.len().min(max_chars);
                while !content.is_char_boundary(end) {
                    end -= 1;
                }
                let snippet = content[..end].trim().replace('\n', " ");
                return if content.len() > end {
                    format!("{}...", snippet)
                } else {
                    snippet
                };
            }
        },
    };

    let token_len = token_end - token_start;
    let radius = if max_chars > token_len {
        ((max_chars - token_len) / 2).max(35)
    } else {
        35
    };

    let mut start = token_start.saturating_sub(radius);
    let mut end = (token_end + radius).min(content.len());

    while !content.is_char_boundary(start) {
        start = start.saturating_sub(1);
    }
    while !content.is_char_boundary(end) {
        end = (end + 1).min(content.len());
    }

    // Snap start forward to word boundary
    if start > 0 {
        if let Some(space_offset) = content[start..token_start].find(' ') {
            start += space_offset + 1;
        }
    }

    // Snap end backward to word boundary
    if end < content.len() {
        if let Some(space_offset) = content[token_end..end].rfind(' ') {
            end = token_end + space_offset;
        }
    }

    while !content.is_char_boundary(start) {
        start -= 1;
    }
    while !content.is_char_boundary(end) {
        end -= 1;
    }

    let mut snippet = content[start..end].trim().replace('\n', " ");
    if start > 0 {
        snippet = format!("...{}", snippet);
    }
    if end < content.len() {
        snippet = format!("{}...", snippet);
    }

    snippet
}
