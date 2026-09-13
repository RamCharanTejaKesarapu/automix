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
  pendingQuestion?: string;
  pendingOptions?: string[];
  pendingMissingInfo?: string;
  requiresSecurityVerification?: boolean;
}

export interface AutomationStatistics {
  jobsFound: number;
  matchingJobs: number;
  applicationsSubmitted: number;
  waitingForUser: number;
  failed: number;
}

export type StateChangeListener = (
  state: ApplicationState,
  context: CurrentApplicationContext | null,
  stats: AutomationStatistics
) => void;

export class ApplicationStateMachine {
  private currentState: ApplicationState = 'IDLE';
  private previousState: ApplicationState = 'IDLE';
  private context: CurrentApplicationContext | null = null;
  private stats: AutomationStatistics = {
    jobsFound: 0,
    matchingJobs: 0,
    applicationsSubmitted: 0,
    waitingForUser: 0,
    failed: 0
  };
  private listeners: Set<StateChangeListener> = new Set();
  private stateHistory: Array<{ state: ApplicationState; timestamp: string }> = [];

  constructor() {
    this.recordState('IDLE');
  }

  public getState(): ApplicationState {
    return this.currentState;
  }

  public getContext(): CurrentApplicationContext | null {
    return this.context;
  }

  public getStats(): AutomationStatistics {
    return { ...this.stats };
  }

  public onStateChange(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public transitionTo(nextState: ApplicationState, contextUpdates?: Partial<CurrentApplicationContext>): void {
    console.log(`[StateMachine] Transition: ${this.currentState} -> ${nextState}`);
    this.previousState = this.currentState;
    this.currentState = nextState;

    if (contextUpdates) {
      this.context = {
        company: '',
        jobTitle: '',
        jobUrl: '',
        totalFields: 0,
        filledFields: 0,
        ...this.context,
        ...contextUpdates
      };
    }

    if (nextState === 'WAITING_FOR_USER') {
      this.stats.waitingForUser++;
    } else if (this.previousState === 'WAITING_FOR_USER') {
      this.stats.waitingForUser = Math.max(0, this.stats.waitingForUser - 1);
    }

    if (nextState === 'SUBMITTED') {
      this.stats.applicationsSubmitted++;
    }

    this.recordState(nextState);
    this.notify();
  }

  public setContext(context: CurrentApplicationContext | null): void {
    this.context = context;
    this.notify();
  }

  public updateFieldProgress(filled: number, total?: number, currentName?: string): void {
    if (!this.context) return;
    this.context.filledFields = filled;
    if (total !== undefined) this.context.totalFields = total;
    if (currentName !== undefined) this.context.currentFieldName = currentName;
    this.notify();
  }

  public incrementStats(key: keyof AutomationStatistics, amount = 1): void {
    this.stats[key] += amount;
    this.notify();
  }

  public resetStats(): void {
    this.stats = {
      jobsFound: 0,
      matchingJobs: 0,
      applicationsSubmitted: 0,
      waitingForUser: 0,
      failed: 0
    };
    this.notify();
  }

  public markFailed(): void {
    this.stats.failed++;
    this.transitionTo('ERROR');
  }

  private recordState(state: ApplicationState) {
    this.stateHistory.push({
      state,
      timestamp: new Date().toISOString()
    });
    if (this.stateHistory.length > 50) {
      this.stateHistory.shift();
    }
  }

  private notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.currentState, this.context, { ...this.stats });
      } catch (err) {
        console.error('[StateMachine] Listener error:', err);
      }
    }
  }
}

export const globalStateMachine = new ApplicationStateMachine();
