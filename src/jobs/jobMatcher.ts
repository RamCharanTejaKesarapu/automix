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

export class JobMatcher {
  private targetRole: string;
  private targetField: string;
  private targetLocation?: string;
  private threshold: number;

  constructor(options: {
    targetRole: string;
    targetField: string;
    targetLocation?: string;
    threshold?: number;
  }) {
    this.targetRole = options.targetRole;
    this.targetField = options.targetField;
    this.targetLocation = options.targetLocation;
    this.threshold = options.threshold ?? 65;
  }

  public async evaluateJob(
    job: DiscoveredJob,
    profile: CandidateProfile
  ): Promise<JobAnalysisResult> {
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
