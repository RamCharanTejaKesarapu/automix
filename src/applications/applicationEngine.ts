import { Page } from 'playwright';
import { PageManager } from '../browser/pageManager.js';
import { SecurityDetector } from '../browser/securityDetector.js';
import { FormDetector, FormFieldDescriptor } from './formDetector.js';
import { FieldMapper } from './fieldMapper.js';
import { ApplicationValidator } from './validator.js';
import { generateApplicationAnswer } from '../ai/openai/question-answer.js';
import { matchQuestionToProfile } from '../ai/openai/field-matching.js';
import { CandidateProfile } from '../profile/candidateProfile.js';
import { globalApprovalManager } from '../human/approvalManager.js';
import { globalStateMachine } from '../state/stateMachine.js';
import { applicationRepository } from '../database/applications.js';
import { DiscoveredJob } from '../jobs/jobMatcher.js';

export interface ApplicationRunOptions {
  job: DiscoveredJob;
  profile: CandidateProfile;
  autoSubmit: boolean;
  page: Page;
  pageManager: PageManager;
}

export class ApplicationEngine {
  private page: Page;
  private pageManager: PageManager;
  private job: DiscoveredJob;
  private profile: CandidateProfile;
  private autoSubmit: boolean;
  private filledFieldsMap: Record<string, any> = {};
  private gptAnswersMap: Record<string, any> = {};

  constructor(options: ApplicationRunOptions) {
    this.page = options.page;
    this.pageManager = options.pageManager;
    this.job = options.job;
    this.profile = options.profile;
    this.autoSubmit = options.autoSubmit;
  }

