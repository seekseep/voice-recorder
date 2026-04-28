use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveRecordingResponse {
    pub id: String,
    pub stored_path: String,
    pub original_mime_type: String,
    pub original_extension: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioFileSummary {
    pub id: String,
    pub name: String,
    pub original_extension: String,
    pub original_mime_type: String,
    pub created_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioFileDetail {
    pub id: String,
    pub name: String,
    pub original_extension: String,
    pub original_mime_type: String,
    pub stored_path: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConvertResult {
    pub converted_path: String,
    pub target_extension: String,
}
