import { Page } from 'playwright';
import { FormFieldDescriptor } from './formDetector.js';

export interface ValidationReport {
  isValid: boolean;
  missingRequiredFields: string[];
  totalChecked: number;
}

export class ApplicationValidator {
  /**
   * Evaluates mandatory fields on page to guarantee none are submitted empty
   */
  public static async validateApplication(
    page: Page,
    fields: FormFieldDescriptor[]
  ): Promise<ValidationReport> {
    const missing: string[] = [];

    for (const field of fields) {
      if (!field.isRequired) continue;

      try {
        const value = await page.evaluate((sel) => {
          const el = document.querySelector(sel) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
          if (!el) return '';
          if (el.type === 'checkbox' || el.type === 'radio') {
            return (el as HTMLInputElement).checked ? 'checked' : '';
          }
          if (el.tagName.toLowerCase() === 'input' && (el as HTMLInputElement).type === 'file') {
            const input = el as HTMLInputElement;
            return input.files && input.files.length > 0 ? 'uploaded' : '';
          }
          return el.value ? el.value.trim() : '';
        }, field.selector);

        if (!value || value.length === 0) {
          missing.push(field.labelText || field.name || field.id || 'Mandatory Field');
        }
      } catch {
        // if element gone, re-check page
      }
    }

    return {
      isValid: missing.length === 0,
      missingRequiredFields: missing,
      totalChecked: fields.filter(f => f.isRequired).length
    };
  }
}
