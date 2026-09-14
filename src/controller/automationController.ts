import { BrowserManager, globalBrowserManager } from '../browser/browserManager.js';
import { PageManager } from '../browser/pageManager.js';
import { JobDiscoveryEngine } from '../jobs/jobDiscovery.js';
import { JobMatcher } from '../jobs/jobMatcher.js';
import { ApplicationEngine } from '../applications/applicationEngine.js';
import { candidateProfileRepository } from '../profile/candidateProfile.js';
import { applicationRepository } from '../database/applications.js';
import { globalStateMachine, ApplicationState } from '../state/stateMachine.js';

export interface AutomationRunConfig {
  websiteUrl: string;
  targetField: string;
  targetRole: string;
  targetLocation?: string;
  keywords?: string;
  maxApplications: number;
  autoSubmit: boolean;
  matchThreshold: number;
  headless: boolean;
}

export class AutomationController {
  private browserManager: BrowserManager;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private shouldStop: boolean = false;
  private currentConfig: AutomationRunConfig | null = null;

  constructor(browserManager: BrowserManager = globalBrowserManager) {
    this.browserManager = browserManager;
  }

  public getStatus() {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      state: globalStateMachine.getState(),
      context: globalStateMachine.getContext(),
      stats: globalStateMachine.getStats(),
      config: this.currentConfig
    };
  }

  /**
   * Starts the end-to-end automation lifecycle
   */
  public async start(config: AutomationRunConfig): Promise<void> {
    if (this.isRunning) {
      throw new Error('Automation is already running.');
    }

    this.isRunning = true;
    this.isPaused = false;
    this.shouldStop = false;
    this.currentConfig = config;

    globalStateMachine.resetStats();
    applicationRepository.logActivity({
      action: `Starting Automation Session for "${config.targetRole}" in "${config.targetField}"`,
      level: 'INFO'
    });

    let applicationsCompleted = 0;

    try {
      // 1. Initialize browser
      const page = await this.browserManager.init(config.headless);
      const pageManager = new PageManager(page);
      const discoveryEngine = new JobDiscoveryEngine(page, pageManager);
      const jobMatcher = new JobMatcher({
        targetRole: config.targetRole,
        targetField: config.targetField,
        targetLocation: config.targetLocation,
        threshold: config.matchThreshold
      });

      const profile = candidateProfileRepository.getProfile();

      // 2. Discover Jobs on specified website
      globalStateMachine.transitionTo('DISCOVERING');
      await discoveryEngine.navigateAndSearch({
        websiteUrl: config.websiteUrl,
        targetRole: config.targetRole,
        targetField: config.targetField,
        targetLocation: config.targetLocation,
        keywords: config.keywords
      });

      let consecutiveFailures = 0;
      let searchPageUrl = page.url();

      while (this.isRunning && !this.shouldStop && applicationsCompleted < config.maxApplications) {
        await this.checkPauseState();
        if (this.shouldStop) break;

        // Extract available jobs from current search page
        const discovered = await discoveryEngine.discoverJobListingElements();
        globalStateMachine.incrementStats('jobsFound', discovered.length);

        applicationRepository.logActivity({
          action: `Discovered ${discovered.length} job listings on page`,
          level: 'INFO'
        });

        if (discovered.length === 0) {
          // Attempt to scroll or load next page
          const hasMore = await discoveryEngine.loadMoreListings();
          if (!hasMore) {
            applicationRepository.logActivity({
              action: 'No more matching jobs found on the website.',
              level: 'INFO'
            });
            break;
          }
          continue;
        }

        // Process jobs one at a time
        for (const job of discovered) {
          if (this.shouldStop || applicationsCompleted >= config.maxApplications) break;
          await this.checkPauseState();

          globalStateMachine.transitionTo('JOB_FOUND', {
            company: job.company,
            jobTitle: job.title,
            jobUrl: job.url
          });

          // Check for duplicate application
          if (applicationRepository.isDuplicate(job.url, job.company, job.title)) {
            console.log(`[AutomationController] Skipping duplicate: ${job.title} at ${job.company}`);
            globalStateMachine.incrementStats('skipped', 1);
            continue;
          }

          // Evaluate match
          globalStateMachine.transitionTo('MATCH_VALIDATION', {
            company: job.company,
            jobTitle: job.title,
            currentAction: `Evaluating match for ${job.title}`
          });

          const match = await jobMatcher.evaluateJob(job, profile);
          if (!match.isMatch) {
            globalStateMachine.incrementStats('skipped', 1);
            applicationRepository.logActivity({
              job_title: job.title,
              company: job.company,
              action: `Skipped: match score ${match.matchScore}% below threshold (${config.matchThreshold}%)`,
              result: match.reason,
              level: 'INFO'
            });

            // Record as SKIPPED
            applicationRepository.create({
              company: job.company,
              job_title: job.title,
              job_url: job.url,
              status: 'SKIPPED',
              match_score: match.matchScore,
              match_reason: match.reason
            });

            continue;
          }

          // Job is a match!
          globalStateMachine.incrementStats('matchingJobs', 1);
          applicationRepository.logActivity({
            job_title: job.title,
            company: job.company,
            action: `✓ Found matching job: ${job.title} (${match.matchScore}%)`,
            level: 'SUCCESS'
          });

          // Save application record as APPLYING
          const appRecord = applicationRepository.create({
            company: job.company,
            job_title: job.title,
            job_url: job.url,
            status: 'APPLYING',
            match_score: match.matchScore,
            match_reason: match.reason
          });

          // Execute single application
          const appEngine = new ApplicationEngine({
            job,
            profile,
            autoSubmit: config.autoSubmit,
            page,
            pageManager
          });

          try {
            const success = await appEngine.execute();
            if (success) {
              applicationsCompleted++;
              consecutiveFailures = 0;
              applicationRepository.update(appRecord.id, {
                status: 'SUBMITTED',
                date_applied: new Date().toISOString()
              });
            } else {
              applicationRepository.update(appRecord.id, {
                status: 'PENDING_REVIEW',
                error_message: 'Manual review required / user cancelled'
              });
            }
          } catch (appErr: any) {
            consecutiveFailures++;
            console.error(`[AutomationController] Error applying to ${job.title}:`, appErr);
            applicationRepository.update(appRecord.id, {
              status: 'FAILED',
              error_message: appErr.message || 'Error occurred during application'
            });

            applicationRepository.logActivity({
              job_title: job.title,
              company: job.company,
              action: 'FAILED — Manual Review Required',
              error: appErr.message,
              level: 'ERROR'
            });

            if (consecutiveFailures >= 5) {
              applicationRepository.logActivity({
                action: 'Automation halted due to repeated application failures.',
                level: 'ERROR'
              });
              break;
            }
          }

          // Return to search / job listings page automatically
          globalStateMachine.transitionTo('RETURN_TO_SEARCH', { currentAction: 'Returning to job listings' });
          applicationRepository.logActivity({
            action: '✓ Returned to results',
            level: 'SUCCESS'
          });

          await page.goto(searchPageUrl, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
          await pageManager.waitQuiet(2000);

          globalStateMachine.transitionTo('NEXT_JOB', { currentAction: 'Searching for next job' });
          applicationRepository.logActivity({
            action: '→ Searching for next job',
            level: 'INFO'
          });
          await page.waitForTimeout(1000);
        }

        // Try loading next set of jobs
        await discoveryEngine.loadMoreListings();
      }

      globalStateMachine.transitionTo('STOPPED');
      applicationRepository.logActivity({
        action: `Automation finished. Submitted ${applicationsCompleted} applications.`,
        level: 'SUCCESS'
      });
    } catch (err: any) {
      const isGracefulStop = this.shouldStop
        || err?.message?.includes('Target page, context or browser has been closed')
        || err?.message?.includes('Browser or context closed')
        || err?.message?.includes('Page closed')
        || err?.message?.includes('Target closed');

      if (isGracefulStop) {
        console.log('[AutomationController] Session ended (browser closed or stop requested).');
        globalStateMachine.transitionTo('STOPPED');
        applicationRepository.logActivity({
          action: `Automation session ended. ${applicationsCompleted} application(s) submitted.`,
          level: 'INFO'
        });
      } else {
        console.error('[AutomationController] Fatal error:', err);
        globalStateMachine.transitionTo('ERROR');
        applicationRepository.logActivity({
          action: 'Fatal Automation Error',
          error: err.message,
          level: 'ERROR'
        });
      }
    } finally {
      this.isRunning = false;
      this.isPaused = false;
    }
  }

  public pause(): void {
    if (this.isRunning && !this.isPaused) {
      this.isPaused = true;
      globalStateMachine.transitionTo('PAUSED');
      applicationRepository.logActivity({
        action: 'Automation paused by user',
        level: 'WARN'
      });
    }
  }

  public resume(): void {
    if (this.isRunning && this.isPaused) {
      this.isPaused = false;
      globalStateMachine.transitionTo('FILLING_FIELDS');
      applicationRepository.logActivity({
        action: 'Automation resumed by user',
        level: 'INFO'
      });
    }
  }

  public async stop(): Promise<void> {
    this.shouldStop = true;
    this.isRunning = false;
    this.isPaused = false;
    globalStateMachine.transitionTo('STOPPED');
    applicationRepository.logActivity({
      action: 'Automation stopped by user',
      level: 'WARN'
    });
    await this.browserManager.close();
  }

  private async checkPauseState(): Promise<void> {
    while (this.isPaused && !this.shouldStop) {
      await new Promise(r => setTimeout(r, 500));
    }
  }
}

export const globalAutomationController = new AutomationController();
