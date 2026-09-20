import type {
  EnglishLevel,
  Feedback,
  InterviewCoaching,
  NextPractice,
  ProgressDimension,
  ProgressSummary,
  Session,
  Turn,
  TurnEvaluation,
} from "./InterviewApp.types";

export const HISTORY_KEY = "vera-interview-history-v2";
export const LEGACY_HISTORY_KEY = "vera-interview-history-v1";

const ENGLISH_LEVELS: EnglishLevel[] = ["A1", "A2", "B1", "B2"];

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function isEnglishLevel(value: unknown): value is EnglishLevel {
  return (
    typeof value === "string" && ENGLISH_LEVELS.includes(value as EnglishLevel)
  );
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function appearsExactlyOnce(answer: string, quote: string) {
  const first = answer.indexOf(quote);
  return first !== -1 && first === answer.lastIndexOf(quote);
}

function dedupeSessions(sessions: Session[]) {
  const seen = new Set<string>();
  return sessions.filter((session) => {
    if (seen.has(session.id)) return false;
    seen.add(session.id);
    return true;
  });
}

export function normalizeScore(value: unknown, fallback = 5) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(10, value > 10 ? value / 10 : value));
}

function migrateEvaluation(
  value: unknown,
  level: EnglishLevel,
  answer: string,
): TurnEvaluation | undefined {
  if (!isRecord(value)) return undefined;
  const score = normalizeScore(value.levelScore ?? value.score);
  const coaching = migrateCoaching(value.coaching, answer);
  return {
    levelScore: score,
    jobReadinessScore: normalizeScore(value.jobReadinessScore, score),
    englishScore: normalizeScore(value.englishScore, score),
    technicalScore: normalizeScore(value.technicalScore, score),
    relevanceScore: normalizeScore(value.relevanceScore, score),
    structureScore: normalizeScore(value.structureScore, score),
    observedEnglishLevel: isEnglishLevel(value.observedEnglishLevel)
      ? value.observedEnglishLevel
      : level,
    feedback: stringValue(value.feedback, "Evaluación anterior."),
    strengths:
      arrayValue(value.strengths).filter(
        (item): item is string => typeof item === "string",
      ).length > 0
        ? arrayValue(value.strengths).filter(
            (item): item is string => typeof item === "string",
          )
        : ["Respuesta completada"],
    priorityImprovement: stringValue(
      value.priorityImprovement ?? value.improvement,
      "Continúa practicando claridad y precisión.",
    ),
    correctedAnswer: stringValue(
      value.correctedAnswer,
      "No corrected answer available.",
    ),
    nextLevelAnswer: stringValue(
      value.nextLevelAnswer ?? value.correctedAnswer,
      "No next-level answer available.",
    ),
    ...(coaching ? { coaching } : {}),
  };
}

function migrateCoaching(
  value: unknown,
  answer: string,
): InterviewCoaching | undefined {
  if (!isRecord(value) || !isRecord(value.interview)) return undefined;
  const interview = value.interview;
  const skill = interview.skill;
  const technique = stringValue(interview.technique);
  const action = stringValue(interview.action);
  const miniChallenge = stringValue(interview.miniChallenge);
  if (
    (skill !== "technical" && skill !== "relevance" && skill !== "structure") ||
    !technique ||
    !action ||
    !miniChallenge
  )
    return undefined;

  const evidence =
    typeof interview.evidence === "string" &&
    interview.evidence.length > 0 &&
    appearsExactlyOnce(answer, interview.evidence)
      ? interview.evidence
      : undefined;
  const languageValue = isRecord(value.language) ? value.language : null;
  const language =
    languageValue &&
    typeof languageValue.original === "string" &&
    languageValue.original.length > 0 &&
    typeof languageValue.replacement === "string" &&
    languageValue.replacement.length > 0 &&
    typeof languageValue.why === "string" &&
    languageValue.why.length > 0 &&
    appearsExactlyOnce(answer, languageValue.original)
      ? {
          original: languageValue.original,
          replacement: languageValue.replacement,
          why: languageValue.why,
        }
      : undefined;
  return {
    ...(language ? { language } : {}),
    interview: {
      skill,
      ...(evidence ? { evidence } : {}),
      technique,
      action,
      miniChallenge,
    },
  };
}

