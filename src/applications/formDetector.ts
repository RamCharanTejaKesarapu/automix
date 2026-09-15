import { Page } from 'playwright';

export type DetectedFieldType =
  | 'full_name'
  | 'first_name'
  | 'last_name'
  | 'email'
  | 'phone'
  | 'location'
  | 'city'
  | 'state'
  | 'postal_code'
  | 'country'
  | 'linkedin'
  | 'github'
  | 'portfolio'
  | 'resume_upload'
  | 'cover_letter_upload'
  | 'cover_letter_text'
  | 'open_ended_question'
  | 'work_authorization'
  | 'sponsorship'
  | 'education_degree'
  | 'education_school'
  | 'graduation_year'
  | 'gpa'
  | 'salary_expectation'
  | 'notice_period'
  | 'hear_about_us'
  | 'select_dropdown'
  | 'radio_group'
  | 'checkbox_consent'
  | 'generic_text';

export interface FormFieldDescriptor {
  id: string;
  selector: string;
  tagName: string;
  inputType?: string;
  name?: string;
  labelText: string;
  placeholderText?: string;
  surroundingText?: string;
  isRequired: boolean;
  fieldType: DetectedFieldType;
  options?: string[]; // for select or radio group
  currentValue?: string;
}

export class FormDetector {
  /**
   * Evaluates the entire page to detect and classify all interactive form inputs
   */
  public static async detectFormFields(page: Page): Promise<FormFieldDescriptor[]> {
    // Run deep client-side DOM traversal and signal extraction
    const rawDescriptors = await page.evaluate(() => {
      const results: Array<{
        selector: string;
        tagName: string;
        inputType?: string;
        name?: string;
        id?: string;
        labelText: string;
        placeholderText?: string;
        surroundingText?: string;
        isRequired: boolean;
        options?: string[];
        currentValue?: string;
      }> = [];

      const formControls = Array.from(
        document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), select, textarea')
      ) as Array<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;

      // Helper to generate a resilient unique selector
      function getResilientSelector(el: Element): string {
        if (el.id) return `#${CSS.escape(el.id)}`;
        if (el.getAttribute('name')) return `${el.tagName.toLowerCase()}[name="${CSS.escape(el.getAttribute('name')!)}"]`;
        if (el.getAttribute('data-testid')) return `[data-testid="${CSS.escape(el.getAttribute('data-testid')!)}"]`;
        if (el.getAttribute('aria-label')) return `[aria-label="${CSS.escape(el.getAttribute('aria-label')!)}"]`;

        // Class and position fallback
        const parent = el.parentElement;
        if (parent) {
          const children = Array.from(parent.children);
          const index = children.indexOf(el) + 1;
          return `${el.tagName.toLowerCase()}:nth-child(${index})`;
        }
        return el.tagName.toLowerCase();
      }

      for (const el of formControls) {
        // Skip invisible or disabled elements
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
          // Check if it's an invisible file input (often styled with opacity 0)
          if (el.tagName.toLowerCase() !== 'input' || (el as HTMLInputElement).type !== 'file') {
            continue;
          }
        }

        const tagName = el.tagName.toLowerCase();
        const inputType = (el as HTMLInputElement).type ? (el as HTMLInputElement).type.toLowerCase() : undefined;
        const name = el.getAttribute('name') || '';
        const id = el.getAttribute('id') || '';
        const placeholder = el.getAttribute('placeholder') || '';

        // Extract associated label text
        let labelText = '';
        if (id) {
          const labelEl = document.querySelector(`label[for="${CSS.escape(id)}"]`);
          if (labelEl) labelText = labelEl.textContent?.trim() || '';
        }
        if (!labelText) {
          const parentLabel = el.closest('label');
          if (parentLabel) {
            labelText = parentLabel.textContent?.trim() || '';
          }
        }
        if (!labelText && el.getAttribute('aria-label')) {
          labelText = el.getAttribute('aria-label')!.trim();
        }
        if (!labelText && el.getAttribute('aria-labelledby')) {
          const labelledBy = document.getElementById(el.getAttribute('aria-labelledby')!);
          if (labelledBy) labelText = labelledBy.textContent?.trim() || '';
        }

        // Surrounding question / paragraph text
        let surroundingText = '';
        const container = el.closest('.field, .form-group, .form-field, .question, div, fieldset, tr, li');
        if (container) {
          const textNodes = Array.from(container.querySelectorAll('label, p, span, legend, h3, h4, h5'))
            .map(node => node.textContent?.trim())
            .filter(Boolean) as string[];
          surroundingText = textNodes.join(' ');
        }

        // Check required indicator
        const isRequired =
          el.hasAttribute('required') ||
          el.getAttribute('aria-required') === 'true' ||
          labelText.includes('*') ||
          surroundingText.includes('*') ||
          /required/i.test(labelText);

        // Options for select element
        let options: string[] | undefined;
        if (tagName === 'select') {
          const select = el as HTMLSelectElement;
          options = Array.from(select.options)
            .map(o => o.text.trim())
            .filter(t => t.length > 0 && !/^(select|choose|please select|--)/i.test(t));
        }

        results.push({
          selector: getResilientSelector(el),
          tagName,
          inputType,
          name,
          id,
          labelText,
          placeholderText: placeholder,
          surroundingText: surroundingText.slice(0, 300),
          isRequired,
          options,
          currentValue: (el as any).value || ''
        });
      }

      return results;
    });

    // Map each raw descriptor using smart multi-signal classification
    return rawDescriptors.map((raw, idx) => {
      const fieldType = FormDetector.classifyField(raw);
      return {
        id: raw.id || `field_${idx}`,
        selector: raw.selector,
        tagName: raw.tagName,
        inputType: raw.inputType,
        name: raw.name,
        labelText: raw.labelText,
        placeholderText: raw.placeholderText,
        surroundingText: raw.surroundingText,
        isRequired: raw.isRequired,
        fieldType,
        options: raw.options,
        currentValue: raw.currentValue
      };
    });
  }

  /**
   * Smart multi-signal classification
   */
  public static classifyField(raw: {
    tagName: string;
    inputType?: string;
    name?: string;
    id?: string;
    labelText: string;
    placeholderText?: string;
    surroundingText?: string;
  }): DetectedFieldType {
    const combinedSignals = [
      raw.labelText,
      raw.placeholderText,
      raw.name,
      raw.id,
      raw.surroundingText
    ].filter(Boolean).join(' ').toLowerCase();

    // 1. File Uploads: Resume vs Cover Letter
    if (raw.inputType === 'file') {
      if (/cover\s*letter/i.test(combinedSignals)) {
        return 'cover_letter_upload';
      }
      return 'resume_upload';
    }

    // 2. Email Address
    if (raw.inputType === 'email' || /\b(email|e-mail|e_mail|work email|your email)\b/i.test(combinedSignals)) {
      return 'email';
    }

    // 3. Phone Number
    if (raw.inputType === 'tel' || /\b(phone|telephone|mobile|cell|contact number)\b/i.test(combinedSignals)) {
      return 'phone';
    }

    // 4. First Name / Last Name / Full Name
    if (/\b(first\s*name|given\s*name|fname)\b/i.test(combinedSignals)) {
      return 'first_name';
    }
    if (/\b(last\s*name|family\s*name|surname|lname)\b/i.test(combinedSignals)) {
      return 'last_name';
    }
    if (/\b(full\s*name|your\s*name|legal\s*name|candidate\s*name|applicant\s*name)\b/i.test(combinedSignals) || combinedSignals.trim() === 'name') {
      return 'full_name';
    }

    // 5. Online Profiles & Links
    if (/\b(linkedin|linked-in)\b/i.test(combinedSignals)) {
      return 'linkedin';
    }
    if (/\b(github|git)\b/i.test(combinedSignals)) {
      return 'github';
    }
    if (/\b(portfolio|website|personal site|blog|url)\b/i.test(combinedSignals)) {
      return 'portfolio';
    }

    // 6. Location / Address
    if (/\b(postal\s*code|zip\s*code|zipcode|pincode)\b/i.test(combinedSignals)) {
      return 'postal_code';
    }
    if (/\b(city|town)\b/i.test(combinedSignals)) {
      return 'city';
    }
    if (/\b(state|province|region)\b/i.test(combinedSignals)) {
      return 'state';
    }
    if (/\b(country)\b/i.test(combinedSignals)) {
      return 'country';
    }
    if (/\b(location|address|street address)\b/i.test(combinedSignals)) {
      return 'location';
    }

    // 7. Work Authorization & Sponsorship
    if (/\b(sponsorship|visa sponsorship|require.*visa|need.*visa)\b/i.test(combinedSignals)) {
      return 'sponsorship';
    }
    if (/\b(authorized to work|legally authorized|work eligibility|eligible to work)\b/i.test(combinedSignals)) {
      return 'work_authorization';
    }

    // 8. Education
    if (/\b(gpa|grade point average)\b/i.test(combinedSignals)) {
      return 'gpa';
    }
    if (/\b(graduation\s*year|grad\s*year|completion\s*year)\b/i.test(combinedSignals)) {
      return 'graduation_year';
    }
    if (/\b(university|college|school|institution)\b/i.test(combinedSignals)) {
      return 'education_school';
    }
    if (/\b(degree|major|field of study|academic qualification)\b/i.test(combinedSignals)) {
      return 'education_degree';
    }

    // 9. Practical ATS Form Questions
    if (/\b(salary|compensation|desired pay|expected salary|rate)\b/i.test(combinedSignals)) {
      return 'salary_expectation';
    }
    if (/\b(notice period|start date|availability|available to start|when can you start)\b/i.test(combinedSignals)) {
      return 'notice_period';
    }
    if (/\b(how did you hear|how did you find|referral source|source)\b/i.test(combinedSignals)) {
      return 'hear_about_us';
    }

    // 10. Open-Ended and Motivational Questions (Textarea or long question)
    const isOpenEndedPrompt =
      /\b(why should we hire you|why are you a good fit|why do you want|tell us about yourself|describe.*experience|tell me about|what makes you|why.*company|additional information|cover letter)\b/i.test(combinedSignals);

    if (raw.tagName === 'textarea' || isOpenEndedPrompt) {
      if (/cover\s*letter/i.test(combinedSignals)) {
        return 'cover_letter_text';
      }
      return 'open_ended_question';
    }

    // 11. Select dropdown
    if (raw.tagName === 'select') {
      return 'select_dropdown';
    }

    // 12. Radio / Checkbox
    if (raw.inputType === 'radio') {
      return 'radio_group';
    }
    if (raw.inputType === 'checkbox') {
      return 'checkbox_consent';
    }

    return 'generic_text';
  }
}
