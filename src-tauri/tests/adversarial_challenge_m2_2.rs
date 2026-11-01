use rusqlite::Connection;
use std::collections::HashSet;

use hoshinote_lib::db::connection::configure_connection;
use hoshinote_lib::db::schema::run_migrations;
use hoshinote_lib::db::search::{sanitize_fts5_query, search_notes};
use hoshinote_lib::parser::tag::extract_tags;
use hoshinote_lib::parser::wikilink::extract_wikilinks;
use hoshinote_lib::services::graph_service::get_graph_data;
use hoshinote_lib::services::note_service::create_note;

fn setup_test_db() -> Connection {
    let conn = Connection::open_in_memory().expect("In-memory SQLite must open");
    configure_connection(&conn).expect("Pragmas must apply");
    run_migrations(&conn).expect("Migrations must succeed");
    conn
}

// ==============================================================================
// 1. FTS5 Search Robustness & Crash Vectors
// ==============================================================================

#[test]
fn test_fts5_probing_all_8_crash_vectors() {
    let conn = setup_test_db();

    // Populate database with sample notes to ensure FTS table has data
    create_note(
        &conn,
        "Quantum Physics".to_string(),
        Some("Foundations of quantum mechanics and wave-particle duality.".to_string()),
        None,
        None,
    )
    .expect("Create Quantum Note");

    create_note(
        &conn,
        "Rust Guide".to_string(),
        Some("Memory safety without garbage collection. Modern systems programming.".to_string()),
        None,
        None,
    )
    .expect("Create Rust Note");

    create_note(
        &conn,
        "C++ Reference".to_string(),
        Some("Object-oriented programming, templates, and pointers.".to_string()),
        None,
        None,
    )
    .expect("Create C++ Note");

    // All 8 crash vectors plus exhaustive boundary variations
    let crash_vectors = [
        // Vector 1: Empty string & whitespace
        "",
        " ",
        "   ",
        "\t\t\n\r",
        
        // Vector 2: Unclosed quotes & mismatched quotes
        "\"",
        "\"foo",
        "foo\"",
        "\"foo\"\"bar",
        "\"\"\"",
        "\"\"\"\"",
        "\"unclosed quote with spaces inside",
        "prefix \"unclosed quote in middle",

        // Vector 3: Standalone & chained boolean operators
        "AND",
        "OR",
        "NOT",
        "and",
        "or",
        "not",
        "AND AND AND",
        "OR OR OR",
        "NOT NOT NOT",
        "AND OR NOT",
        "NOT AND",
        "foo AND",
        "AND bar",
        "foo OR",
        "OR bar",
        "foo NOT",
        "NOT bar",
        "foo AND OR NOT bar",

        // Vector 4: Punctuation crashers (+, *, ~, :)
        "+",
        "++",
        "c++",
        "*",
        "**",
        "***",
        "*prefix",
        "~",
        "~~",
        ":",
        "::",
        ":::",
        "foo:bar",
        "title:test",
        "content:test",
        "+*~:",
        ":*+~",

        // Vector 5: Parentheses crashers
        "(",
        ")",
        "()",
        ")(",
        "((",
        "))",
        "(((",
        "((()))",
        "((unbalanced",
        "unbalanced))",
        "(foo AND bar)",
        "((foo) OR (bar))",

        // Vector 6: Special characters (^, {}, [], \, ', @, #, $, %, etc.)
        "^",
        "^^",
        "foo^2",
        "{",
        "}",
        "{}",
        "{{}}",
        "[",
        "]",
        "[]",
        "[[]]",
        "\\",
        "\\\\",
        "\\n",
        "'",
        "''",
        "'''",
        "it's",
        "can't",
        "@",
        "#",
        "$",
        "%",
        "&",
        "_",
        "-",
        "=",
        "/",
        "?",
        "<>",
        "!",
        ";",

        // Vector 7: Complex combinations of all crash vectors
        "AND OR NOT + * ~ : ( ) \"foo \"bar ^ {} [] \\ '",
        "(( \"unclosed quote AND * + ~ :: ))",
        "NEAR(foo, bar)",
        "NOT (quantum OR physics) AND \"*\"",
        "c++ and rust: *systems* ~fast (safe)",

        // Vector 8: Pure punctuation/symbols queries
        "~!@#$%^&*()_+`-={}|[]\\:\";'<>?,./",
        "*******************",
        ":::::::::::::::::::",
        "+++++++++++++++++++",
    ];

    for (idx, query) in crash_vectors.iter().enumerate() {
        // Step A: verify sanitize_fts5_query does not panic
        let _sanitized = sanitize_fts5_query(query);

        // Step B: verify search_notes does NOT crash or panic SQLite
        let res = search_notes(&conn, query);
        assert!(
            res.is_ok(),
            "Crash vector #{} failed on query {:?}: got SQLite error {:?}",
            idx,
            query,
            res.err()
        );
    }
}

