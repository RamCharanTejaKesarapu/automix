import { CandidateProfile } from '../profile/candidateProfile.js';

export type PrivacyLevel = 'MINIMAL' | 'STANDARD' | 'STRICT';

export interface PrivacyConfig {
  level: PrivacyLevel;
  maskSSN: boolean;
  maskNationalId: boolean;
  maskPhone: boolean;
  maskEmail: boolean;
  maskStreetAddress: boolean;
  maskFinancial: boolean;
}

export const defaultPrivacyConfig: PrivacyConfig = {
  level: 'STANDARD',
  maskSSN: true,
  maskNationalId: true,
  maskPhone: false,
  maskEmail: false,
  maskStreetAddress: true,
  maskFinancial: true
};

export class PrivacyLayer {
  private config: PrivacyConfig;

  constructor(config: Partial<PrivacyConfig> = {}) {
    this.config = { ...defaultPrivacyConfig, ...config };
  }

  public updateConfig(config: Partial<PrivacyConfig>) {
    this.config = { ...this.config, ...config };
  }

  public getConfig(): PrivacyConfig {
    return { ...this.config };
  }

  /**
   * Sanitizes arbitrary text before sending to LLM
   */
  public sanitizeText(text: string): string {
    if (!text) return '';
    let sanitized = text;

    // Mask SSN: 3 digits - 2 digits - 4 digits
    if (this.config.maskSSN) {
      sanitized = sanitized.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED_SSN]');
    }

    // Mask National IDs: Indian Aadhaar (12 digits with spaces) and UK National Insurance numbers
    if (this.config.maskNationalId) {
      sanitized = sanitized.replace(/\b\d{4}\s\d{4}\s\d{4}\b/g, '[REDACTED_NATIONAL_ID]');
      sanitized = sanitized.replace(/\b[A-Za-z]{2}\s?[0-9]{6}\s?[A-Da-d]{1}\b/g, '[REDACTED_NIN]');
    }

    // Mask credit cards / bank accounts (13 to 19 digits)
    if (this.config.maskFinancial) {
      sanitized = sanitized.replace(/\b(?:\d[ -]*?){13,16}\b/g, '[REDACTED_ACCOUNT]');
    }

    // Mask phone numbers if strict or explicitly configured
    if (this.config.maskPhone || this.config.level === 'STRICT') {
      sanitized = sanitized.replace(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, '[PHONE]');
    }

    // Mask email if strict or explicitly configured
    if (this.config.maskEmail || this.config.level === 'STRICT') {
      sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');
    }

    // Mask street address if enabled
    if (this.config.maskStreetAddress || this.config.level === 'STRICT') {
      sanitized = sanitized.replace(/\b\d+\s+([A-Za-z0-9\s]+)\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr)\b/gi, '[STREET ADDRESS]');
    }

    return sanitized;
  }

  /**
   * Creates a privacy-compliant candidate representation safe for the LLM
   */
  public sanitizeProfile(profile: CandidateProfile): Record<string, any> {
    const isStrict = this.config.level === 'STRICT';
    
    return {
      fullName: isStrict ? 'Applicant' : profile.fullName,
      email: (this.config.maskEmail || isStrict) ? '[PROTECTED_EMAIL]' : profile.email,
      phone: (this.config.maskPhone || isStrict) ? '[PROTECTED_PHONE]' : profile.phone,
      location: profile.city && profile.country ? `${profile.city}, ${profile.country}` : profile.location,
      linkedin: profile.linkedin,
      github: profile.github,
      portfolio: profile.portfolio,
      education: profile.education,
      skills: profile.skills,
      workExperience: profile.workExperience,
      internships: profile.internships,
      projects: profile.projects,
      certifications: profile.certifications,
      workAuthorization: profile.workAuthorization,
      requiresSponsorship: profile.requiresSponsorship,
      preferredLocations: profile.preferredLocations,
      resumeText: this.sanitizeText(profile.resumeText)
    };
  }
}

export const globalPrivacyLayer = new PrivacyLayer();
