import { db } from '../database/db.js';

export interface EducationEntry {
  degree: string;
  university: string;
  major: string;
  graduationYear: string;
  gpa?: string;
}

export interface WorkExperienceEntry {
  company: string;
  role: string;
  location?: string;
  startDate: string;
  endDate: string;
  current?: boolean;
  description: string;
  highlights?: string[];
}

export interface ProjectEntry {
  title: string;
  technologies: string[];
  description: string;
  link?: string;
}

export interface CandidateProfile {
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  linkedin: string;
  github: string;
  portfolio: string;
  education: EducationEntry[];
  skills: string[];
  workExperience: WorkExperienceEntry[];
  internships: WorkExperienceEntry[];
  projects: ProjectEntry[];
  certifications: string[];
  resumePath?: string;
  resumeFileName?: string;
  resumeText: string;
  coverLetter: string;
  workAuthorization: 'Yes' | 'No';
  requiresSponsorship: 'No' | 'Yes';
  preferredLocations: string[];
  eeoc?: {
    gender?: string;
    race?: string;
    veteranStatus?: string;
    disabilityStatus?: string;
  };
}

export interface LearnedAnswer {
  id: string;
  questionPattern: string;
  normalizedKey: string;
  answer: string;
  category?: string;
  createdAt: string;
}

const DEFAULT_PROFILE: CandidateProfile = {
  fullName: "Alex Rivera",
  firstName: "Alex",
  lastName: "Rivera",
  email: "alex.rivera.dev@gmail.com",
  phone: "+1 (555) 234-5678",
  location: "San Francisco, CA, USA",
  city: "San Francisco",
  state: "California",
  country: "United States",
  postalCode: "94105",
  linkedin: "https://linkedin.com/in/alex-rivera-tech",
  github: "https://github.com/alexrivera-ai",
  portfolio: "https://alexrivera.dev",
  education: [
    {
      degree: "Bachelor of Science in Computer Science & Data Science",
      university: "University of California, Berkeley",
      major: "Computer Science",
      graduationYear: "2025",
      gpa: "3.85"
    }
  ],
  skills: [
    "Python", "TypeScript", "JavaScript", "SQL", "Machine Learning", "Deep Learning",
    "PyTorch", "TensorFlow", "React", "Node.js", "Docker", "Git", "FastAPI", "Pandas",
    "NumPy", "Data Analysis", "REST APIs", "PostgreSQL", "Cloud Computing (AWS/GCP)"
  ],
  workExperience: [
    {
      company: "DataVantage Labs",
      role: "Machine Learning Intern",
      location: "San Francisco, CA",
      startDate: "May 2024",
      endDate: "August 2024",
      current: false,
      description: "Trained and deployed transformer models for document analysis. Built automated data pipelines in Python and SQL reducing preprocessing latency by 35%."
    }
  ],
  internships: [
    {
      company: "Nexus AI Solutions",
      role: "Software Engineering Intern",
      location: "Remote",
      startDate: "June 2023",
      endDate: "August 2023",
      current: false,
      description: "Constructed asynchronous REST microservices in TypeScript and Node.js. Integrated full-text vector search and achieved 99.9% test coverage."
    }
  ],
  projects: [
    {
      title: "IntelliPulse Analytics Engine",
      technologies: ["Python", "PyTorch", "FastAPI", "React", "PostgreSQL"],
      description: "End-to-end predictive analytics platform with real-time stream processing, interactive visualization dashboards, and 92% classification accuracy.",
      link: "https://github.com/alexrivera-ai/intellipulse"
    },
    {
      title: "AutoDoc Search & RAG System",
      technologies: ["Python", "LangChain", "OpenAI", "Milvus", "Docker"],
      description: "High-performance retrieval augmented generation system indexing 100k+ technical documents with sub-second response times.",
      link: "https://github.com/alexrivera-ai/autodoc-rag"
    }
  ],
  certifications: [
    "AWS Certified Machine Learning - Specialty",
    "Deep Learning Specialization (DeepLearning.AI)"
  ],
  resumeText: `ALEX RIVERA
alex.rivera.dev@gmail.com | (555) 234-5678 | San Francisco, CA
LinkedIn: linkedin.com/in/alex-rivera-tech | GitHub: github.com/alexrivera-ai | Portfolio: alexrivera.dev

EDUCATION
University of California, Berkeley — B.S. Computer Science & Data Science (Graduation: 2025) GPA: 3.85
Relevant Coursework: Machine Learning, Algorithms, Database Systems, Artificial Intelligence, Distributed Systems

SKILLS
Languages: Python, TypeScript, JavaScript, SQL, C++
Frameworks & Libraries: PyTorch, TensorFlow, Scikit-Learn, Pandas, NumPy, React, Node.js, FastAPI
Tools: Docker, Git, Linux, AWS, GCP, PostgreSQL

EXPERIENCE
DataVantage Labs — Machine Learning Intern (May 2024 - Aug 2024)
- Developed transformer-based text feature extractors improving classification precision by 24%.
- Scaled training pipelines over distributed GPU clusters with PyTorch Lightning and Docker.

Nexus AI Solutions — Software Engineering Intern (Jun 2023 - Aug 2023)
- Engineered scalable REST APIs using Node.js & TypeScript, handling 10k+ daily queries.
- Automated CI/CD testing suites reducing build breakage by 40%.`,
  coverLetter: `Dear Hiring Team,

I am excited to submit my application. With my solid background in Computer Science and hands-on experience in Machine Learning, Python, and scalable software development, I am eager to contribute immediately to your engineering goals.

During my internships, I developed high-performance pipelines and machine learning services that demonstrably improved speed and precision. I bring a strong work ethic, rapid learning ability, and passion for building high-impact products.

Thank you for your time and consideration. I look forward to the opportunity to speak with you.

Sincerely,
Alex Rivera`,
  workAuthorization: "Yes",
  requiresSponsorship: "No",
  preferredLocations: ["San Francisco, CA", "Remote", "New York, NY", "India"],
  eeoc: {
    gender: "Decline to self-identify",
    race: "Decline to self-identify",
    veteranStatus: "I am not a protected veteran",
    disabilityStatus: "No, I do not have a disability"
  }
};