#[test]
fn test_fts5_bm25_exact_title_ranking_vs_content() {
    let conn = setup_test_db();

    // Note 1: Exact title match, short casual content
    create_note(
        &conn,
        "Algorithms".to_string(),
        Some("Basic overview of theoretical concepts.".to_string()),
        None,
        None,
    )
    .expect("Create Algorithms note");

    // Note 2: Casual content match with heavy keyword repetition, title does NOT contain keyword
    create_note(
        &conn,
        "System Architecture".to_string(),
        Some(
            "We design algorithms for speed. Our algorithms must be scalable. \
             These algorithms optimize data flow, algorithms ensure low latency, \
             and algorithms prevent performance degradation."
                .to_string(),
        ),
        None,
        None,
    )
    .expect("Create Architecture note");

    // Note 3: Irrelevant note
    create_note(
        &conn,
        "Gardening".to_string(),
        Some("Planting flowers and vegetables in springtime.".to_string()),
        None,
        None,
    )
    .expect("Create Gardening note");

    // Execute search for "Algorithms"
    let results = search_notes(&conn, "Algorithms").expect("Search Algorithms");

    println!("Search results for 'Algorithms':");
    for (i, r) in results.iter().enumerate() {
        println!("  #{}: title='{}', rank={}, snippet='{}'", i, r.title, r.rank, r.snippet);
    }

    // Exact title match (Algorithms) MUST rank higher than content match (System Architecture)
    assert_eq!(
        results[0].title, "Algorithms",
        "Exact title match must rank strictly higher than casual content match. Found top result: {}",
        results[0].title
    );
    assert_eq!(results[1].title, "System Architecture");
    assert!(
        results[0].rank >= results[1].rank,
        "Title match rank ({}) must be >= content match rank ({})",
        results[0].rank,
        results[1].rank
    );
}

// ==============================================================================
// 2. Parser Adversarial Testing
// ==============================================================================

