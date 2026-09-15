import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FieldMapper } from '../src/applications/fieldMapper.js';
import { FormFieldDescriptor } from '../src/applications/formDetector.js';
import { CandidateProfile } from '../src/profile/candidateProfile.js';

describe('FieldMapper Strategy & Value Planning', () => {
  const mockProfile: CandidateProfile = {
    fullName: 'Jane Doe',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane.doe@example.com',
    phone: '+1 555-0199',
    linkedin: 'https://linkedin.com/in/janedoe',
    github: 'https://github.com/janedoe',
    portfolio: 'https://janedoe.dev',
    city: 'San Francisco',
    state: 'CA',
    country: 'United States',
    postalCode: '94105',
    location: 'San Francisco, CA',
    workAuthorization: 'Yes, authorized to work in US',
    requiresSponsorship: 'No sponsorship required',
    skills: ['Python', 'TypeScript', 'SQL', 'Machine Learning'],
    education: [
      {
        institution: 'UC Berkeley',
        degree: 'Bachelor of Science in Computer Science',
        fieldOfStudy: 'Computer Science',
        graduationYear: '2025',
        gpa: '3.90'
      }
    ],
    workExperience: [
      {
        company: 'Acme Corp',
        role: 'Software Engineer Intern',
        startDate: '2024-05',
        endDate: '2024-08',
        description: 'Built distributed pipelines.'
      }
    ],
    internships: [],
    projects: [],
    customFields: {}
  };

  it('should map standard identity fields directly from profile', () => {
    const emailField: FormFieldDescriptor = {
      id: 'f_email',
      selector: '#email',
      tagName: 'input',
      inputType: 'email',
      labelText: 'Email Address',
      isRequired: true,
      fieldType: 'email'
    };

    const plan = FieldMapper.mapField(emailField, mockProfile, new Map());
    assert.equal(plan.strategy, 'DIRECT_PROFILE_VALUE');
    assert.equal(plan.value, 'jane.doe@example.com');
  });

  it('should map ATS-specific questions (salary & notice period)', () => {
    const salaryField: FormFieldDescriptor = {
      id: 'f_salary',
      selector: '#salary',
      tagName: 'input',
      labelText: 'Desired Salary',
      isRequired: false,
      fieldType: 'salary_expectation'
    };

    const plan = FieldMapper.mapField(salaryField, mockProfile, new Map());
    assert.equal(plan.strategy, 'DIRECT_PROFILE_VALUE');
    assert.ok(plan.value?.includes('Competitive'));
  });

  it('should prioritize in-memory session learned answers over profile default', () => {
    const customField: FormFieldDescriptor = {
      id: 'f_referral',
      selector: '#ref',
      tagName: 'input',
      labelText: 'How did you hear about this opportunity?',
      isRequired: true,
      fieldType: 'hear_about_us'
    };

    const sessionAnswers = new Map<string, string>();
    sessionAnswers.set('How did you hear about this opportunity?', 'Tech Conference 2026');

    const plan = FieldMapper.mapField(customField, mockProfile, sessionAnswers);
    assert.equal(plan.strategy, 'LEARNED_ANSWER');
    assert.equal(plan.value, 'Tech Conference 2026');
  });
});
