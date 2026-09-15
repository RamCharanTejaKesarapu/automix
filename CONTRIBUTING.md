# Contributing to AutoMix 🤖

Thank you for your interest in contributing to **AutoMix**, the production-ready automated job application agent. We welcome community contributions, bug reports, and feature enhancements.

---

## 🛠️ Development Setup

1. **Clone the repository**:
   ```bash
   git clone git@github.com:RamCharanTejaKesarapu/automix.git
   cd automix
   ```

2. **Install root and client dependencies**:
   ```bash
   npm install
   cd client && npm install && cd ..
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your OpenAI / Gemini API key and credentials
   ```

4. **Start the local development server**:
   ```bash
   # Starts Express backend and Vite frontend with hot reloading
   npm run dev:server
   npm run dev:client
   ```

---

## 🌿 Branching Strategy & PR Workflow

We follow standard GitHub Flow:
- `main`: Always production-ready, protected branch.
- Feature branches: `feat/<feature-name>` (e.g., `feat/workday-ats-support`)
- Bug fix branches: `fix/<issue-name>` (e.g., `fix/security-and-input-validation`)
- Refactoring branches: `refactor/<target>` (e.g., `refactor/browser-resilience`)
- Testing branches: `test/<target>` (e.g., `test/fsm-and-privacy-coverage`)

### Submitting a Pull Request
1. Branch off `main`.
2. Make atomic, descriptive commits following the [Conventional Commits](https://www.conventionalcommits.org/) convention (`feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `style:`).
3. Ensure all automated tests pass:
   ```bash
   npm test
   ```
4. Ensure the full-stack build passes without TypeScript warnings:
   ```bash
   npm run build
   ```
5. Open a Pull Request targeting `main` using our PR template.

---

## 🧪 Testing Guidelines

- Unit tests reside in `tests/*.test.ts` and run natively using `tsx --test`.
- Write tests for any new form detectors, state transitions, security layers, or matching algorithms.

---

## 🎨 Design System Guidelines

- All UI components in `client/` adhere strictly to the **Obsidian Black & Grey** aesthetic.
- Do not introduce arbitrary bright primary colors (e.g. standard saturated blues, purples). Use the defined CSS variables (`--bg-primary`, `--bg-card`, `--border-subtle`, `--text-primary`, `--text-secondary`, `--accent-primary`).
