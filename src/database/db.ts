import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'automix.db');
export const db = new Database(dbPath);

// Enable WAL mode for high concurrency and resilience
db.pragma('journal_mode = WAL');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      company TEXT NOT NULL,
      job_title TEXT NOT NULL,
      job_url TEXT UNIQUE NOT NULL,
      application_url TEXT,
      date_applied TEXT,
      status TEXT NOT NULL,
      source TEXT,
      job_id TEXT,
      match_score INTEGER,
      match_reason TEXT,
      fields_filled TEXT,
      gpt_answers TEXT,
      error_message TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS candidate_profile (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS learned_answers (
      id TEXT PRIMARY KEY,
      question_pattern TEXT NOT NULL,
      normalized_key TEXT UNIQUE NOT NULL,
      answer TEXT NOT NULL,
      category TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      job_title TEXT,
      company TEXT,
      action TEXT NOT NULL,
      result TEXT,
      error TEXT,
      level TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS session_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

initDatabase();
