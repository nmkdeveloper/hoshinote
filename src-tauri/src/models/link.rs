use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct LinkItem {
    pub id: String,
    pub source_id: String,
    pub target_id: Option<String>,
    pub target_title: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub raw_target: Option<String>,
    pub alias: Option<String>,
    pub heading: Option<String>,
    pub is_unresolved: bool,
    #[serde(default)]
    pub is_resolved: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct BacklinkItem {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub link_id: Option<String>,
    pub source_id: String,
    pub source_title: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub note_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub note_title: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub alias: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub heading: Option<String>,
    pub snippet: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub context_snippet: Option<String>,
}