function migrateTurn(value: unknown, level: EnglishLevel): Turn | undefined {
  if (!isRecord(value)) return undefined;
  const question = stringValue(value.question);
  const answer = stringValue(value.answer);
  if (!question || !answer) return undefined;
  const evaluation = migrateEvaluation(value.evaluation, level, answer);
  return {
    question,
    answer,
    ...(typeof value.transcript === "string"
      ? { transcript: value.transcript }
      : {}),
    ...(evaluation ? { evaluation } : {}),
  };
}

function migrateFeedback(
  value: unknown,
  level: EnglishLevel,
  turnCount: number,
): Feedback | undefined {
  if (!isRecord(value)) return undefined;
  const levelScore = normalizeScore(value.levelScore ?? value.overallScore);
  const dimensionAverages = isRecord(value.dimensionAverages)
    ? {
        english: normalizeScore(value.dimensionAverages.english),
        technical: normalizeScore(value.dimensionAverages.technical),
        relevance: normalizeScore(value.dimensionAverages.relevance),
        structure: normalizeScore(value.dimensionAverages.structure),
      }
    : {
        english: normalizeScore(value.clarity),
        technical: normalizeScore(value.technicalFit),
        relevance: levelScore,
        structure: normalizeScore(value.structure),
      };
  const mapFeedbackItems = (items: unknown) =>
    arrayValue(items).flatMap((item) => {
      if (!isRecord(item)) return [];
      const label = stringValue(item.label);
      if (!label) return [];
      return [
        {
          label,
          description: stringValue(item.description),
        },
      ];
    });
  const turnReviews = arrayValue(value.turnReviews).flatMap((review) => {
    if (!isRecord(review) || typeof review.turnIndex !== "number") return [];
    const reviewScore = normalizeScore(review.levelScore ?? review.score);
    return [
      {
        turnIndex: review.turnIndex,
        levelScore: reviewScore,
        jobReadinessScore: normalizeScore(
          review.jobReadinessScore,
          reviewScore,
        ),
        feedback: stringValue(review.feedback, "Evaluación anterior."),
        correctedAnswer: stringValue(
          review.correctedAnswer,
          "No corrected answer available.",
        ),
      },
    ];
  });
  const nextPractice = migrateNextPractice(value.nextPractice, turnCount);

  return {
    overallScore: normalizeScore(value.overallScore, levelScore),
    levelScore,
    jobReadinessScore: normalizeScore(value.jobReadinessScore, levelScore),
    englishLevel: isEnglishLevel(value.englishLevel)
      ? value.englishLevel
      : level,
    dimensionAverages,
    summary: stringValue(value.summary),
    strengths: mapFeedbackItems(value.strengths),
    gaps: mapFeedbackItems(value.gaps),
    recommendations: mapFeedbackItems(value.recommendations),
    ...(nextPractice ? { nextPractice } : {}),
    turnReviews,
  };
}

function migrateNextPractice(
  value: unknown,
  turnCount: number,
): NextPractice | undefined {
  if (!isRecord(value)) return undefined;
  const skill = value.skill;
  if (
    skill !== "english" &&
    skill !== "technical" &&
    skill !== "relevance" &&
    skill !== "structure"
  )
    return undefined;
  const observation = stringValue(value.observation);
  const action = stringValue(value.action);
  const miniChallenge = stringValue(value.miniChallenge);
  const maxIndex = Math.min(2, turnCount - 1);
  const turnIndices = Array.from(
    new Set(
      arrayValue(value.turnIndices).filter(
        (index): index is number =>
          typeof index === "number" &&
          Number.isInteger(index) &&
          index >= 0 &&
          index <= maxIndex,
      ),
    ),
  );
  if (!observation || !action || !miniChallenge || !turnIndices.length)
    return undefined;
  return {
    skill,
    observation,
    turnIndices,
    action,
    miniChallenge,
  };
}

