use std::collections::HashSet;
use std::sync::LazyLock;
use regex::Regex;
use super::stripper::strip_code_and_math;

static RE_TAG: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"(?:\A|\s|[\(\[\{\'"])#([a-zA-Z0-9_\-]+(?:/[a-zA-Z0-9_\-]+)*)"#)
        .expect("Valid regex: tag")
});

/// Extracts all hashtags (including nested #nested/tag), excluding pure numbers (#123),
/// URLs, and Markdown headings.
pub fn extract_tags(content: &str) -> Vec<String> {
    let stripped = strip_code_and_math(content);
    let mut tags = Vec::new();
    let mut seen = HashSet::new();

    for cap in RE_TAG.captures_iter(&stripped) {
        let tag = &cap[1];
        let clean: String = tag.chars().filter(|c| *c != '/' && *c != '-' && *c != '_').collect();
        if clean.is_empty() || clean.chars().all(|c| c.is_ascii_digit()) {
            continue;
        }

        let lower = tag.to_lowercase();
        if seen.insert(lower) {
            tags.push(tag.to_string());
        }
    }

    tags
}
