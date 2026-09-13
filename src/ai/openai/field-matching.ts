import { callChatCompletion } from './client.js';
import { CandidateProfile } from '../../profile/candidateProfile.js';
import { globalPrivacyLayer } from '../privacyLayer.js';

export interface FieldMatchResult {
  selectedOption: string | null;
  confidence: number;
  requiresHumanInput: boolean;
  reason?: string;
}

export async function matchQuestionToProfile(params: {
  question: string;
  options: string[];
  candidateProfile: CandidateProfile;
  jobContext?: string;
}): Promise<FieldMatchResult> {
  // First, fast heuristics for common standard questions
  const qLower = params.question.toLowerCase();

  // Work Authorization
  if (qLower.includes('authorized to work') || qLower.includes('legally authorized') || qLower.includes('work eligibility')) {
    const wantsYes = params.candidateProfile.workAuthorization === 'Yes';
    const match = params.options.find(o => wantsYes ? /^yes\b/i.test(o.trim()) : /^no\b/i.test(o.trim()));
    if (match) return { selectedOption: match, confidence: 0.99, requiresHumanInput: false };
  }

  // Sponsorship
  if (qLower.includes('sponsorship') || qLower.includes('require visa') || qLower.includes('future sponsorship')) {
    const wantsYes = params.candidateProfile.requiresSponsorship === 'Yes';
    const match = params.options.find(o => wantsYes ? /^yes\b/i.test(o.trim()) : /^no\b/i.test(o.trim()));
    if (match) return { selectedOption: match, confidence: 0.99, requiresHumanInput: false };
  }

  // Education level
  if (qLower.includes('highest level of education') || qLower.includes('degree')) {
    const hasBachelor = params.candidateProfile.education.some(e => /bachelor|bs|ba/i.test(e.degree));
    if (hasBachelor) {
      const match = params.options.find(o => /bachelor/i.test(o));
      if (match) return { selectedOption: match, confidence: 0.95, requiresHumanInput: false };
    }
  }

  // If no fast heuristic matches, use LLM
  const sanitized = globalPrivacyLayer.sanitizeProfile(params.candidateProfile);
  const prompt = `
Match the candidate's profile to the best option for the following question.

Question: "${params.question}"
Available Options:
${params.options.map((opt, i) => `${i + 1}. "${opt}"`).join('\n')}

Candidate Facts:
- Education: ${JSON.stringify(sanitized.education)}
- Work Authorization: ${sanitized.workAuthorization} (Requires Sponsorship: ${sanitized.requiresSponsorship})
- Work Experience Count: ${sanitized.workExperience.length + sanitized.internships.length} internships/roles
- Skills: ${sanitized.skills.slice(0, 10).join(', ')}

Instructions:
1. Select the exact option string from the Available Options list that best answers the question truthfully.
2. If the question requires unknown personal preferences (e.g. specific custom salary choice, military status not stated, non-disclosed demographic choice), set requiresHumanInput: true and selectedOption: null.
3. Return valid JSON only.

Schema:
{
  "selectedOption": string | null,
  "confidence": number,
  "requiresHumanInput": boolean,
  "reason": string
}
`;

  try {
    const raw = await callChatCompletion({
      messages: [
        { role: 'system', content: 'You are an accurate form-field matching engine. Always return valid JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      jsonResponse: true
    });

    const parsed = JSON.parse(raw);
    return {
      selectedOption: parsed.selectedOption,
      confidence: parsed.confidence ?? 0.9,
      requiresHumanInput: parsed.requiresHumanInput || !parsed.selectedOption,
      reason: parsed.reason
    };
  } catch (err: any) {
    return {
      selectedOption: null,
      confidence: 0,
      requiresHumanInput: true,
      reason: `Could not determine option automatically: ${err.message}`
    };
  }
}