export function migrateSession(value: unknown): Session {
  if (!isRecord(value)) throw new Error("Invalid stored session");
  const profileValue = isRecord(value.profile) ? value.profile : null;
  const role = stringValue(profileValue?.role);
  if (!role) throw new Error("Stored session has no profile role");
  const level = isEnglishLevel(value.englishLevel) ? value.englishLevel : "B1";
  const profile = {
    role,
    summary: stringValue(profileValue?.summary),
    focusAreas: arrayValue(profileValue?.focusAreas).filter(
      (item): item is string => typeof item === "string" && item.length > 0,
    ),
  };
  const turns = arrayValue(value.turns).flatMap((turn) => {
    const migrated = migrateTurn(turn, level);
    return migrated ? [migrated] : [];
  });
  const session: Session = {
    id: stringValue(value.id),
    createdAt: stringValue(value.createdAt),
    profile,
    turns,
    englishLevel: level,
  };
  if (!session.id || !session.createdAt) throw new Error("Invalid session id");
  const feedback = migrateFeedback(value.feedback, level, turns.length);
  return feedback ? { ...session, feedback } : session;
}

function getStorage(storage?: Storage) {
  if (storage) return storage;
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export function parseHistory(raw: string | null): Session[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return dedupeSessions(
      parsed.flatMap((item) => {
        try {
          return [migrateSession(item)];
        } catch {
          return [];
        }
      }),
    );
  } catch {
    return [];
  }
}

export function loadHistory(storage?: Storage): Session[] {
  const target = getStorage(storage);
  if (!target) return [];
  const current = target.getItem(HISTORY_KEY);
  const legacy = target.getItem(LEGACY_HISTORY_KEY);
  const sessions = parseHistory(current || legacy);
  if (!current && legacy && sessions.length) {
    try {
      target.setItem(HISTORY_KEY, JSON.stringify(sessions));
    } catch {
      /* storage is optional */
    }
  }
  return sessions;
}

export function saveSession(session: Session, storage?: Storage) {
  const target = getStorage(storage);
  if (!target) return;
  const next = [
    session,
    ...loadHistory(target).filter((item) => item.id !== session.id),
  ].slice(0, 20);
  try {
    target.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    /* feedback remains visible when storage is full */
  }
}

export function clearHistory(storage?: Storage) {
  const target = getStorage(storage);
  if (!target) return;
  target.removeItem(HISTORY_KEY);
  target.removeItem(LEGACY_HISTORY_KEY);
}

export function deleteSession(id: string, storage?: Storage) {
  const target = getStorage(storage);
  const next = loadHistory(target ?? undefined).filter(
    (session) => session.id !== id,
  );
  if (!target) return next;
  try {
    target.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    /* optional local archive */
  }
  return next;
}

function average(values: number[]) {
  return values.length
    ? values.reduce((total, value) => total + value, 0) / values.length
    : 0;
}

export function summarizeProgress(sessions: Session[]): ProgressSummary {
  const completed = sessions.filter(
    (session): session is Session & { feedback: Feedback } =>
      Boolean(session.feedback),
  );
  const dimensions: Record<ProgressDimension, number> = {
    english: average(
      completed.map((session) => session.feedback.dimensionAverages.english),
    ),
    technical: average(
      completed.map((session) => session.feedback.dimensionAverages.technical),
    ),
    relevance: average(
      completed.map((session) => session.feedback.dimensionAverages.relevance),
    ),
    structure: average(
      completed.map((session) => session.feedback.dimensionAverages.structure),
    ),
  };
  return {
    completed,
    averageLevel: average(
      completed.map((session) => session.feedback.levelScore),
    ),
    averageJobReadiness: average(
      completed.map((session) => session.feedback.jobReadinessScore),
    ),
    dimensions,
  };
}
