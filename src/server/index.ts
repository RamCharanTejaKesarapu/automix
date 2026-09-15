import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { candidateProfileRepository } from '../profile/candidateProfile.js';
import { applicationRepository } from '../database/applications.js';
import { globalStateMachine } from '../state/stateMachine.js';
import { globalApprovalManager } from '../human/approvalManager.js';
import { globalAutomationController } from '../controller/automationController.js';
import { globalBrowserManager } from '../browser/browserManager.js';
import { getLLMConfig, saveLLMConfig } from '../ai/openai/client.js';

import {
  SessionStartSchema,
  CandidateProfileSchema,
  HitlResponseSchema,
  LLMConfigSchema
} from './validation.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = parseInt(process.env.PORT || '4000', 10);

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Setup file uploads directory
const uploadsDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown'
]);

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.doc', '.docx', '.txt', '.md']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${base}_${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB ceiling
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype.toLowerCase();

    if (ALLOWED_MIME_TYPES.has(mime) || ALLOWED_EXTENSIONS.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, Word (.doc, .docx), and plain text files up to 5MB are permitted.'));
    }
  }
});

// Broadcast helper to all connected WS clients
function broadcast(type: string, data: any) {
  const payload = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

// Subscribe state machine transitions
globalStateMachine.onStateChange((state, context, stats) => {
  broadcast('STATE_UPDATE', { state, context, stats });
});

// Subscribe HITL prompts
globalApprovalManager.on('prompt', (prompt) => {
  broadcast('HITL_PROMPT', prompt);
});

globalApprovalManager.on('resolved', (data) => {
  broadcast('HITL_RESOLVED', data);
});

// Stream screenshots to UI
globalBrowserManager.setScreenshotCallback((base64) => {
  broadcast('BROWSER_FRAME', { image: base64 });
});

// Intercept application repository logs for real-time broadcast
const originalLog = applicationRepository.logActivity;
applicationRepository.logActivity = function (log) {
  const res = originalLog.call(this, log);
  broadcast('NEW_LOG', res);
  return res;
};

// ---------------- REST API ROUTES ----------------

// Status & State
app.get('/api/status', (_req, res) => {
  res.json(globalAutomationController.getStatus());
});

// Candidate Profile
app.get('/api/profile', (_req, res) => {
  res.json(candidateProfileRepository.getProfile());
});

app.post('/api/profile', (req, res) => {
  const parseResult = CandidateProfileSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Invalid profile data',
      details: parseResult.error.issues.map(e => `${e.path.join('.')}: ${e.message}`)
    });
  }

  candidateProfileRepository.saveProfile(parseResult.data as any);
  res.json({ success: true, profile: candidateProfileRepository.getProfile() });
});

// Applications History & Stats
app.get('/api/applications', (_req, res) => {
  res.json({
    applications: applicationRepository.getAll(150),
    stats: applicationRepository.getStats()
  });
});

// Activity Logs
app.get('/api/logs', (_req, res) => {
  res.json(applicationRepository.getRecentLogs(100));
});

// Learned Answers (Memory Bank)
app.get('/api/learned-answers', (_req, res) => {
  res.json(candidateProfileRepository.getLearnedAnswers());
});

app.delete('/api/learned-answers/:id', (req, res) => {
  candidateProfileRepository.deleteLearnedAnswer(req.params.id);
  res.json({ success: true });
});

// Session Controls
app.post('/api/session/start', async (req, res) => {
  const parseResult = SessionStartSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Invalid session configuration',
      details: parseResult.error.issues.map(e => `${e.path.join('.')}: ${e.message}`)
    });
  }

  try {
    const config = parseResult.data;

    // Run automation in background
    globalAutomationController.start(config).catch(err => {
      console.error('[Server] Automation error:', err);
    });

    res.json({ success: true, message: 'Automation session started', config });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/session/pause', (_req, res) => {
  globalAutomationController.pause();
  res.json({ success: true });
});

app.post('/api/session/resume', (_req, res) => {
  globalAutomationController.resume();
  res.json({ success: true });
});

app.post('/api/session/stop', async (_req, res) => {
  await globalAutomationController.stop();
  res.json({ success: true });
});

// Human In The Loop Response
app.get('/api/hitl/prompt', (_req, res) => {
  res.json({ prompt: globalApprovalManager.getActivePrompt() });
});

app.post('/api/hitl/respond', (req, res) => {
  const parseResult = HitlResponseSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Invalid HITL payload',
      details: parseResult.error.issues.map(e => `${e.path.join('.')}: ${e.message}`)
    });
  }

  const { promptId, answer, savePermanently } = parseResult.data;
  const success = globalApprovalManager.resolvePrompt({ promptId, answer, savePermanently });
  if (success) {
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Invalid or expired prompt ID' });
  }
});

// LLM Settings
app.get('/api/settings/llm', (_req, res) => {
  const config = getLLMConfig();
  res.json({
    apiKeyMasked: config.apiKey ? `${config.apiKey.slice(0, 6)}...${config.apiKey.slice(-4)}` : '',
    hasKey: !!config.apiKey,
    baseUrl: config.baseUrl,
    model: config.model
  });
});

app.post('/api/settings/llm', (req, res) => {
  const parseResult = LLMConfigSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Invalid LLM configuration',
      details: parseResult.error.issues.map(e => `${e.path.join('.')}: ${e.message}`)
    });
  }

  saveLLMConfig(parseResult.data);
  res.json({ success: true, config: getLLMConfig() });
});

// Resume File Upload with Multer error handling
app.post('/api/upload/resume', (req, res) => {
  upload.single('resume')(req, res, (err: any) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'File upload failed' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const profile = candidateProfileRepository.getProfile();
    profile.resumePath = req.file.path;
    profile.resumeFileName = req.file.originalname;

    // Try extracting plain text if text/markdown
    if (req.file.mimetype.includes('text') || req.file.originalname.endsWith('.txt') || req.file.originalname.endsWith('.md')) {
      try {
        profile.resumeText = fs.readFileSync(req.file.path, 'utf-8');
      } catch {}
    }

    candidateProfileRepository.saveProfile(profile);
    res.json({
      success: true,
      fileName: req.file.originalname,
      filePath: req.file.path
    });
  });
});

// Serve frontend build if present
const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(clientDist, 'index.html'));
    }
    next();
  });
}

// Extended WebSocket with Heartbeat KeepAlive tracking
interface HeartbeatWebSocket extends WebSocket {
  isAlive?: boolean;
}

wss.on('connection', (ws: HeartbeatWebSocket) => {
  ws.isAlive = true;

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  // Send current state
  ws.send(JSON.stringify({
    type: 'INIT_STATE',
    data: globalAutomationController.getStatus(),
    activePrompt: globalApprovalManager.getActivePrompt(),
    logs: applicationRepository.getRecentLogs(40),
    timestamp: new Date().toISOString()
  }));

  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message.toString());
      if (parsed.type === 'PING') {
        ws.isAlive = true;
        ws.send(JSON.stringify({ type: 'PONG' }));
      }
    } catch {}
  });
});

// WebSocket Heartbeat Sweep: Terminate dead connections every 30s
const wsHeartbeatInterval = setInterval(() => {
  wss.clients.forEach((client) => {
    const ws = client as HeartbeatWebSocket;
    if (ws.isAlive === false) {
      return client.terminate();
    }
    ws.isAlive = false;
    client.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(wsHeartbeatInterval);
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Automated Job Application Agent Server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket server ready on ws://localhost:${PORT}`);
  console.log(`=======================================================`);
});
