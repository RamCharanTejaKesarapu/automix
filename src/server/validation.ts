import { z } from 'zod';

export const SessionStartSchema = z.object({
  websiteUrl: z
    .string()
    .url({ message: 'websiteUrl must be a valid URL (e.g. https://remoteok.com)' })
    .default('https://remoteok.com/remote-engineer-jobs'),
  targetField: z.string().min(1, 'targetField cannot be empty').default('Data Science'),
  targetRole: z.string().min(1, 'targetRole cannot be empty').default('Data Science Intern'),
  targetLocation: z.string().optional(),
  keywords: z.string().optional(),
  maxApplications: z.number().int().min(1).max(100).default(25),
  autoSubmit: z.boolean().default(false),
  matchThreshold: z.number().min(0).max(100).default(65),
  headless: z.boolean().default(false)
});

export const CandidateProfileSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().default(''),
  location: z.string().default(''),
  city: z.string().optional(),
  country: z.string().optional(),
  linkedin: z.string().url().or(z.literal('')).optional(),
  github: z.string().url().or(z.literal('')).optional(),
  portfolio: z.string().url().or(z.literal('')).optional(),
  workAuthorization: z.string().default(''),
  requiresSponsorship: z.boolean().default(false),
  currentCompany: z.string().optional(),
  currentTitle: z.string().optional(),
  yearsExperience: z.number().nonnegative().optional(),
  skills: z.array(z.string()).default([]),
  preferredRoles: z.array(z.string()).default([]),
  preferredLocations: z.array(z.string()).default([]),
  salaryExpectation: z.string().optional(),
  noticePeriodDays: z.number().nonnegative().optional(),
  resumePath: z.string().optional(),
  resumeFileName: z.string().optional(),
  resumeText: z.string().default('')
}).passthrough();

export const HitlResponseSchema = z.object({
  promptId: z.string().min(1, 'promptId is required'),
  answer: z.string(),
  savePermanently: z.boolean().default(false)
});

export const LLMConfigSchema = z.object({
  apiKey: z.string().optional(),
  baseUrl: z.string().url().or(z.literal('')).optional(),
  model: z.string().optional()
});

export type ValidatedSessionStart = z.infer<typeof SessionStartSchema>;
export type ValidatedCandidateProfile = z.infer<typeof CandidateProfileSchema>;
export type ValidatedHitlResponse = z.infer<typeof HitlResponseSchema>;
export type ValidatedLLMConfig = z.infer<typeof LLMConfigSchema>;
