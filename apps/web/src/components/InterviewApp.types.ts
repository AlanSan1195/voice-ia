export type Stage = "prepare" | "interview" | "results";
export type Provider = "groq" | "cerebras";
export type EnglishLevel = "A1" | "A2" | "B1" | "B2";
export type TtsProvider = "loading" | "streaming" | "system" | "off";

export type TurnEvaluation = {
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
};

export type Turn = {
  question: string;
  answer: string;
  transcript?: string;
  evaluation?: TurnEvaluation;
};

export type Profile = { role: string; summary: string; focusAreas: string[] };

export type Feedback = {
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
  strengths: { label: string; description: string }[];
  gaps: { label: string; description: string }[];
  recommendations: { label: string; description: string }[];
  turnReviews: {
    turnIndex: number;
    levelScore: number;
    jobReadinessScore: number;
    feedback: string;
    correctedAnswer: string;
  }[];
};

export type Session = {
  id: string;
  createdAt: string;
  profile: Profile;
  turns: Turn[];
  englishLevel?: EnglishLevel;
  feedback?: Feedback;
};

export type StartResponse = {
  profile: Profile;
  question: { index: number; text: string };
  totalQuestions: number;
  provider: Provider;
};

export type ProgressDimension = keyof Feedback["dimensionAverages"];
export type ProgressFilterLevel = EnglishLevel | "all";
export type CompletedSession = Session & { feedback: Feedback };
export type ProgressSummary = {
  completed: CompletedSession[];
  averageLevel: number;
  averageJobReadiness: number;
  dimensions: Record<ProgressDimension, number>;
};
