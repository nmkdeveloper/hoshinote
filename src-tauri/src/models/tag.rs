use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TagSummary {
    pub name: String,
    pub count: i64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub note_count: Option<i64>,
}
