use crate::parser::*;

#[test]
fn test_wikilink_syntax_variants() {
    let content = "Check [[Simple Note]] and [[Note With Alias|Custom Label]] \
                   also [[Heading Note#Section Title]] \
                   and [[Deep Note#Anchor|Full Alias]].";
    let links = extract_wikilinks(content);
    assert_eq!(links.len(), 4);

    assert_eq!(links[0].target, "Simple Note");
    assert_eq!(links[0].heading, None);
    assert_eq!(links[0].alias, None);

    assert_eq!(links[1].target, "Note With Alias");
    assert_eq!(links[1].heading, None);
    assert_eq!(links[1].alias, Some("Custom Label".to_string()));

    assert_eq!(links[2].target, "Heading Note");
    assert_eq!(links[2].heading, Some("Section Title".to_string()));
    assert_eq!(links[2].alias, None);

    assert_eq!(links[3].target, "Deep Note");
    assert_eq!(links[3].heading, Some("Anchor".to_string()));
    assert_eq!(links[3].alias, Some("Full Alias".to_string()));
}

#[test]
fn test_wikilink_code_and_math_exclusion() {
    let content = r#"
Here is real link: [[Real Target]]
Inline code: `[[Ignored In Code]]`
Fenced code block:
```rust
let x = "[[Ignored In Fenced]]";
```
Display math:
$$
\int [[Ignored In Display Math]] dx
$$
Inline math:
$E = mc^2 + [[Ignored In Inline Math]]$

Currency protection:
We budgeted $20 for [[Coffee Fund]] and $30 for [[Book Fund]].
"#;
    let links = extract_wikilinks(content);
    let targets: Vec<String> = links.into_iter().map(|l| l.target).collect();

    assert!(targets.contains(&"Real Target".to_string()));
    assert!(targets.contains(&"Coffee Fund".to_string()));
    assert!(targets.contains(&"Book Fund".to_string()));

    assert!(!targets.contains(&"Ignored In Code".to_string()));
    assert!(!targets.contains(&"Ignored In Fenced".to_string()));
    assert!(!targets.contains(&"Ignored In Display Math".to_string()));
    assert!(!targets.contains(&"Ignored In Inline Math".to_string()));
}

#[test]
fn test_tag_extraction_and_nesting() {
    let content = r#"
# Heading One
## Subheading
Valid tags: #rust #web/frontend #nested/sub/topic #v1 #project-2026 #tag_underscore
Parenthesized: (#in_paren) and quoted '#quoted'
Invalid tags: #123 #9999 https://example.com#anchor 123#fake
"#;
    let tags = extract_tags(content);
    assert!(tags.contains(&"rust".to_string()));
    assert!(tags.contains(&"web/frontend".to_string()));
    assert!(tags.contains(&"nested/sub/topic".to_string()));
    assert!(tags.contains(&"v1".to_string()));
    assert!(tags.contains(&"project-2026".to_string()));
    assert!(tags.contains(&"tag_underscore".to_string()));
    assert!(tags.contains(&"in_paren".to_string()));
    assert!(tags.contains(&"quoted".to_string()));

    // Headings and numbers must be excluded
    assert!(!tags.contains(&"Heading".to_string()));
    assert!(!tags.contains(&"Subheading".to_string()));
    assert!(!tags.contains(&"123".to_string()));
    assert!(!tags.contains(&"9999".to_string()));
    assert!(!tags.contains(&"anchor".to_string()));
}

#[test]
fn test_utf8_snippet_extractor() {
    let content = "Đây là ghi chú quan trọng về [[Trí Tuệ Nhân Tạo#Học Sâu|AI]]. Rất thú vị và có nhiều ứng dụng hữu ích trong đời sống thực tế.";
    let snippet = extract_backlink_snippet(content, "Trí Tuệ Nhân Tạo", 120);

    assert!(snippet.contains("Trí Tuệ Nhân Tạo") || snippet.contains("AI"));
    assert!(!snippet.is_empty());
}
