use rusqlite::{Connection, Result};
use std::path::Path;
use std::sync::Mutex;

pub struct AppDb {
    pub conn: Mutex<Connection>,
}

impl AppDb {
    pub fn open(db_path: &Path) -> Result<Self> {
        let conn = Connection::open(db_path)?;
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;
        let db = Self {
            conn: Mutex::new(conn),
        };
        db.migrate()?;
        Ok(db)
    }

    fn migrate(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS audio_files (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                original_extension TEXT NOT NULL,
                original_mime_type TEXT NOT NULL,
                stored_path TEXT NOT NULL,
                wav_path TEXT,
                text_content TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );",
        )?;
        // Migration: add columns if missing (for existing DBs)
        let _ = conn.execute_batch(
            "ALTER TABLE audio_files ADD COLUMN wav_path TEXT;",
        );
        let _ = conn.execute_batch(
            "ALTER TABLE audio_files ADD COLUMN text_content TEXT;",
        );
        Ok(())
    }
}
