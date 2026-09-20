export { TOTAL_QUESTIONS } from "@voice-ia/contracts";

export type ProviderName = "groq" | "cerebras";
export type EnglishLevel = "A1" | "A2" | "B1" | "B2";
export type InterviewCoaching = {
  language?: {
    original: string;
    replacement: string;
    why: string;
  };
  interview: {
    skill: "technical" | "relevance" | "structure";
    evidence?: string;
    technique: string;
    action: string;
    miniChallenge: string;
  };
};
export type InterviewTurnEvaluation = {
  levelScore: number;
  jobReadinessScore: number;
  englishScore: number;
  technicalScore: number;
  relevanceScore: number;
  structureScore: number;
  observedEnglishLevel: EnglishLevel;
  feedback: string;
  strengths: string[];
  priorityImprovement: string;
  correctedAnswer: string;
  nextLevelAnswer: string;
  coaching?: InterviewCoaching;
};
export type InterviewTurn = {
  question: string;
  answer: string;
  evaluation?: InterviewTurnEvaluation;
};
export type InterviewProfile = {
  role: string;
  summary: string;
  focusAreas: string[];
};
export type InterviewContext = {
  jobDescription: string;
  cvText: string;
  profile: InterviewProfile;
  englishLevel: EnglishLevel;
};
export type QuestionResult = { index: number; text: string };
export type FeedbackItem = { label: string; description: string };
export type InterviewFeedback = {
  overallScore: number;
  levelScore: number;
  jobReadinessScore: number;
  englishLevel: EnglishLevel;
  dimensionAverages: {
    english: number;
    technical: number;
    relevance: number;
    structure: number;
  };
  summary: string;
  strengths: FeedbackItem[];
  gaps: FeedbackItem[];
  recommendations: FeedbackItem[];
  turnReviews: Array<{
    turnIndex: number;
    levelScore: number;
    jobReadinessScore: number;
    feedback: string;
    correctedAnswer: string;
  }>;
};
