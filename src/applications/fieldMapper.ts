import { FormFieldDescriptor } from './formDetector.js';
import { CandidateProfile, candidateProfileRepository } from '../profile/candidateProfile.js';

export type MappingStrategy =
  | 'DIRECT_PROFILE_VALUE'
  | 'LEARNED_ANSWER'
  | 'FILE_UPLOAD'
  | 'AI_QUESTION_ANSWER'
  | 'AI_OPTION_MATCH'
  | 'CHECKBOX_AGREE'
  | 'REQUIRES_USER_INPUT';

export interface FieldMappingPlan {
  field: FormFieldDescriptor;
  strategy: MappingStrategy;
  value?: string;
  missingDetailPrompt?: string;
}

export class FieldMapper {
  /**
   * Plans the resolution strategy and value for each detected field
   */
  public static mapField(
    field: FormFieldDescriptor,
    profile: CandidateProfile,
    sessionLearnedAnswers: Map<string, string>
  ): FieldMappingPlan {
    const questionKey = field.labelText || field.placeholderText || field.name || field.id;

    // 1. Check in-memory session answers (from recent HITL in this run)
    if (sessionLearnedAnswers.has(questionKey)) {
      return {
        field,
        strategy: 'LEARNED_ANSWER',
        value: sessionLearnedAnswers.get(questionKey)!
      };
    }

    // 2. Check persistent learned answers database
    const persistentAnswer = candidateProfileRepository.findLearnedAnswer(questionKey);
    if (persistentAnswer) {
      return {
        field,
        strategy: 'LEARNED_ANSWER',
        value: persistentAnswer
      };
    }

    // 3. Map based on detected field type
    switch (field.fieldType) {
      case 'full_name':
        return { field, strategy: 'DIRECT_PROFILE_VALUE', value: profile.fullName };

      case 'first_name':
        return { field, strategy: 'DIRECT_PROFILE_VALUE', value: profile.firstName };

      case 'last_name':
        return { field, strategy: 'DIRECT_PROFILE_VALUE', value: profile.lastName };

      case 'email':
        return { field, strategy: 'DIRECT_PROFILE_VALUE', value: profile.email };

      case 'phone':
        return { field, strategy: 'DIRECT_PROFILE_VALUE', value: profile.phone };

      case 'linkedin':
        return { field, strategy: 'DIRECT_PROFILE_VALUE', value: profile.linkedin };

      case 'github':
        return { field, strategy: 'DIRECT_PROFILE_VALUE', value: profile.github };

      case 'portfolio':
        return { field, strategy: 'DIRECT_PROFILE_VALUE', value: profile.portfolio };

      case 'city':
        return { field, strategy: 'DIRECT_PROFILE_VALUE', value: profile.city };

      case 'state':
        return { field, strategy: 'DIRECT_PROFILE_VALUE', value: profile.state };

      case 'country':
        return { field, strategy: 'DIRECT_PROFILE_VALUE', value: profile.country };

      case 'postal_code':
        return { field, strategy: 'DIRECT_PROFILE_VALUE', value: profile.postalCode };

      case 'location':
        return { field, strategy: 'DIRECT_PROFILE_VALUE', value: profile.location };

      case 'work_authorization':
        return { field, strategy: 'DIRECT_PROFILE_VALUE', value: profile.workAuthorization };

      case 'sponsorship':
        return { field, strategy: 'DIRECT_PROFILE_VALUE', value: profile.requiresSponsorship };

      case 'education_degree':
        return { field, strategy: 'DIRECT_PROFILE_VALUE', value: profile.education[0]?.degree || 'Bachelor of Science' };

      case 'education_school':
        return { field, strategy: 'DIRECT_PROFILE_VALUE', value: profile.education[0]?.university || 'University of California, Berkeley' };

      case 'graduation_year':
        return { field, strategy: 'DIRECT_PROFILE_VALUE', value: profile.education[0]?.graduationYear || '2025' };

      case 'gpa':
        return { field, strategy: 'DIRECT_PROFILE_VALUE', value: profile.education[0]?.gpa || '3.85' };

      case 'salary_expectation':
        return { field, strategy: 'DIRECT_PROFILE_VALUE', value: 'Competitive / Market Rate' };

      case 'notice_period':
        return { field, strategy: 'DIRECT_PROFILE_VALUE', value: 'Immediately / 2 Weeks' };

      case 'hear_about_us':
        return { field, strategy: 'DIRECT_PROFILE_VALUE', value: 'Company Careers Page / Online Job Board' };

      case 'resume_upload':
        return {
          field,
          strategy: 'FILE_UPLOAD',
          value: profile.resumePath || ''
        };

      case 'cover_letter_upload':
        return {
          field,
          strategy: 'FILE_UPLOAD',
          value: profile.resumePath || ''
        };

      case 'cover_letter_text':
        return {
          field,
          strategy: 'DIRECT_PROFILE_VALUE',
          value: profile.coverLetter
        };

      case 'checkbox_consent':
        // Acknowledge privacy policies or truthful statements
        return {
          field,
          strategy: 'CHECKBOX_AGREE',
          value: 'true'
        };

      case 'open_ended_question':
        return {
          field,
          strategy: 'AI_QUESTION_ANSWER'
        };

      case 'select_dropdown':
      case 'radio_group':
        if (field.options && field.options.length > 0) {
          return {
            field,
            strategy: 'AI_OPTION_MATCH'
          };
        }
        return {
          field,
          strategy: field.isRequired ? 'REQUIRES_USER_INPUT' : 'DIRECT_PROFILE_VALUE',
          missingDetailPrompt: `Select choice for: "${questionKey}"`
        };

      default:
        // If mandatory and unrecognized, flag for human verification
        if (field.isRequired) {
          return {
            field,
            strategy: 'REQUIRES_USER_INPUT',
            missingDetailPrompt: questionKey || 'Please specify missing application detail'
          };
        }
        return {
          field,
          strategy: 'DIRECT_PROFILE_VALUE',
          value: ''
        };
    }
  }
}
