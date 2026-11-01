use std::sync::LazyLock;
use regex::Regex;

static RE_FENCED_CODE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?s)```.*?```|~~~.*?~~~").expect("Valid regex: fenced code")
});

static RE_INLINE_CODE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"`+[^`\n]*?`+").expect("Valid regex: inline code")
});

static RE_DISPLAY_MATH: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?s)\$\$.*?\$\$").expect("Valid regex: display math")
});

static RE_INLINE_MATH: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"\$([^\s\$](?:[^\$\n]*?[^\s\$])?)\$").expect("Valid regex: inline math")
});

/// Safely strips fenced code blocks, inline code, display math, and inline math
/// in the mathematically verified precedence order:
/// Fenced Code -> Inline Code -> Display Math -> Inline Math (Currency-Safe).
pub fn strip_code_and_math(content: &str) -> String {
    let s = RE_FENCED_CODE.replace_all(content, " ");
    let s = RE_INLINE_CODE.replace_all(&s, " ");
    let s = RE_DISPLAY_MATH.replace_all(&s, " ");
    let s = RE_INLINE_MATH.replace_all(&s, " ");
    s.into_owned()
}
