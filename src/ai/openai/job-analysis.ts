import { callChatCompletion } from './client.js';
import { CandidateProfile } from '../../profile/candidateProfile.js';
import { globalPrivacyLayer } from '../privacyLayer.js';

export interface JobAnalysisResult {
  matchScore: number; // 0 - 100
  isMatch: boolean;
  matchedSkills: string[];
  missingSkills: string[];
  reason: string;
  keyResponsibilities?: string[];
  extractedRole?: string;
  extractedLevel?: string;
}

export async function analyzeJob(params: {
  jobTitle: string;
  company: string;
  jobDescription: string;
  targetRole: string;
  targetField: string;
  targetLocation?: string;
  candidateProfile: CandidateProfile;
  threshold?: number;
}): Promise<JobAnalysisResult> {
  const threshold = params.threshold ?? 70;
  const sanitizedProfile = globalPrivacyLayer.sanitizeProfile(params.candidateProfile);

  // Fast pre-check: If targetRole is specified and completely discordant, save API calls
  const titleLower = params.jobTitle.toLowerCase();
  const targetLower = params.targetRole.toLowerCase();
  const fieldLower = params.targetField.toLowerCase();

  // Extract candidate skills
  const candidateSkills = params.candidateProfile.skills;

  const prompt = `
You are an expert AI recruiting and job matching engine. Analyze the following job listing against the user's target criteria and candidate profile.

Target Search Role: "${params.targetRole}"
Target Industry/Field: "${params.targetField}"
Target Location: "${params.targetLocation || 'Any / Not specified'}"

Job Information:
- Job Title: "${params.jobTitle}"
- Company: "${params.company}"
- Description:
${params.jobDescription.substring(0, 3500)}

Candidate Profile Summary:
- Degree & Major: ${JSON.stringify(sanitizedProfile.education)}
- Candidate Skills: ${JSON.stringify(candidateSkills)}
- Experience & Internships: ${JSON.stringify(sanitizedProfile.workExperience)} ${JSON.stringify(sanitizedProfile.internships)}
- Work Authorization: ${sanitizedProfile.workAuthorization} (Requires Sponsorship: ${sanitizedProfile.requiresSponsorship})

Rules:
1. Determine how well this job matches the Target Role ("${params.targetRole}") and Target Field ("${params.targetField}"). If the job is in an entirely unrelated discipline (e.g. Sales, Construction, Culinary when target is Data Science/Software), matchScore must be low (< 40).
2. Calculate matchScore from 0 to 100 based on title alignment, required skills vs candidate skills, and experience level.
3. Determine isMatch: true if matchScore >= ${threshold}, else false.
4. Extract matchedSkills (skills present in both job and candidate) and missingSkills (important skills required by job that candidate lacks).
5. Provide a clear, honest 1-2 sentence justification in "reason".

Respond ONLY with a JSON object matching this schema:
{
  "matchScore": number,
  "isMatch": boolean,
  "matchedSkills": string[],
  "missingSkills": string[],
  "reason": string,
  "extractedRole": string,
  "extractedLevel": string
}
`;

  try {
    const response = await callChatCompletion({
      messages: [
        { role: 'system', content: 'You are an objective, precise job matching specialist. Always return valid JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      jsonResponse: true
    });

    const parsed = JSON.parse(response) as JobAnalysisResult;
    return {
      matchScore: Math.min(100, Math.max(0, Math.round(parsed.matchScore || 0))),
      isMatch: parsed.matchScore >= threshold,
      matchedSkills: Array.isArray(parsed.matchedSkills) ? parsed.matchedSkills : [],
      missingSkills: Array.isArray(parsed.missingSkills) ? parsed.missingSkills : [],
      reason: parsed.reason || 'Evaluated against candidate qualifications.',
      extractedRole: parsed.extractedRole,
      extractedLevel: parsed.extractedLevel
    };
  } catch (err: any) {
    // Graceful heuristic fallback if LLM is unavailable
    console.warn(`[JobAnalysis] LLM analysis fallback due to: ${err.message}`);
    return heuristicJobMatch(params, threshold);
  }
}

function heuristicJobMatch(
  params: {
    jobTitle: string;
    jobDescription: string;
    targetRole: string;
    targetField: string;
    candidateProfile: CandidateProfile;
  },
  threshold: number
): JobAnalysisResult {
  const title = params.jobTitle.toLowerCase();
  const desc = params.jobDescription.toLowerCase();
  const target = params.targetRole.toLowerCase();
  const field = params.targetField.toLowerCase();

  let score = 0;
  const targetWords = target.split(/\s+/).filter(w => w.length > 2);
  const titleMatched = targetWords.filter(w => title.includes(w)).length;

  if (targetWords.length > 0) {
    score += (titleMatched / targetWords.length) * 50;
  }

  if (field && (title.includes(field) || desc.includes(field))) {
    score += 20;
  }

  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  for (const skill of params.candidateProfile.skills) {
    if (desc.includes(skill.toLowerCase())) {
      matchedSkills.push(skill);
    }
  }

  score += Math.min(30, matchedSkills.length * 6);
  score = Math.min(100, Math.max(10, Math.round(score)));

  return {
    matchScore: score,
    isMatch: score >= threshold,
    matchedSkills: matchedSkills.slice(0, 8),
    missingSkills,
    reason: `Heuristic match: ${matchedSkills.length} matching skills found. Score: ${score}%`
  };
}
