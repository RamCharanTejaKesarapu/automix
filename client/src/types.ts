export type ApplicationState =
  | 'IDLE'
  | 'DISCOVERING'
  | 'JOB_FOUND'
  | 'MATCH_VALIDATION'
  | 'OPENING_APPLICATION'
  | 'FILLING_FIELDS'
  | 'WAITING_FOR_USER'
  | 'GENERATING_GPT_RESPONSE'
  | 'VALIDATING_APPLICATION'
  | 'READY_TO_SUBMIT'
  | 'SUBMITTING'
  | 'SUBMITTED'
  | 'RETURN_TO_SEARCH'
  | 'NEXT_JOB'
  | 'PAUSED'
  | 'STOPPED'
  | 'ERROR';

export interface CurrentApplicationContext {
  id?: string;
  company: string;
  jobTitle: string;
  jobUrl: string;
  applicationUrl?: string;
  matchScore?: number;
  matchReason?: string;
  totalFields: number;
  filledFields: number;
  currentFieldName?: string;
  currentAction?: string;
  pendingQuestion?: string;
  pendingOptions?: string[];
  pendingMissingInfo?: string;
  requiresSecurityVerification?: boolean;
}

export interface AutomationStatistics {
  jobsFound: number;
  matchingJobs: number;
  applicationsSubmitted: number;
  skipped: number;
  waitingForUser: number;
  failed: number;
}

export interface PendingPrompt {
  id: string;
  type: 'MISSING_INFO' | 'CAPTCHA_VERIFICATION' | 'SUBMISSION_CONFIRMATION';
  title: string;
  question: string;
  options?: string[];
  company: string;
  jobTitle: string;
  timestamp: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  job_title?: string;
  company?: string;
  action: string;
  result?: string;
  error?: string;
  level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR';
}

export interface ApplicationRecord {
  id: string;
  company: string;
  job_title: string;
  job_url: string;
  application_url?: string;
  date_applied?: string;
  status: 'DISCOVERED' | 'APPLYING' | 'SUBMITTED' | 'PENDING_REVIEW' | 'FAILED' | 'SKIPPED';
  source?: string;
  job_id?: string;
  match_score?: number;
  match_reason?: string;
  fields_filled?: Record<string, any>;
  gpt_answers?: Record<string, any>;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface LearnedAnswer {
  id: string;
  questionPattern: string;
  normalizedKey: string;
  answer: string;
  category?: string;
  createdAt: string;
}
