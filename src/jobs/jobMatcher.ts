import { CandidateProfile } from '../profile/candidateProfile.js';
import { analyzeJob, JobAnalysisResult } from '../ai/openai/job-analysis.js';

export interface DiscoveredJob {
  id: string;
  title: string;
  company: string;
  url: string;
  location?: string;
  snippet?: string;
  fullDescription?: string;
}

export interface JobMatcherOptions {
  targetRole: string;
  targetField: string;
  targetLocation?: string;
  threshold?: number;
  excludeKeywords?: string[];
}

export class JobMatcher {
  private targetRole: string;
  private targetField: string;
  private targetLocation?: string;
  private threshold: number;
  private excludeKeywords: string[];

  constructor(options: JobMatcherOptions) {
    this.targetRole = options.targetRole;
    this.targetField = options.targetField;
    this.targetLocation = options.targetLocation;
    this.threshold = options.threshold ?? 65;
    this.excludeKeywords = options.excludeKeywords ?? [
      'senior',
      'lead',
      'staff',
      'principal',
      'director',
      'vp',
      'head of'
    ];
  }

  /**
   * Fast pre-check: determine if the job is an obvious mismatch before expensive LLM analysis
   */
  public isQuickMismatch(jobTitle: string): { mismatch: boolean; reason?: string } {
    const titleLower = jobTitle.toLowerCase();
    const targetLower = this.targetRole.toLowerCase();

    const isSearchingEntryLevel = targetLower.includes('intern') || targetLower.includes('entry') || targetLower.includes('junior');

    for (const excluded of this.excludeKeywords) {
      if (!targetLower.includes(excluded) && new RegExp(`\\b${excluded}\\b`, 'i').test(titleLower)) {
        const isStandardSeniorityKeyword = ['senior', 'lead', 'staff', 'principal', 'director', 'vp', 'head of'].includes(excluded);
        if (!isStandardSeniorityKeyword || isSearchingEntryLevel) {
          return { mismatch: true, reason: `Excluded keyword: "${excluded}"` };
        }
      }
    }

    return { mismatch: false };
  }

  public async evaluateJob(
    job: DiscoveredJob,
    profile: CandidateProfile
  ): Promise<JobAnalysisResult> {
    const preCheck = this.isQuickMismatch(job.title);
    if (preCheck.mismatch) {
      return {
        matchScore: 25,
        isMatch: false,
        matchedSkills: [],
        missingSkills: [],
        reason: preCheck.reason || 'Title does not meet seniority criteria.',
      };
    }

    const description = job.fullDescription || job.snippet || `${job.title} at ${job.company}`;
    
    return await analyzeJob({
      jobTitle: job.title,
      company: job.company,
      jobDescription: description,
      targetRole: this.targetRole,
      targetField: this.targetField,
      targetLocation: this.targetLocation,
      candidateProfile: profile,
      threshold: this.threshold
    });
  }
}