#[test]
fn test_parser_wikilink_extraction_adversarial() {
    // 1. Code blocks isolation
    let code_content = r#"
Here is a legitimate link: [[Valid Document]]

Fenced with backticks:
```rust
let link = "[[Code Block Backticks]]";
```

Fenced with tildes:
~~~python
# [[Code Block Tildes]]
~~~

Inline code single backtick: `[[Inline Single]]`
Inline code double backticks: ``[[Inline Double]]``
Inline code triple backticks: ```[[Inline Triple]]```
"#;
    let code_links = extract_wikilinks(code_content);
    let code_targets: Vec<String> = code_links.iter().map(|l| l.target.clone()).collect();
    assert_eq!(code_targets, vec!["Valid Document"]);

    // 2. Math formulas isolation
    let math_content = r#"
Legitimate note: [[Physics Notes]]

Display math standard:
$$
\sum_{i=0}^n [[Math In Display Sum]] = 0
$$

Display math multiline:
$$
\begin{matrix}
[[Math Matrix Item]]
\end{matrix}
$$

Inline math: $E = mc^2 + [[Math In Inline]]$
"#;
    let math_links = extract_wikilinks(math_content);
    let math_targets: Vec<String> = math_links.iter().map(|l| l.target.clone()).collect();
    assert_eq!(math_targets, vec!["Physics Notes"]);

    // 3. Currency clashes: explicitly testing prompt vector "$50 for [[Item A]] and $100 for [[Item B]]"
    let currency_content = "We allocated $50 for [[Item A]] and $100 for [[Item B]] during the budget review.";
    let currency_links = extract_wikilinks(currency_content);
    assert_eq!(currency_links.len(), 2, "Both wikilinks must survive currency formatting");
    assert_eq!(currency_links[0].target, "Item A");
    assert_eq!(currency_links[1].target, "Item B");

    // Additional complex currency patterns
    let complex_currency = "$10.50 [[Plan Alpha]] vs $25.00 [[Plan Beta]], and spent $99.99 for [[Plan Gamma]].";
    let comp_links = extract_wikilinks(complex_currency);
    assert_eq!(comp_links.len(), 3);
    assert_eq!(comp_links[0].target, "Plan Alpha");
    assert_eq!(comp_links[1].target, "Plan Beta");
    assert_eq!(comp_links[2].target, "Plan Gamma");

    // 4. Deep paths, headings, and aliases
    let deep_content = "Check [[folder/sub/Note#Heading|Alias]] and [[deeply/nested/path/to/Document#Section 3.1|Custom Label]]";
    let deep_links = extract_wikilinks(deep_content);
    assert_eq!(deep_links.len(), 2);
    assert_eq!(deep_links[0].target, "folder/sub/Note");
    assert_eq!(deep_links[0].heading, Some("Heading".to_string()));
    assert_eq!(deep_links[0].alias, Some("Alias".to_string()));

    assert_eq!(deep_links[1].target, "deeply/nested/path/to/Document");
    assert_eq!(deep_links[1].heading, Some("Section 3.1".to_string()));
    assert_eq!(deep_links[1].alias, Some("Custom Label".to_string()));

    // 5. Malformed wikilinks
    let malformed = "Broken: [[ unclosed, ]] unopened, [[]] empty, [[  ]] whitespace, [[#HeadingOnly]], [[|AliasOnly]]";
    let mal_links = extract_wikilinks(malformed);
    for l in &mal_links {
        assert!(!l.target.trim().is_empty(), "Target must never be empty");
    }
}

