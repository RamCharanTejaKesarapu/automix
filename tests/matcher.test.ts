import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { JobMatcher } from '../src/jobs/jobMatcher.js';

describe('JobMatcher Pre-Filtering & Validation', () => {
  it('should filter out senior roles when searching for intern/junior roles', () => {
    const matcher = new JobMatcher({
      targetRole: 'Data Science Intern',
      targetField: 'Data Science'
    });

    const seniorJob = matcher.isQuickMismatch('Senior Data Scientist');
    assert.equal(seniorJob.mismatch, true);
    assert.match(seniorJob.reason || '', /senior/i);

    const leadJob = matcher.isQuickMismatch('Lead Machine Learning Engineer');
    assert.equal(leadJob.mismatch, true);

    const directorJob = matcher.isQuickMismatch('Director of AI Research');
    assert.equal(directorJob.mismatch, true);
  });

  it('should allow valid intern and entry level roles', () => {
    const matcher = new JobMatcher({
      targetRole: 'Data Science Intern',
      targetField: 'Data Science'
    });

    const validIntern = matcher.isQuickMismatch('Data Science Intern (Summer 2026)');
    assert.equal(validIntern.mismatch, false);

    const juniorJob = matcher.isQuickMismatch('Junior Data Analyst');
    assert.equal(juniorJob.mismatch, false);
  });

  it('should respect custom exclude keywords', () => {
    const matcher = new JobMatcher({
      targetRole: 'Software Engineer',
      targetField: 'Engineering',
      excludeKeywords: ['manager', 'contract']
    });

    const managerJob = matcher.isQuickMismatch('Engineering Manager');
    assert.equal(managerJob.mismatch, true);

    const engineerJob = matcher.isQuickMismatch('Software Engineer II');
    assert.equal(engineerJob.mismatch, false);
  });
});
