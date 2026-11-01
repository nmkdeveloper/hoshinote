use std::sync::LazyLock;
use regex::Regex;
use super::stripper::strip_code_and_math;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ParsedWikilink {
    pub raw: String,
    pub target: String,
    pub heading: Option<String>,
    pub alias: Option<String>,
}

static RE_WIKILINK: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"\[\[([^\]|#\n]+?)(?:#([^\]|\n]*?))?(?:\|([^\]\n]*?))?\]\]")
        .expect("Valid regex: wikilink")
});

/// Extracts all Obsidian-style wikilinks from Markdown content, ignoring those inside code/math.
pub fn extract_wikilinks(content: &str) -> Vec<ParsedWikilink> {
    let stripped = strip_code_and_math(content);
    let mut links = Vec::new();

    for cap in RE_WIKILINK.captures_iter(&stripped) {
        let raw_target = cap.get(1).map(|m| m.as_str().trim()).unwrap_or("");
        if raw_target.is_empty() {
            continue;
        }

        let heading = cap.get(2)
            .map(|m| m.as_str().trim())
            .filter(|s| !s.is_empty())
            .map(String::from);

        let alias = cap.get(3)
            .map(|m| m.as_str().trim())
            .filter(|s| !s.is_empty())
            .map(String::from);

        links.push(ParsedWikilink {
            raw: cap[0].to_string(),
            target: raw_target.to_string(),
            heading,
            alias,
        });
    }

    links
}
