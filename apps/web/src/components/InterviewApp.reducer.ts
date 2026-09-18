import type {
  EnglishLevel,
  Feedback,
  Profile,
  Session,
  Stage,
  Turn,
  TurnEvaluation,
} from "./InterviewApp.types";
import { TOTAL_QUESTIONS } from "@voice-ia/contracts";

export type InterviewOperation =
  "idle" | "loading-cv" | "starting" | "evaluating" | "advancing";

export type InterviewState = {
  stage: Stage;
  jobDescription: string;
  englishLevel: EnglishLevel;
  cvText: string;
  fileName: string;
  profile: Profile | null;
  turns: Turn[];
  question: string;
  questionIndex: number;
  totalQuestions: number;
  answer: string;
  turnEvaluation: TurnEvaluation | null;
  feedback: Feedback | null;
  activeSessionId: string;
  activeCreatedAt: string;
  operation: InterviewOperation;
  error: string;
};

export type InterviewAction =
  | { type: "job-description-changed"; value: string }
  | { type: "english-level-changed"; value: EnglishLevel }
  | { type: "cv-loading" }
  | { type: "cv-loaded"; text: string; fileName: string }
  | { type: "cv-failed"; message: string }
  | { type: "operation-failed"; message: string }
  | { type: "start-requested" }
  | {
      type: "interview-started";
      profile: Profile;
      question: string;
      totalQuestions: number;
    }
  | { type: "answer-changed"; value: string }
  | { type: "transcript-appended"; text: string }
  | { type: "turn-evaluation-requested" }
  | { type: "turn-evaluated"; evaluation: TurnEvaluation }
  | { type: "turn-evaluation-cleared" }
  | { type: "advance-requested" }
  | { type: "next-question-loaded"; turns: Turn[]; question: string }
  | {
      type: "interview-finished";
      turns: Turn[];
      feedback: Feedback;
      sessionId: string;
      createdAt: string;
    }
  | { type: "session-opened"; session: Session }
  | { type: "reset" };

export const initialInterviewState: InterviewState = {
  stage: "prepare",
  jobDescription: "",
  englishLevel: "B1",
  cvText: "",
  fileName: "",
  profile: null,
  turns: [],
  question: "",
  questionIndex: 0,
  totalQuestions: TOTAL_QUESTIONS,
  answer: "",
  turnEvaluation: null,
  feedback: null,
  activeSessionId: "active",
  activeCreatedAt: "",
  operation: "idle",
  error: "",
};

export function interviewReducer(
  state: InterviewState,
  action: InterviewAction,
): InterviewState {
  switch (action.type) {
    case "job-description-changed":
      return { ...state, jobDescription: action.value };
    case "english-level-changed":
      return { ...state, englishLevel: action.value };
    case "cv-loading":
      return { ...state, operation: "loading-cv", error: "" };
    case "cv-loaded":
      return {
        ...state,
        cvText: action.text,
        fileName: action.fileName,
        operation: "idle",
        error: "",
      };
    case "cv-failed":
      return {
        ...state,
        cvText: "",
        fileName: "",
        operation: "idle",
        error: action.message,
      };
    case "operation-failed":
      return { ...state, operation: "idle", error: action.message };
    case "start-requested":
      return { ...state, operation: "starting", error: "" };
    case "interview-started":
      return {
        ...state,
        stage: "interview",
        profile: action.profile,
        question: action.question,
        questionIndex: 0,
        totalQuestions: action.totalQuestions || TOTAL_QUESTIONS,
        turns: [],
        answer: "",
        turnEvaluation: null,
        feedback: null,
        activeSessionId: "active",
        activeCreatedAt: "",
        operation: "idle",
        error: "",
      };
    case "answer-changed":
      return {
        ...state,
        answer: action.value,
        turnEvaluation: null,
      };
    case "transcript-appended":
      return {
        ...state,
        answer: state.answer ? `${state.answer} ${action.text}` : action.text,
      };
    case "turn-evaluation-requested":
      return { ...state, operation: "evaluating", error: "" };
    case "turn-evaluated":
      return {
        ...state,
        turnEvaluation: action.evaluation,
        operation: "idle",
        error: "",
      };
    case "turn-evaluation-cleared":
      return { ...state, turnEvaluation: null };
    case "advance-requested":
      return { ...state, operation: "advancing", error: "" };
    case "next-question-loaded":
      return {
        ...state,
        turns: action.turns,
        question: action.question,
        questionIndex: action.turns.length,
        answer: "",
        turnEvaluation: null,
        operation: "idle",
        error: "",
      };
    case "interview-finished":
      return {
        ...state,
        stage: "results",
        turns: action.turns,
        feedback: action.feedback,
        activeSessionId: action.sessionId,
        activeCreatedAt: action.createdAt,
        operation: "idle",
        error: "",
      };
    case "session-opened":
      return {
        ...state,
        stage: "results",
        profile: action.session.profile,
        turns: action.session.turns,
        englishLevel: action.session.englishLevel || "B1",
        feedback: action.session.feedback || null,
        activeSessionId: action.session.id,
        activeCreatedAt: action.session.createdAt,
        operation: "idle",
        error: "",
      };
    case "reset":
      return {
        ...initialInterviewState,
        jobDescription: state.jobDescription,
        englishLevel: state.englishLevel,
        cvText: state.cvText,
        fileName: state.fileName,
      };
  }
}
