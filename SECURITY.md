# Security Policy 🛡️

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

---

## 🔒 Reporting a Vulnerability

The AutoMix team takes security and user privacy extremely seriously, especially given AutoMix handles sensitive candidate profile data and automation credentials.

If you believe you have found a security vulnerability in AutoMix, please **do not open a public GitHub issue**. Instead, follow these steps:

1. **GitHub Security Advisory**: Submit a private report via [GitHub Security Advisories](https://github.com/RamCharanTejaKesarapu/automix/security/advisories).
2. **Details to Include**:
   - Component affected (e.g. Server Multer upload, PrivacyLayer PII scrubber, Playwright context).
   - Step-by-step reproduction instructions or a minimal Proof of Concept (PoC).
   - Potential impact and severity.
3. **Response Timeline**:
   - We will acknowledge receipt of your vulnerability report within 48 hours.
   - A triage evaluation and mitigation patch plan will be shared within 5 business days.

---

## 🛡️ Built-in Privacy & Security Architecture

AutoMix includes several hardened security controls:
- **Local-First Database**: All session credentials, resumes, and logs are stored locally in SQLite (`automix.db`) and never transmitted to third-party tracking servers.
- **PII Redaction Layer**: Automated regex masking removes Social Security Numbers (SSN), credit cards, national IDs, and sensitive contact information prior to AI prompt inference.
- **Local Stealth Browser**: Chromium instances operate under anti-bot masking with ephemeral sessions.
