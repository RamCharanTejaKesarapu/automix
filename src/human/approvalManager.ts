import { EventEmitter } from 'events';
import { candidateProfileRepository } from '../profile/candidateProfile.js';

export type PromptType = 'MISSING_INFO' | 'CAPTCHA_VERIFICATION' | 'SUBMISSION_CONFIRMATION';

export interface PendingPrompt {
  id: string;
  type: PromptType;
  title: string;
  question: string;
  options?: string[];
  company: string;
  jobTitle: string;
  timestamp: string;
}

export interface PromptResolution {
  promptId: string;
  answer: string;
  savePermanently?: boolean;
}

export class ApprovalManager extends EventEmitter {
  private activePrompt: PendingPrompt | null = null;
  private pendingResolver: ((resolution: PromptResolution) => void) | null = null;
  private sessionAnswers: Map<string, string> = new Map();

  public getActivePrompt(): PendingPrompt | null {
    return this.activePrompt;
  }

  public getSessionAnswers(): Map<string, string> {
    return this.sessionAnswers;
  }

  /**
   * Request human input and pause execution until user provides answer in dashboard
   */
  public async requestUserInput(params: {
    type: PromptType;
    title: string;
    question: string;
    options?: string[];
    company: string;
    jobTitle: string;
  }): Promise<string> {
    const promptId = `prompt_${Date.now()}`;
    this.activePrompt = {
      id: promptId,
      type: params.type,
      title: params.title,
      question: params.question,
      options: params.options,
      company: params.company,
      jobTitle: params.jobTitle,
      timestamp: new Date().toISOString()
    };

    console.log(`[ApprovalManager] WAITING FOR USER INPUT: "${params.question}"`);
    this.emit('prompt', this.activePrompt);

    return new Promise<string>((resolve) => {
      this.pendingResolver = (resolution: PromptResolution) => {
        const answer = resolution.answer;

        // Remember in session context
        this.sessionAnswers.set(params.question, answer);

        // Optionally persist permanently to profile learned bank
        if (resolution.savePermanently) {
          candidateProfileRepository.saveLearnedAnswer(params.question, answer);
        }

        this.activePrompt = null;
        this.pendingResolver = null;
        this.emit('resolved', { promptId, answer });
        resolve(answer);
      };
    });
  }

  /**
   * Called when user submits response via Dashboard / API
   */
  public resolvePrompt(resolution: PromptResolution): boolean {
    if (!this.activePrompt || this.activePrompt.id !== resolution.promptId || !this.pendingResolver) {
      return false;
    }
    this.pendingResolver(resolution);
    return true;
  }
}

export const globalApprovalManager = new ApprovalManager();