#[test]
fn test_parser_tag_extraction_adversarial() {
    let content = r##"
# Heading One
## Subheading Two
### Heading Three

Valid tags:
#nested/tag
#tag-name
#deeply/nested/category/subtag
#tag_with_underscore
#v1
#release-2.0
(#tag_in_paren)
[#tag_in_bracket]
{#tag_in_brace}
'#tag_in_single_quote'
"#tag_in_double_quote"

Tags that MUST be rejected:
#123
#99999
https://example.com#anchor
http://test.org/path#fragment
word#fake_anchor
123#number_prefix
#
#-invalid
#_invalid

Tags inside code and math (MUST be ignored):
`#tag_in_code`
```
#tag_in_fenced_block
```
$$
#tag_in_display_math
$$
$#tag_in_inline_math$
"##;

    let tags = extract_tags(content);
    let tag_set: HashSet<String> = tags.into_iter().collect();

    // Must accept:
    assert!(tag_set.contains("nested/tag"), "Must extract #nested/tag");
    assert!(tag_set.contains("tag-name"), "Must extract #tag-name");
    assert!(tag_set.contains("deeply/nested/category/subtag"));
    assert!(tag_set.contains("tag_with_underscore"));
    assert!(tag_set.contains("v1"));
    assert!(tag_set.contains("tag_in_paren"));
    assert!(tag_set.contains("tag_in_bracket"));
    assert!(tag_set.contains("tag_in_brace"));
    assert!(tag_set.contains("tag_in_single_quote"));
    assert!(tag_set.contains("tag_in_double_quote"));

    // Must reject:
    assert!(!tag_set.contains("123"), "Must reject #123 pure number");
    assert!(!tag_set.contains("99999"), "Must reject #99999 pure number");
    assert!(!tag_set.contains("Heading One"), "Must reject # Heading One");
    assert!(!tag_set.contains("Heading"), "Must reject # Heading");
    assert!(!tag_set.contains("Subheading Two"), "Must reject ## Subheading Two");
    assert!(!tag_set.contains("anchor"), "Must reject URL anchor fragment");
    assert!(!tag_set.contains("fragment"), "Must reject URL anchor fragment");
    assert!(!tag_set.contains("tag_in_code"), "Must ignore tag in inline code");
    assert!(!tag_set.contains("tag_in_fenced_block"), "Must ignore tag in fenced block");
    assert!(!tag_set.contains("tag_in_display_math"), "Must ignore tag in display math");
    assert!(!tag_set.contains("tag_in_inline_math"), "Must ignore tag in inline math");
}

// ==============================================================================
// 3. Graph Data Verification
// ==============================================================================

#[test]
fn test_graph_data_verification_complete_topology() {
    let conn = setup_test_db();

    // Create interconnected topology:
    // Hub Note links to Note A, Note B, and Dangling Page
    let hub = create_note(
        &conn,
        "Hub".to_string(),
        Some("Links to [[Node A]], [[Node B]], and [[Unresolved Future Target]]. #hub/topic".to_string()),
        None,
        None,
    )
    .expect("Create Hub");

    // Note A links back to Hub
    let note_a = create_note(
        &conn,
        "Node A".to_string(),
        Some("Links back to [[Hub]]. #alpha".to_string()),
        None,
        None,
    )
    .expect("Create Node A");

    // Note B links to Node A and Dangling Page
    let note_b = create_note(
        &conn,
        "Node B".to_string(),
        Some("Links to [[Node A]] and [[Unresolved Future Target]]. #beta".to_string()),
        None,
        None,
    )
    .expect("Create Node B");

    // Orphan note (no incoming or outgoing links)
    let orphan = create_note(
        &conn,
        "Lonely Orphan".to_string(),
        Some("Completely isolated note with no connections. #isolated".to_string()),
        None,
        None,
    )
    .expect("Create Orphan");

    // Execute graph aggregation
    let graph = get_graph_data(&conn).expect("get_graph_data must succeed");

    // 1. Verify Nodes count: 4 real notes + 1 phantom note ("unresolved:Unresolved Future Target") = 5 nodes
    assert_eq!(graph.nodes.len(), 5, "Expected 4 real nodes + 1 phantom node");

    // Find each node
    let hub_node = graph.nodes.iter().find(|n| n.id == hub.note.id).expect("Hub node");
    let a_node = graph.nodes.iter().find(|n| n.id == note_a.note.id).expect("Node A node");
    let b_node = graph.nodes.iter().find(|n| n.id == note_b.note.id).expect("Node B node");
    let orphan_node = graph.nodes.iter().find(|n| n.id == orphan.note.id).expect("Orphan node");
    let phantom_node = graph.nodes.iter().find(|n| n.is_unresolved).expect("Phantom node");

    // 2. Verify Degree Counts:
    // Hub: outgoing to A (1), outgoing to B (1), outgoing to Unresolved (1), incoming from A (1) = 4
    assert_eq!(hub_node.connections_count, 4, "Hub degree must be 4");
    assert!(!hub_node.is_orphan);
    assert!(!hub_node.is_unresolved);

    // Node A: incoming from Hub (1), outgoing to Hub (1), incoming from B (1) = 3
    assert_eq!(a_node.connections_count, 3, "Node A degree must be 3");
    assert!(!a_node.is_orphan);
    assert!(!a_node.is_unresolved);

    // Node B: incoming from Hub (1), outgoing to A (1), outgoing to Unresolved (1) = 3
    assert_eq!(b_node.connections_count, 3, "Node B degree must be 3");
    assert!(!b_node.is_orphan);
    assert!(!b_node.is_unresolved);

    // Orphan: degree 0, flagged as orphan
    assert_eq!(orphan_node.connections_count, 0, "Orphan degree must be 0");
    assert!(orphan_node.is_orphan, "Orphan must have is_orphan = true");
    assert!(!orphan_node.is_unresolved);

    // Phantom: incoming from Hub (1), incoming from B (1) = 2
    assert_eq!(phantom_node.id, "unresolved:Unresolved Future Target");
    assert_eq!(phantom_node.title, "Unresolved Future Target");
    assert_eq!(phantom_node.connections_count, 2, "Phantom degree must be 2");
    assert!(!phantom_node.is_orphan, "Phantom must not be flagged as orphan");
    assert!(phantom_node.is_unresolved, "Phantom must have is_unresolved = true");
    assert_eq!(phantom_node.group, "draft");

    // 3. Verify Links:
    // 5 total links:
    // Hub -> Node A (resolved)
    // Hub -> Node B (resolved)
    // Hub -> Unresolved (unresolved)
    // Node A -> Hub (resolved)
    // Node B -> Node A (resolved)
    // Node B -> Unresolved (unresolved)
    assert_eq!(graph.links.len(), 6, "Expected 6 directed links in graph");

    let unresolved_links: Vec<_> = graph.links.iter().filter(|l| l.is_unresolved).collect();
    assert_eq!(unresolved_links.len(), 2, "Expected 2 unresolved links");
    for link in unresolved_links {
        assert_eq!(link.target, "unresolved:Unresolved Future Target");
    }

    // Verify all link endpoints exist in nodes
    let node_ids: HashSet<String> = graph.nodes.iter().map(|n| n.id.clone()).collect();
    for link in &graph.links {
        assert!(
            node_ids.contains(&link.source),
            "Link source {} missing from graph nodes",
            link.source
        );
        assert!(
            node_ids.contains(&link.target),
            "Link target {} missing from graph nodes",
            link.target
        );
    }
}

#[test]
fn test_graph_data_unresolved_case_insensitivity_stress() {
    let conn = setup_test_db();

    // Create note linking to "Draft Concept" (Title Case)
    create_note(
        &conn,
        "Note One".to_string(),
        Some("Links to [[Draft Concept]].".to_string()),
        None,
        None,
    )
    .expect("Create Note One");

    // Create another note linking to "draft concept" (lower case)
    create_note(
        &conn,
        "Note Two".to_string(),
        Some("Also links to [[draft concept]].".to_string()),
        None,
        None,
    )
    .expect("Create Note Two");

    let graph = get_graph_data(&conn).expect("get_graph_data must succeed");

    // Check phantom nodes
    let phantom_nodes: Vec<_> = graph.nodes.iter().filter(|n| n.is_unresolved).collect();
    println!("Phantom nodes: {:?}", phantom_nodes);

    // Verify every link's target exists in graph.nodes
    let node_ids: HashSet<String> = graph.nodes.iter().map(|n| n.id.clone()).collect();
    for link in &graph.links {
        println!("Checking link: {} -> {}, is_unresolved: {}", link.source, link.target, link.is_unresolved);
        assert!(
            node_ids.contains(&link.target),
            "FATAL BUG DETECTED: Link target '{}' does not exist in graph nodes! Available nodes: {:?}",
            link.target,
            node_ids
        );
    }
}

#[test]
fn test_snippet_extractor_utf8_boundary_stress() {
    use hoshinote_lib::parser::snippet::extract_backlink_snippet;

    // Test Vietnamese accents
    let vn_content = "Đây là tài liệu nghiên cứu chuyên sâu về [[Học Máy và Trí Tuệ Nhân Tạo]]. Nội dung bao gồm nhiều thuật toán.";
    let s1 = extract_backlink_snippet(vn_content, "Học Máy và Trí Tuệ Nhân Tạo", 80);
    assert!(!s1.is_empty());

    // Test Turkish dotted I
    let tr_content = "İstanbul [[İSTANBUL]] ve İzmir arasındaki bağlantılar.";
    let s2 = extract_backlink_snippet(tr_content, "İSTANBUL", 50);
    assert!(!s2.is_empty());

    // Test Japanese
    let ja_content = "これは人工知能に関するメモです。[[機械学習]]のアルゴリズムを学びます。";
    let s3 = extract_backlink_snippet(ja_content, "機械学習", 40);
    assert!(!s3.is_empty());

    // Test Emojis
    let emoji_content = "🚀 Rocket launch to [[Mars Base]] with 🌟 stars and 🔥 flame.";
    let s4 = extract_backlink_snippet(emoji_content, "Mars Base", 50);
    assert!(!s4.is_empty());
}
