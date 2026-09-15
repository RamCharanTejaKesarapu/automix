import { test, describe } from 'node:test';
import assert from 'node:assert';
import { PrivacyLayer } from '../src/ai/privacyLayer.js';
import { CandidateProfile } from '../src/profile/candidateProfile.js';

describe('PrivacyLayer PII Scrubbing & Protection', () => {
  test('should redact Social Security Numbers (SSN) in arbitrary text', () => {
    const privacy = new PrivacyLayer({ maskSSN: true });
    const text = 'My SSN is 123-45-6789 and my reference ID is 999-00-1111.';
    const sanitized = privacy.sanitizeText(text);

    assert.strictEqual(sanitized, 'My SSN is [REDACTED_SSN] and my reference ID is [REDACTED_SSN].');
    assert.ok(!sanitized.includes('123-45-6789'));
  });

  test('should redact Indian Aadhaar Numbers and UK National Insurance Numbers', () => {
    const privacy = new PrivacyLayer({ maskNationalId: true });
    const text = 'Aadhaar: 1234 5678 9012. UK NIN: QQ 123456 A.';
    const sanitized = privacy.sanitizeText(text);

    assert.ok(sanitized.includes('[REDACTED_NATIONAL_ID]'));
    assert.ok(sanitized.includes('[REDACTED_NIN]'));
    assert.ok(!sanitized.includes('1234 5678 9012'));
  });

  test('should redact credit card and bank account numbers', () => {
    const privacy = new PrivacyLayer({ maskFinancial: true });
    const text = 'Payment info: 4532-1145-8900-1234 on file.';
    const sanitized = privacy.sanitizeText(text);

    assert.strictEqual(sanitized, 'Payment info: [REDACTED_ACCOUNT] on file.');
    assert.ok(!sanitized.includes('4532-1145-8900-1234'));
  });

  test('should preserve contact info under STANDARD mode and mask under STRICT mode', () => {
    const standardPrivacy = new PrivacyLayer({ level: 'STANDARD' });
    const strictPrivacy = new PrivacyLayer({ level: 'STRICT' });

    const text = 'Reach me at candidate@example.com or (555) 234-5678 at 123 Main Street.';

    const standardSanitized = standardPrivacy.sanitizeText(text);
    // Standard mode preserves email and phone, masks street address
    assert.ok(standardSanitized.includes('candidate@example.com'));
    assert.ok(standardSanitized.includes('[STREET ADDRESS]'));

    const strictSanitized = strictPrivacy.sanitizeText(text);
    // Strict mode masks email, phone, and street address
    assert.ok(!strictSanitized.includes('candidate@example.com'));
    assert.ok(strictSanitized.includes('[EMAIL]'));
    assert.ok(strictSanitized.includes('[PHONE]'));
    assert.ok(strictSanitized.includes('[STREET ADDRESS]'));
  });

  test('should produce safe candidate profile representations for LLM prompts', () => {
    const mockProfile: CandidateProfile = {
      fullName: 'Alex Morgan',
      email: 'alex.morgan@example.com',
      phone: '+1 (555) 987-6543',
      location: 'San Francisco, CA',
      city: 'San Francisco',
      country: 'USA',
      workAuthorization: 'US Citizen',
      requiresSponsorship: false,
      skills: ['Python', 'SQL', 'TypeScript'],
      workExperience: [],
      education: [],
      internships: [],
      projects: [],
      certifications: [],
      preferredRoles: ['Data Scientist'],
      preferredLocations: ['Remote'],
      resumeText: 'Alex Morgan - SSN: 000-12-3456, Phone: 555-123-4567.'
    };

    // Test STRICT profile
    const strictPrivacy = new PrivacyLayer({ level: 'STRICT' });
    const safeStrict = strictPrivacy.sanitizeProfile(mockProfile);

    assert.strictEqual(safeStrict.fullName, 'Applicant');
    assert.strictEqual(safeStrict.email, '[PROTECTED_EMAIL]');
    assert.strictEqual(safeStrict.phone, '[PROTECTED_PHONE]');
    assert.deepStrictEqual(safeStrict.skills, ['Python', 'SQL', 'TypeScript']);
    assert.ok(safeStrict.resumeText.includes('[REDACTED_SSN]'));
  });
});
