import { callChatCompletion } from './client.js';
import { CandidateProfile } from '../../profile/candidateProfile.js';
import { globalPrivacyLayer } from '../privacyLayer.js';

export interface AnswerGenerationResult {
  answer: string | null;
  confidence: number;
  requiresHumanInput: boolean;
  missingInformation?: string;
}

export async function generateApplicationAnswer(params: {
  question: string;
  jobTitle: string;
  company: string;
  jobDescription?: string;
  candidateProfile: CandidateProfile;
  maxLength?: number;
}): Promise<AnswerGenerationResult> {
  const sanitizedProfile = globalPrivacyLayer.sanitizeProfile(params.candidateProfile);

  const prompt = `
You are an expert career advisor and job applicant assistant generating truthful, authentic answers for a job application form.

APPLICATION CONTEXT:
- Target Job: "${params.jobTitle}"
- Company: "${params.company}"
- Job Description Summary:
${(params.jobDescription || 'Not provided').substring(0, 2500)}

APPLICATION QUESTION:
"${params.question}"

CANDIDATE TRUTH / RESUME FACTS:
- Candidate Name: ${sanitizedProfile.fullName}
- Degree: ${JSON.stringify(sanitizedProfile.education)}
- Technical Skills: ${sanitizedProfile.skills.join(', ')}
- Work Experience: ${JSON.stringify(sanitizedProfile.workExperience)}
- Internships: ${JSON.stringify(sanitizedProfile.internships)}
- Key Projects: ${JSON.stringify(sanitizedProfile.projects)}
- Work Authorization: ${sanitizedProfile.workAuthorization} (Requires Sponsorship: ${sanitizedProfile.requiresSponsorship})
- Preferred Locations: ${sanitizedProfile.preferredLocations.join(', ')}
- Resume Excerpt:
${sanitizedProfile.resumeText.substring(0, 1500)}

CRITICAL BEHAVIORAL AND ETHICAL RULES:
1. NEVER FABRICATE OR HALLUCINATE FACTS. Never invent degrees, previous companies, projects, certifications, work authorization status, or years of experience not documented above.
2. If the question asks for:
   - Specific expected numerical salary / hourly rate that is not stated in the profile
   - Secret/Top-Secret Security Clearances
   - Complex legal or criminal history questions
   - Specific internal employee referral codes
   - Information strictly missing from the candidate truth
   THEN you MUST set:
   "requiresHumanInput": true,
   "missingInformation": "<clear description of what specific missing detail the candidate must supply>",
   "answer": null,
   "confidence": 0
3. For motivational and contextual questions such as:
   - "Why should we hire you?"
   - "Why do you want to work at [Company]?"
   - "Tell us about yourself / walk me through your resume"
   - "Describe a challenging technical project you worked on"
   Synthesize a compelling, professional, concise answer (typically 1 to 3 targeted paragraphs, unless asked for brief/one sentence) drawing DIRECTLY on the candidate's real skills, real projects, and real internship experience, linking them to ${params.company}'s mission.
   Set "requiresHumanInput": false, "confidence": 0.90 - 0.98.
4. Keep the tone authentic, enthusiastic, professional, first-person ("I"). Do NOT sound like a generic boilerplate template.

Respond ONLY with a JSON object in this exact schema:
{
  "answer": string | null,
  "confidence": number,
  "requiresHumanInput": boolean,
  "missingInformation": string | null
}
`;

  try {
    const raw = await callChatCompletion({
      messages: [
        {
          role: 'system',
          content: 'You are a precise, truthful job application assistant. Always return valid JSON matching the requested schema. Never invent facts.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      jsonResponse: true
    });

    const parsed = JSON.parse(raw);
    if (parsed.requiresHumanInput || !parsed.answer) {
      return {
        answer: null,
        confidence: 0,
        requiresHumanInput: true,
        missingInformation: parsed.missingInformation || 'Candidate-specific information required'
      };
    }

    return {
      answer: parsed.answer.trim(),
      confidence: parsed.confidence ?? 0.92,
      requiresHumanInput: false
    };
  } catch (err: any) {
    console.error(`[generateApplicationAnswer] Error: ${err.message}`);
    // If AI fails or question is clearly sensitive, fallback to asking user
    return {
      answer: null,
      confidence: 0,
      requiresHumanInput: true,
      missingInformation: `Could not safely generate answer automatically (${err.message})`
    };
  }
}
