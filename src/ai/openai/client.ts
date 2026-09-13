import dotenv from 'dotenv';
import { db } from '../../database/db.js';

dotenv.config();

export interface LLMConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export function getLLMConfig(): LLMConfig {
  // Check if custom settings are saved in DB
  const customKey = db.prepare("SELECT value FROM session_settings WHERE key = 'OPENAI_API_KEY'").get() as { value: string } | undefined;
  const customBase = db.prepare("SELECT value FROM session_settings WHERE key = 'OPENAI_BASE_URL'").get() as { value: string } | undefined;
  const customModel = db.prepare("SELECT value FROM session_settings WHERE key = 'OPENAI_MODEL'").get() as { value: string } | undefined;

  const apiKey = customKey?.value || process.env.OPENAI_API_KEY || '';
  let baseUrl = customBase?.value || process.env.OPENAI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai';
  const model = customModel?.value || process.env.OPENAI_MODEL || 'gemini-3.6-flash';

  // Ensure baseUrl doesn't have trailing slash
  baseUrl = baseUrl.replace(/\/+$/, '');

  return { apiKey, baseUrl, model };
}

export function saveLLMConfig(config: Partial<LLMConfig>) {
  if (config.apiKey !== undefined) {
    db.prepare("INSERT INTO session_settings (key, value) VALUES ('OPENAI_API_KEY', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(config.apiKey);
  }
  if (config.baseUrl !== undefined) {
    db.prepare("INSERT INTO session_settings (key, value) VALUES ('OPENAI_BASE_URL', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(config.baseUrl);
  }
  if (config.model !== undefined) {
    db.prepare("INSERT INTO session_settings (key, value) VALUES ('OPENAI_MODEL', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(config.model);
  }
}

export async function callChatCompletion(params: {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  jsonResponse?: boolean;
}): Promise<string> {
  const config = getLLMConfig();
  if (!config.apiKey) {
    throw new Error('LLM API Key is missing. Please configure OPENAI_API_KEY in .env or Settings.');
  }

  const url = `${config.baseUrl}/chat/completions`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.apiKey}`
  };

  const payload: any = {
    model: config.model,
    messages: params.messages,
    temperature: params.temperature ?? 0.2
  };

  if (params.jsonResponse) {
    payload.response_format = { type: 'json_object' };
  }

  // Retry with exponential backoff for rate-limit (429) errors
  const MAX_RETRIES = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const data = await response.json() as any;
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response received from LLM API.');
      }
      return content;
    }

    // Rate limit — wait and retry
    if (response.status === 429 && attempt < MAX_RETRIES) {
      // Try to extract retry-after from error body
      let retryAfterMs = Math.min(30000, (attempt + 1) * 12000); // 12s, 24s, 30s
      try {
        const errorBody = await response.text();
        const retryMatch = errorBody.match(/retry in ([\d.]+)s/i);
        if (retryMatch) {
          retryAfterMs = Math.min(35000, Math.ceil(parseFloat(retryMatch[1]) * 1000) + 1500);
        }
      } catch { /* ignore */ }
      console.warn(`[LLMClient] Rate limited (429). Waiting ${Math.round(retryAfterMs / 1000)}s before retry ${attempt + 1}/${MAX_RETRIES}...`);
      await new Promise(r => setTimeout(r, retryAfterMs));
      continue;
    }

    // Other error — parse and throw immediately
    const errorBody = await response.text();
    let msg = `LLM API Error (${response.status}): ${errorBody}`;
    try {
      const parsed = JSON.parse(errorBody);
      if (parsed.error?.message) msg = `LLM Error: ${parsed.error.message}`;
    } catch { /* keep raw msg */ }
    lastError = new Error(msg);
    break;
  }

  throw lastError ?? new Error('LLM request failed after retries.');
}
