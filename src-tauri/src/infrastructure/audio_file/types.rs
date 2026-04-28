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
    pub text_content: Option<String>,
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
    pub wav_path: Option<String>,
    pub text_content: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}
