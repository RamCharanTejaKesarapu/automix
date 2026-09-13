import { db } from './db.js';
import { v4 as uuidv4 } from 'uuid';

export interface ApplicationRecord {
  id: string;
  company: string;
  job_title: string;
  job_url: string;
  application_url?: string;
  date_applied?: string;
  status: 'DISCOVERED' | 'APPLYING' | 'SUBMITTED' | 'PENDING_REVIEW' | 'FAILED' | 'SKIPPED';
  source?: string;
  job_id?: string;
  match_score?: number;
  match_reason?: string;
  fields_filled?: Record<string, any>;
  gpt_answers?: Record<string, any>;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  job_title?: string;
  company?: string;
  action: string;
  result?: string;
  error?: string;
  level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR';
}

export const applicationRepository = {
  isDuplicate(jobUrl: string, company?: string, jobTitle?: string): boolean {
    const cleanUrl = jobUrl.trim().split('?')[0]; // compare base url
    const checkUrlStmt = db.prepare(`SELECT id, status FROM applications WHERE job_url = ? OR job_url LIKE ?`);
    const existing = checkUrlStmt.get(cleanUrl, `${cleanUrl}%`) as { id: string; status: string } | undefined;
    if (existing) return true;

    if (company && jobTitle) {
      const checkTitleStmt = db.prepare(`
        SELECT id FROM applications 
        WHERE LOWER(company) = LOWER(?) AND LOWER(job_title) = LOWER(?)
        AND status IN ('SUBMITTED', 'APPLYING')
      `);
      const matched = checkTitleStmt.get(company.trim(), jobTitle.trim());
      if (matched) return true;
    }
    return false;
  },

  create(app: Omit<ApplicationRecord, 'id' | 'created_at' | 'updated_at'>): ApplicationRecord {
    const id = uuidv4();
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO applications (
        id, company, job_title, job_url, application_url, date_applied,
        status, source, job_id, match_score, match_reason, fields_filled,
        gpt_answers, error_message, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      app.company,
      app.job_title,
      app.job_url,
      app.application_url || null,
      app.date_applied || null,
      app.status,
      app.source || null,
      app.job_id || null,
      app.match_score ?? null,
      app.match_reason || null,
      app.fields_filled ? JSON.stringify(app.fields_filled) : null,
      app.gpt_answers ? JSON.stringify(app.gpt_answers) : null,
      app.error_message || null,
      now,
      now
    );

    return {
      ...app,
      id,
      created_at: now,
      updated_at: now
    };
  },

  update(id: string, updates: Partial<ApplicationRecord>): void {
    const now = new Date().toISOString();
    const fields: string[] = ['updated_at = ?'];
    const values: any[] = [now];

    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.application_url !== undefined) {
      fields.push('application_url = ?');
      values.push(updates.application_url);
    }
    if (updates.date_applied !== undefined) {
      fields.push('date_applied = ?');
      values.push(updates.date_applied);
    }
    if (updates.match_score !== undefined) {
      fields.push('match_score = ?');
      values.push(updates.match_score);
    }
    if (updates.match_reason !== undefined) {
      fields.push('match_reason = ?');
      values.push(updates.match_reason);
    }
    if (updates.fields_filled !== undefined) {
      fields.push('fields_filled = ?');
      values.push(JSON.stringify(updates.fields_filled));
    }
    if (updates.gpt_answers !== undefined) {
      fields.push('gpt_answers = ?');
      values.push(JSON.stringify(updates.gpt_answers));
    }
    if (updates.error_message !== undefined) {
      fields.push('error_message = ?');
      values.push(updates.error_message);
    }

    values.push(id);
    const sql = `UPDATE applications SET ${fields.join(', ')} WHERE id = ?`;
    db.prepare(sql).run(...values);
  },

  getById(id: string): ApplicationRecord | undefined {
    const row = db.prepare('SELECT * FROM applications WHERE id = ?').get(id) as any;
    if (!row) return undefined;
    return {
      ...row,
      fields_filled: row.fields_filled ? JSON.parse(row.fields_filled) : undefined,
      gpt_answers: row.gpt_answers ? JSON.parse(row.gpt_answers) : undefined
    };
  },

  getAll(limit = 100): ApplicationRecord[] {
    const rows = db.prepare('SELECT * FROM applications ORDER BY created_at DESC LIMIT ?').all(limit) as any[];
    return rows.map(row => ({
      ...row,
      fields_filled: row.fields_filled ? JSON.parse(row.fields_filled) : undefined,
      gpt_answers: row.gpt_answers ? JSON.parse(row.gpt_answers) : undefined
    }));
  },

  getStats() {
    const total = db.prepare('SELECT COUNT(*) as count FROM applications').get() as { count: number };
    const submitted = db.prepare("SELECT COUNT(*) as count FROM applications WHERE status = 'SUBMITTED'").get() as { count: number };
    const failed = db.prepare("SELECT COUNT(*) as count FROM applications WHERE status = 'FAILED'").get() as { count: number };
    const pending = db.prepare("SELECT COUNT(*) as count FROM applications WHERE status = 'PENDING_REVIEW'").get() as { count: number };
    return {
      totalFound: total.count,
      submitted: submitted.count,
      failed: failed.count,
      pending: pending.count
    };
  },

  logActivity(log: Omit<ActivityLog, 'id' | 'timestamp'>): ActivityLog {
    const id = uuidv4();
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    const stmt = db.prepare(`
      INSERT INTO activity_logs (id, timestamp, job_title, company, action, result, error, level)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      timestamp,
      log.job_title || null,
      log.company || null,
      log.action,
      log.result || null,
      log.error || null,
      log.level
    );
    return { id, timestamp, ...log };
  },

  getRecentLogs(limit = 100): ActivityLog[] {
    return db.prepare('SELECT * FROM activity_logs ORDER BY rowid DESC LIMIT ?').all(limit) as ActivityLog[];
  }
};
