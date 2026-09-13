# AutoMix - Production-Ready Automated Job Application Agent

AutoMix is an intelligent, agentic automation system that streamlines the job application process using Playwright browser automation, LLM-powered form parsing, and a real-time reactive control dashboard.

---

## Key Features

- **Automated Form Discovery & Detection**: Intelligently scans job boards and company career portals (Greenhouse, Lever, Workday, etc.) to detect application forms, inputs, file uploaders, and multi-step forms.
- **LLM-Powered Smart Field Matching**: Matches resume profile fields and tailored answers to custom job form questions with privacy-preserving redaction.
- **Human-in-the-Loop (HITL) Controls**: Pause/resume workflows, manual CAPTCHA solving, and explicit user approval before final submission.
- **Live Browser Stream & Real-time Telemetry**: WebSocket-based live activity terminal and status updates streamed directly to the frontend.
- **Persistent Local Database**: Lightweight, zero-config SQLite backend tracking job discovery, application status, session history, and candidate profiles.
- **Modern Control Dashboard**: Premium React + Vite frontend with real-time state machine visualizer, stats grid, and candidate profile editor.

---

## Tech Stack

- **Backend**: Node.js, Express, TypeScript, Playwright, Better-SQLite3, WebSocket (`ws`), Zod
- **Frontend**: React 18, Vite, TypeScript, Vanilla CSS design system
- **AI / LLM Integration**: OpenAI API compatible (Google Gemini 1.5/2.0 via OpenAI compatibility layer or native OpenAI)

---

## Getting Started

### 1. Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- npm or pnpm

### 2. Environment Setup

Copy `.env.example` to `.env` and fill in your configuration:

```bash
cp .env.example .env
```

Configure your API keys in `.env`:

```env
OPENAI_API_KEY=your_gemini_or_openai_api_key
OPENAI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
OPENAI_MODEL=gemini-2.5-flash
PORT=4000
HOST=localhost
HEADLESS=false
AUTO_SUBMIT_DEFAULT=false
```

### 3. Install Dependencies

Install root backend dependencies and client dependencies:

```bash
# Install backend dependencies
npm install

# Install Playwright browser binaries
npx playwright install chromium

# Install client dependencies
cd client && npm install && cd ..
```

### 4. Running the Application

Run both the server and client concurrently:

```bash
# Terminal 1: Backend Server (runs on http://localhost:4000)
npm run dev:server

# Terminal 2: Frontend Dashboard (runs on http://localhost:5173)
npm run dev:client
```

---

## Project Structure

```
automix/
├── client/                     # Vite + React Frontend Dashboard
│   ├── src/
│   │   ├── components/         # Live monitor, HITL modal, terminal, stats
│   │   ├── App.tsx             # Main dashboard layout
│   │   └── types.ts            # Frontend schema & state types
│   └── package.json
├── src/
│   ├── ai/                     # AI & LLM integration + Privacy filter
│   ├── applications/           # Form detection, field mapping, validation
│   ├── browser/                # Playwright lifecycle & security detection
│   ├── controller/             # Automation orchestrator & execution
│   ├── database/               # Better-SQLite3 models & migrations
│   ├── human/                  # Human-in-the-loop approvals
│   ├── jobs/                   # Job discovery & matching engine
│   ├── profile/                # Candidate profile management
│   ├── server/                 # Express API & WebSocket streaming server
│   └── state/                  # Agent state machine definition
├── data/                       # Local SQLite storage (gitignored)
├── uploads/                    # Resume & document storage (gitignored)
└── package.json
```

---

## License

MIT License.