export const candidateProfileRepository = {
  getProfile(): CandidateProfile {
    const row = db.prepare("SELECT data FROM candidate_profile WHERE id = 'default'").get() as { data: string } | undefined;
    if (!row) {
      this.saveProfile(DEFAULT_PROFILE);
      return DEFAULT_PROFILE;
    }
    try {
      return JSON.parse(row.data);
    } catch {
      return DEFAULT_PROFILE;
    }
  },

  saveProfile(profile: CandidateProfile): void {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO candidate_profile (id, data, updated_at)
      VALUES ('default', ?, ?)
      ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
    `);
    stmt.run(JSON.stringify(profile), now);
  },

  // Learned answers bank for Human-In-The-Loop memory
  getLearnedAnswers(): LearnedAnswer[] {
    const rows = db.prepare('SELECT * FROM learned_answers ORDER BY created_at DESC').all() as any[];
    return rows.map(r => ({
      id: r.id,
      questionPattern: r.question_pattern,
      normalizedKey: r.normalized_key,
      answer: r.answer,
      category: r.category,
      createdAt: r.created_at
    }));
  },

  findLearnedAnswer(questionText: string): string | null {
    const normalized = normalizeQuestion(questionText);
    // 1. Direct normalized key match
    const exact = db.prepare('SELECT answer FROM learned_answers WHERE normalized_key = ?').get(normalized) as { answer: string } | undefined;
    if (exact) return exact.answer;

    // 2. Substring or pattern match
    const all = this.getLearnedAnswers();
    for (const item of all) {
      if (normalized.includes(item.normalizedKey) || item.normalizedKey.includes(normalized)) {
        return item.answer;
      }
    }
    return null;
  },

  saveLearnedAnswer(question: string, answer: string, category?: string): void {
    const normalizedKey = normalizeQuestion(question);
    const now = new Date().toISOString();
    const id = `la_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const stmt = db.prepare(`
      INSERT INTO learned_answers (id, question_pattern, normalized_key, answer, category, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(normalized_key) DO UPDATE SET answer = excluded.answer, updated_at = excluded.updated_at
    `);
    stmt.run(id, question, normalizedKey, answer, category || 'general', now, now);
  },

  deleteLearnedAnswer(id: string): void {
    db.prepare('DELETE FROM learned_answers WHERE id = ?').run(id);
  }
};

export function normalizeQuestion(q: string): string {
  return q
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