  /**
   * Executes the full application flow for a single job
   */
  public async execute(): Promise<boolean> {
    const job = this.job;
    applicationRepository.logActivity({
      job_title: job.title,
      company: job.company,
      action: 'Opened job application page',
      level: 'INFO'
    });

    globalStateMachine.transitionTo('OPENING_APPLICATION', {
      company: job.company,
      jobTitle: job.title,
      jobUrl: job.url,
      filledFields: 0,
      totalFields: 0
    });

    // 1. Navigate to job URL if not already there
    if (this.page.url() !== job.url) {
      await this.page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 35000 }).catch(() => {});
      await this.pageManager.waitQuiet(2000);
    }
    await this.pageManager.dismissPopups();

    // 2. Check for security challenge
    await this.handleSecurityVerificationIfNeeded();

    // 3. Find and click "Apply" button if form is not already on page
    await this.findAndClickApplyButton();
    await this.handleSecurityVerificationIfNeeded();

    // 4. Multi-step form processing loop (max 5 steps to prevent infinite loops)
    let currentStep = 1;
    const maxSteps = 6;

    while (currentStep <= maxSteps) {
      console.log(`[ApplicationEngine] Processing application step ${currentStep}...`);
      await this.pageManager.waitQuiet(1500);

      // Detect fields on current step
      const fields = await FormDetector.detectFormFields(this.page);
      if (fields.length === 0) {
        console.log('[ApplicationEngine] No interactive fields detected on current step.');
      } else {
        globalStateMachine.updateFieldProgress(
          Object.keys(this.filledFieldsMap).length,
          fields.length
        );

        globalStateMachine.transitionTo('FILLING_FIELDS');

        // Fill all detected fields on this step
        await this.fillFields(fields);
      }

      // Check if there is a "Next" / "Continue" button for multi-step wizards
      const nextButton = await this.findStepProgressionButton();
      if (nextButton && !nextButton.isFinalSubmit) {
        console.log(`[ApplicationEngine] Advancing step with button: "${nextButton.text}"`);
        applicationRepository.logActivity({
          job_title: job.title,
          company: job.company,
          action: `Completed step ${currentStep}, proceeding to next page`,
          level: 'INFO'
        });
        await nextButton.click();
        await this.pageManager.waitQuiet(2500);
        currentStep++;
      } else {
        // We have reached the final step / submission step
        break;
      }
    }

    // 5. Validation Step
    globalStateMachine.transitionTo('VALIDATING_APPLICATION');
    const finalFields = await FormDetector.detectFormFields(this.page);
    const validation = await ApplicationValidator.validateApplication(this.page, finalFields);

    if (!validation.isValid) {
      applicationRepository.logActivity({
        job_title: job.title,
        company: job.company,
        action: `Validation failed: missing fields [${validation.missingRequiredFields.join(', ')}]`,
        level: 'WARN'
      });

      // Ask user to provide missing required fields via HITL
      for (const missingField of validation.missingRequiredFields) {
        globalStateMachine.transitionTo('WAITING_FOR_USER', {
          pendingQuestion: `Missing required field: ${missingField}`
        });

        const userVal = await globalApprovalManager.requestUserInput({
          type: 'MISSING_INFO',
          title: 'Mandatory Information Required',
          question: `The application requires: "${missingField}". Please provide your answer:`,
          company: job.company,
          jobTitle: job.title
        });

        // Try to find and fill it
        const target = finalFields.find(f => f.labelText.includes(missingField) || f.name?.includes(missingField));
        if (target) {
          await this.pageManager.safeType(target.selector, userVal);
          this.filledFieldsMap[missingField] = userVal;
        }
      }
    }

    // 6. Submit Safety Check
    globalStateMachine.transitionTo('READY_TO_SUBMIT');

    if (!this.autoSubmit) {
      applicationRepository.logActivity({
        job_title: job.title,
        company: job.company,
        action: 'Application ready. Paused for user approval (Auto-Submit is OFF)',
        level: 'INFO'
      });

      globalStateMachine.transitionTo('WAITING_FOR_USER', {
        pendingQuestion: `Approve submission for ${job.title} at ${job.company}?`
      });

      const approval = await globalApprovalManager.requestUserInput({
        type: 'SUBMISSION_CONFIRMATION',
        title: 'Application Ready for Submission',
        question: `All fields for "${job.title}" at ${job.company} have been filled and verified. Ready to submit?`,
        options: ['Approve & Submit', 'Cancel / Skip'],
        company: job.company,
        jobTitle: job.title
      });

      if (approval !== 'Approve & Submit') {
        applicationRepository.logActivity({
          job_title: job.title,
          company: job.company,
          action: 'Submission skipped by user.',
          level: 'WARN'
        });
        return false;
      }
    }

    // 7. Submitting
    globalStateMachine.transitionTo('SUBMITTING');
    applicationRepository.logActivity({
      job_title: job.title,
      company: job.company,
      action: 'Submitting application form',
      level: 'INFO'
    });

    const submitted = await this.clickFinalSubmitButton();
    if (submitted) {
      await this.pageManager.waitQuiet(3000);
      globalStateMachine.transitionTo('SUBMITTED');
      applicationRepository.logActivity({
        job_title: job.title,
        company: job.company,
        action: 'Successfully submitted application!',
        result: 'Application confirmed',
        level: 'SUCCESS'
      });

      return true;
    } else {
      applicationRepository.logActivity({
        job_title: job.title,
        company: job.company,
        action: 'Failed to locate or trigger final submit button',
        level: 'ERROR'
      });
      return false;
    }
  }

  /**
   * Iterates through detected fields and fills them according to mapping plans
   */
  private async fillFields(fields: FormFieldDescriptor[]): Promise<void> {
    const sessionAnswers = globalApprovalManager.getSessionAnswers();

    let filledCount = 0;
    for (const field of fields) {
      // Don't overwrite already filled fields if they have value
      if (field.currentValue && field.currentValue.trim().length > 0 && field.fieldType !== 'resume_upload') {
        filledCount++;
        continue;
      }

      const plan = FieldMapper.mapField(field, this.profile, sessionAnswers);
      const fieldIdentifier = field.labelText || field.name || field.id || field.selector;

      globalStateMachine.updateFieldProgress(
        filledCount,
        fields.length,
        field.labelText || field.name || field.fieldType
      );

      switch (plan.strategy) {
        case 'DIRECT_PROFILE_VALUE':
        case 'LEARNED_ANSWER':
          if (plan.value) {
            await this.pageManager.safeType(field.selector, plan.value);
            this.filledFieldsMap[fieldIdentifier] = plan.value;
            applicationRepository.logActivity({
              job_title: this.job.title,
              company: this.job.company,
              action: `Filled ${field.labelText || field.name || field.fieldType}`,
              level: 'INFO'
            });
          }
          break;

        case 'FILE_UPLOAD':
          if (this.profile.resumePath) {
            await this.pageManager.uploadFile(field.selector, this.profile.resumePath);
            this.filledFieldsMap[fieldIdentifier] = this.profile.resumePath;
            applicationRepository.logActivity({
              job_title: this.job.title,
              company: this.job.company,
              action: `Uploaded resume document`,
              level: 'INFO'
            });
          }
          break;

        case 'CHECKBOX_AGREE':
          await this.pageManager.safeCheck(field.selector, true);
          this.filledFieldsMap[fieldIdentifier] = 'checked';
          break;

        case 'AI_QUESTION_ANSWER':
          globalStateMachine.transitionTo('GENERATING_GPT_RESPONSE', {
            currentFieldName: field.labelText || 'Contextual Question'
          });

          applicationRepository.logActivity({
            job_title: this.job.title,
            company: this.job.company,
            action: `Generating GPT response for: "${(field.labelText || 'Question').substring(0, 60)}"`,
            level: 'INFO'
          });

          const gptResult = await generateApplicationAnswer({
            question: field.labelText || field.surroundingText || 'Why are you a good fit for this role?',
            jobTitle: this.job.title,
            company: this.job.company,
            jobDescription: this.job.fullDescription || this.job.snippet,
            candidateProfile: this.profile
          });

          if (gptResult.requiresHumanInput || !gptResult.answer) {
            // Need human in the loop
            globalStateMachine.transitionTo('WAITING_FOR_USER', {
              pendingQuestion: field.labelText || 'Question',
              pendingMissingInfo: gptResult.missingInformation
            });

            const userAnswer = await globalApprovalManager.requestUserInput({
              type: 'MISSING_INFO',
              title: 'Additional Information Required',
              question: field.labelText || field.surroundingText || 'Please provide your answer:',
              company: this.job.company,
              jobTitle: this.job.title
            });

            globalStateMachine.transitionTo('FILLING_FIELDS');
            await this.pageManager.safeType(field.selector, userAnswer);
            this.filledFieldsMap[fieldIdentifier] = userAnswer;
            this.gptAnswersMap[fieldIdentifier] = userAnswer;
          } else {
            // AI generated answer with high confidence
            globalStateMachine.transitionTo('FILLING_FIELDS');
            await this.pageManager.safeType(field.selector, gptResult.answer);
            this.filledFieldsMap[fieldIdentifier] = gptResult.answer;
            this.gptAnswersMap[fieldIdentifier] = gptResult.answer;
          }
          break;

        case 'AI_OPTION_MATCH':
          if (field.options && field.options.length > 0) {
            const match = await matchQuestionToProfile({
              question: field.labelText || field.surroundingText || field.name || '',
              options: field.options,
              candidateProfile: this.profile
            });

            if (match.selectedOption && !match.requiresHumanInput) {
              if (field.tagName === 'select') {
                await this.pageManager.safeSelect(field.selector, match.selectedOption);
              } else {
                await this.pageManager.safeClick(`${field.selector} option:has-text("${match.selectedOption}")`);
              }
              this.filledFieldsMap[fieldIdentifier] = match.selectedOption;
            } else {
              // Ask human
              globalStateMachine.transitionTo('WAITING_FOR_USER', {
                pendingQuestion: field.labelText,
                pendingOptions: field.options
              });

              const userChoice = await globalApprovalManager.requestUserInput({
                type: 'MISSING_INFO',
                title: 'Select an Option',
                question: field.labelText || 'Please select an option:',
                options: field.options,
                company: this.job.company,
                jobTitle: this.job.title
              });

              globalStateMachine.transitionTo('FILLING_FIELDS');
              if (field.tagName === 'select') {
                await this.pageManager.safeSelect(field.selector, userChoice);
              }
              this.filledFieldsMap[fieldIdentifier] = userChoice;
            }
          }
          break;

        case 'REQUIRES_USER_INPUT':
          globalStateMachine.transitionTo('WAITING_FOR_USER', {
            pendingQuestion: plan.missingDetailPrompt
          });

          const userInput = await globalApprovalManager.requestUserInput({
            type: 'MISSING_INFO',
            title: 'Information Required',
            question: plan.missingDetailPrompt || 'Please enter value:',
            company: this.job.company,
            jobTitle: this.job.title
          });

          globalStateMachine.transitionTo('FILLING_FIELDS');
          await this.pageManager.safeType(field.selector, userInput);
          this.filledFieldsMap[fieldIdentifier] = userInput;
          break;
      }

      filledCount++;
      await this.page.waitForTimeout(100);
    }
  }

  /**
   * Detects and pauses for security verifications (CAPTCHA / Cloudflare)
   */
  private async handleSecurityVerificationIfNeeded(): Promise<void> {
    const check = await SecurityDetector.checkForChallenge(this.page);
    if (check.detected) {
      console.log(`[ApplicationEngine] Security challenge detected: ${check.description}`);
      applicationRepository.logActivity({
        job_title: this.job.title,
        company: this.job.company,
        action: `Security verification challenge paused (${check.type})`,
        level: 'WARN'
      });

      globalStateMachine.transitionTo('WAITING_FOR_USER', {
        requiresSecurityVerification: true,
        pendingQuestion: 'A security verification is required. Please complete it in the browser.'
      });

      await globalApprovalManager.requestUserInput({
        type: 'CAPTCHA_VERIFICATION',
        title: 'Human Action Required',
        question: 'A security verification is required. Please complete it in the browser and click Continue.',
        options: ['Verification Completed, Continue'],
        company: this.job.company,
        jobTitle: this.job.title
      });

      globalStateMachine.transitionTo('OPENING_APPLICATION', {
        requiresSecurityVerification: false
      });
      await this.pageManager.waitQuiet(2000);
    }
  }

  /**
   * Finds and clicks Apply button if not already in form
   */
  private async findAndClickApplyButton(): Promise<boolean> {
    // Check if form is already directly on page (common in Greenhouse/Lever job boards)
    const existingInputs = await this.page.$$('input[name*="email" i], input[type="email"], #email');
    if (existingInputs.length > 0) {
      await this.pageManager.showAction('📋 Application form detected on page');
      return true;
    }

    const applySelectors = [
      'a:has-text("Apply Now")',
      'button:has-text("Apply Now")',
      'a:has-text("Apply for this job")',
      'button:has-text("Apply for this job")',
      'a:has-text("Easy Apply")',
      'button:has-text("Easy Apply")',
      'a:has-text("Apply")',
      'button:has-text("Apply")',
      '[data-testid*="apply" i]',
      '.apply-button'
    ];

    await this.pageManager.showAction('🔍 Looking for Apply button...');

    for (const sel of applySelectors) {
      const btn = await this.page.$(sel);
      if (btn && await btn.isVisible()) {
        const box = await btn.boundingBox();
        if (box) {
          await this.pageManager.visualClickAt(
            Math.round(box.x + box.width / 2),
            Math.round(box.y + box.height / 2)
          );
        }
        await this.pageManager.showAction('🖱️ Clicking Apply button...');
        await btn.scrollIntoViewIfNeeded().catch(() => {});
        await btn.click().catch(() => {});
        await this.pageManager.waitQuiet(2500);
        applicationRepository.logActivity({
          job_title: this.job.title,
          company: this.job.company,
          action: '✓ Apply button clicked — loading application form',
          level: 'SUCCESS'
        });
        return true;
      }
    }

    await this.pageManager.showAction('⚠️ Apply button not found, trying page form scan...');
    return false;
  }

  /**
   * Finds next step progression button (e.g. Next, Continue, Step 2)
   */
  private async findStepProgressionButton(): Promise<{ text: string; isFinalSubmit: boolean; click: () => Promise<void> } | null> {
    const candidates = await this.page.$$('button, input[type="submit"], a.btn, [role="button"]');

    for (const btn of candidates) {
      const isVisible = await btn.isVisible().catch(() => false);
      if (!isVisible) continue;

      const text = (await btn.innerText().catch(() => '')) || (await btn.getAttribute('value').catch(() => '')) || '';
      const trimmed = text.trim();

      // Check if it is the FINAL submit button
      if (/^(submit application|submit|apply now|send application|finish)$/i.test(trimmed)) {
        return {
          text: trimmed,
          isFinalSubmit: true,
          click: async () => { await btn.click(); }
        };
      }

      // Check if it is a STEP progression button
      if (/^(next|continue|save & continue|save and continue|proceed|review application)$/i.test(trimmed)) {
        return {
          text: trimmed,
          isFinalSubmit: false,
          click: async () => { await btn.click(); }
        };
      }
    }

    return null;
  }

  /**
   * Finds and clicks the final application submission button
   */
  private async clickFinalSubmitButton(): Promise<boolean> {
    const submitSelectors = [
      'input[type="submit"]',
      'button[type="submit"]',
      'button:has-text("Submit Application")',
      'button:has-text("Submit application")',
      'button:has-text("Submit")',
      'button:has-text("Send Application")',
      'button:has-text("Apply Now")'
    ];

    await this.pageManager.showAction('🚀 Locating submit button...');

    for (const sel of submitSelectors) {
      const btn = await this.page.$(sel);
      if (btn && await btn.isVisible()) {
        await btn.scrollIntoViewIfNeeded().catch(() => {});
        const box = await btn.boundingBox();
        if (box) {
          await this.pageManager.visualClickAt(
            Math.round(box.x + box.width / 2),
            Math.round(box.y + box.height / 2)
          );
        }
        await this.pageManager.showAction('🚀 Submitting application!');
        await btn.click().catch(() => {});
        return true;
      }
    }

    return false;
  }
}
